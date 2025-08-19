import os
import time
from typing import Optional

# Try to load ElevenLabs SDK; optional
try:
    from elevenlabs import ElevenLabs  # elevenlabs>=2.x
except Exception:
    ElevenLabs = None  # type: ignore


class BaseTTS:
    def __init__(self, output_dir: str = os.path.join("cache", "interviews", "audio")) -> None:
        self.output_dir = output_dir

    def set_output_dir(self, output_dir: str) -> None:
        self.output_dir = output_dir

    def text_to_speech(self, text: str, filename_prefix: str = "tts") -> Optional[str]:
        raise NotImplementedError


class NoOpTTS(BaseTTS):
    def text_to_speech(self, text: str, filename_prefix: str = "tts") -> Optional[str]:
        return None


class ElevenLabsTTS(BaseTTS):
    def __init__(
        self,
        api_key: Optional[str] = None,
        voice_id: Optional[str] = None,
        model_id: str = "eleven_multilingual_v2",
        output_format: str = "mp3_44100_128",
        output_dir: str = os.path.join("cache", "interviews", "audio"),
    ) -> None:
        super().__init__(output_dir=output_dir)
        if ElevenLabs is None:
            raise RuntimeError("elevenlabs SDK not installed")
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        self.voice_id = voice_id or os.getenv("ELEVENLABS_VOICE_ID")
        self.model_id = model_id
        self.output_format = output_format
        if not self.api_key:
            raise RuntimeError("ELEVENLABS_API_KEY missing")
        if not self.voice_id:
            raise RuntimeError("ELEVENLABS_VOICE_ID missing")
        self.client = ElevenLabs(api_key=self.api_key)

    def text_to_speech(self, text: str, filename_prefix: str = "tts") -> Optional[str]:
        if not text:
            return None
        try:
            os.makedirs(self.output_dir, exist_ok=True)
            ts = int(time.time())
            filename = f"{filename_prefix}_{ts}.mp3"
            filepath = os.path.join(self.output_dir, filename)

            audio_stream = self.client.text_to_speech.convert(
                voice_id=self.voice_id,
                model_id=self.model_id,
                text=text,
                output_format=self.output_format,
            )

            with open(filepath, "wb") as f:
                for chunk in audio_stream:
                    if isinstance(chunk, (bytes, bytearray)):
                        f.write(chunk)
                    else:
                        data = getattr(chunk, "data", None)
                        if data:
                            f.write(data)

            return filepath
        except Exception as e:
            print(f"[TTS] ElevenLabs error: {e}")
            return None


def create_tts_from_env(default_output_dir: str = os.path.join("cache", "interviews", "audio")) -> BaseTTS:
    api_key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = os.getenv("ELEVENLABS_VOICE_ID")
    if ElevenLabs and api_key and voice_id:
        try:
            return ElevenLabsTTS(api_key=api_key, voice_id=voice_id, output_dir=default_output_dir)
        except Exception as e:
            print(f"[TTS] Falling back to NoOp due to init error: {e}")
    else:
        missing = []
        if not ElevenLabs:
            missing.append("SDK")
        if not api_key:
            missing.append("ELEVENLABS_API_KEY")
        if not voice_id:
            missing.append("ELEVENLABS_VOICE_ID")
        if missing:
            print(f"[TTS] Using NoOpTTS. Missing: {', '.join(missing)}")
    return NoOpTTS(output_dir=default_output_dir)