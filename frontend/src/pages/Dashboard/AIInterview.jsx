
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Play, Square, RotateCcw, CheckCircle } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

export default function AIInterviewContent() {
  const { getToken, isSignedIn } = useAuth();
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  // STT support detection
  const [sttSupported, setSttSupported] = useState(null);
  const [emotionStats, setEmotionStats] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  // Session identifier for the active interview
  const [sessionId, setSessionId] = useState(null);
  const messagesContainerRef = useRef(null);
  const [showVideo, setShowVideo] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const metricsIntervalRef = useRef(null);
  const [isEnding, setIsEnding] = useState(false);
  const [copied, setCopied] = useState(false);
  // New: analysis/history/review states
  const [interviewAnalysis, setInterviewAnalysis] = useState(null);
  const [interviewHistory, setInterviewHistory] = useState(null);
  const [interviewReview, setInterviewReview] = useState(null);
  const [userPerformance, setUserPerformance] = useState(null);
  // Voice playback (browser TTS)
  const [voiceOn, setVoiceOn] = useState(false);
  // Active SpeechRecognition instance
  const recognitionRef = useRef(null);
  
  // Resume check states
  const [hasResume, setHasResume] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [isCheckingResume, setIsCheckingResume] = useState(true);
  // Upload flow removed from this page; users should upload via Resume Analyser

  // Helper: derive a displayable filename from available resume fields (strip paths/IDs)
  const getResumeDisplayName = (r) => {
    if (!r) return "";
    let value = r.filename || r.original_filename || r.file_url || "Resume";

    // Decode if URL-encoded
    try { value = decodeURIComponent(value); } catch {}

    // If URL, take pathname; if contains path separators, take last segment
    try {
      if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
        const u = new URL(value);
        value = u.pathname || value;
      }
    } catch {}
    if (/[\\/]/.test(value)) {
      value = value.split(/[\\/]/).pop();
    }

    // Capture trailing filename with common doc extensions
    const tailMatch = value.match(/([^\\/]*\.(pdf|docx?|rtf|txt))$/i);
    if (tailMatch) value = tailMatch[1];

    // Strip technical tokens and ID-like prefixes before the human name
    const extMatch = value.match(/\.(pdf|docx?|rtf|txt)$/i);
    const ext = extMatch ? extMatch[0] : '';
    const base = ext ? value.slice(0, -ext.length) : value;
    const tokens = base.split(/[\s_-]+/).filter(Boolean);
    const ignore = new Set(['static','upload','uploads','user','users','dev','prod','file','doc','resume','id']);
    const isIdLike = (t) => (
      /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(t) ||
      /^[A-Fa-f0-9_-]{8,}$/.test(t) ||
      /^id[0-9]+$/i.test(t)
    );
    let startIdx = 0;
    while (startIdx < tokens.length && (ignore.has(tokens[startIdx].toLowerCase()) || isIdLike(tokens[startIdx]))) startIdx++;
    const humanTokens = tokens.slice(startIdx);
    const human = humanTokens.length ? humanTokens.join(' ') : (tokens.join(' ') || value);
    return `${human}${ext}`.replace(/\s+/g, ' ').trim() || 'Resume';
  };

  // Clamp helper
  const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

  // Compute deterministic component scores from EyeMetric (server-stored raw metrics)
  const computeScoresFromEyeMetrics = (em) => {
    if (!em) return null;
    const losses = Number(em.loss_eye_contact_count || 0);
    const awaySec = Number(em.looking_away_duration || 0); // seconds
    const badPostureCount = Number(em.bad_posture_count || 0);
    const badPostureSec = Number(em.bad_posture_duration || 0);
    const handSec = Number(em.hand_detection_duration || 0);

    // Eye contact: penalize losses and looking away duration
    // 8 points per loss, 1 point per 2 seconds looking away
    const eyePenalty = losses * 8 + (awaySec / 2);
    const eye_contact_score = clamp(100 - eyePenalty);

    // Posture: penalize bad posture count and duration, slight penalty for excessive hand movement
    // 10 per posture event, 2 per second of bad posture, 0.5 per second of hand movement
    const posturePenalty = badPostureCount * 10 + badPostureSec * 2 + handSec * 0.5;
    const posture_score = clamp(100 - posturePenalty);

    // Confidence: correlates with steady gaze and controlled movement
    // 3 per loss, 1.5 per sec looking away, 0.5 per sec hand movement
    const confidencePenalty = losses * 3 + awaySec * 1.5 + handSec * 0.5;
    const confidence_score = clamp(100 - confidencePenalty);

    // Clarity: not directly measurable from EyeMetric; provide stable baseline influenced by posture
    const clarityBaseline = 82;
    const clarityPenalty = Math.max(0, (badPostureSec - 5) * 0.8);
    const clarity_score = clamp(clarityBaseline - clarityPenalty);

    // Communication: average of eye contact and confidence
    const communication_score = clamp((eye_contact_score + confidence_score) / 2);

    // Technical knowledge: cannot be inferred from EyeMetric; provide neutral baseline
    const technical_knowledge_score = 78;

    // Overall as weighted average emphasizing eye contact and posture
    const overall_score = Math.round(clamp(
      eye_contact_score * 0.25 +
      posture_score * 0.2 +
      confidence_score * 0.2 +
      clarity_score * 0.15 +
      communication_score * 0.1 +
      technical_knowledge_score * 0.1
    ));

    return {
      overall_score,
      eye_contact_score,
      posture_score,
      confidence_score,
      clarity_score,
      technical_knowledge_score,
      communication_score,
    };
  };

  // Fetch user performance list (from /api/performance/)
  const fetchUserPerformance = async () => {
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:8000/api/performance/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Expect a list; store as-is for rendering
        if (Array.isArray(data)) setUserPerformance(data);
      }
    } catch {}
  };

  // Capture a frame from webcam and send to /process_image (single image emotion detection)
  const captureFrameAndAnalyze = async () => {
    try {
      if (!videoRef.current) return;
      const videoEl = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const token = await getToken();
      await fetch('http://localhost:8000/api/practice/process_image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ image: dataUrl, savePrediction: true })
      });
    } catch (e) {
      // Non-fatal; best-effort analysis
    }
  };

  const saveLastStats = (stats) => {
    try {
      if (!stats) return;
      const payload = { stats, savedAt: Date.now() };
      localStorage.setItem(LAST_STATS_KEY, JSON.stringify(payload));
    } catch {}
  };
  const loadLastStats = () => {
    try {
      const raw = localStorage.getItem(LAST_STATS_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.stats) return data.stats;
    } catch {}
    return null;
  };

  // Helper: get the last AI message (used to show final result after end)
  const getLastAiMessage = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === 'ai') return messages[i];
    }
    return null;
  };

  // Persist last interview result locally so it survives reload/navigation
  const LAST_RESULT_KEY = 'aiInterview:lastResult';
  const LAST_STATS_KEY = 'aiInterview:lastEmotionStats';
  const saveLastResult = (content) => {
    try {
      if (!content) return;
      const payload = { content, savedAt: Date.now() };
      localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(payload));
    } catch {}
  };
  const loadLastResult = () => {
    try {
      const raw = localStorage.getItem(LAST_RESULT_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && typeof data.content === 'string') return data;
    } catch {}
    return null;
  };

  // Helper: normalize AI HTML so it renders nicely without altering content semantics
  const normalizeAiHtml = (raw) => {
    if (!raw || typeof raw !== 'string') return '';
    // If text has no HTML breaks but has newlines, convert newlines to <br/>
    const hasTag = /<[^>]+>/.test(raw);
    if (!hasTag && raw.includes('\n')) {
      return raw.split('\n').map(line => line.trimEnd()).join('<br/>');
    }
    return raw.trim();
  };

  // Render the AI result with tasteful styling while preserving content
  const renderDecoratedResult = () => {
    const raw = getLastAiMessage()?.content || '';
    const html = normalizeAiHtml(raw);
    // Split on the explicit feedback delimiter if present
    const parts = html.split(/\s*---\s*Feedback\s*---\s*/i);
    if (parts.length === 2) {
      const [introHtml, feedbackHtml] = parts;
      return (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Closing Statement</h3>
            <div className="text-[15px] leading-relaxed text-gray-900" dangerouslySetInnerHTML={{ __html: introHtml }} />
          </div>
          <div className="bg-white border border-purple-200 rounded-lg p-4">
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="inline-block w-1.5 h-4 bg-purple-600 rounded-sm" />
              <h3 className="text-sm font-semibold text-purple-700">Feedback & Recommendations</h3>
            </div>
            <div className="text-[15px] leading-relaxed text-gray-900" dangerouslySetInnerHTML={{ __html: feedbackHtml }} />
          </div>
        </div>
      );
    }
    // Fallback: no delimiter, render as a single well-styled block
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-[15px] leading-relaxed text-gray-900" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  };

  // Helper: extract plain text from HTML for simple checks/badges
  const htmlToText = (html) => {
    if (!html) return '';
    const el = document.createElement('div');
    el.innerHTML = html;
    return (el.textContent || el.innerText || '').trim();
  };

  // Browser TTS helpers
  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);

  const speakText = useCallback((text, onEnd) => {
    try {
      if (!text) return;
      const synth = window.speechSynthesis;
      if (!synth || typeof window.SpeechSynthesisUtterance === 'undefined') return;
      // Cancel any ongoing speech
      try { synth.cancel(); } catch {}
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      if (typeof onEnd === 'function') {
        utter.onend = () => {
          try { onEnd(); } catch {}
        };
        utter.onerror = () => {
          try { onEnd(); } catch {}
        };
      }
      synth.speak(utter);
    } catch {}
  }, []);

  // Copy the result (as plain text) to clipboard
  const copyResultToClipboard = () => {
    const last = getLastAiMessage();
    if (!last?.content) return;
    // Convert HTML to text by stripping tags in a temporary element
    const container = document.createElement('div');
    container.innerHTML = normalizeAiHtml(last.content);
    const text = container.textContent || container.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  // Refs for media streams and recording
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const messagesEndRef = useRef(null);
  // Removed: file input ref (no inline upload here)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // On mount, if no active interview and no messages loaded, hydrate from last saved result
  useEffect(() => {
    if (!isInterviewActive && messages.length === 0) {
      const last = loadLastResult();
      if (last?.content) {
        setMessages([{ type: 'ai', content: last.content }]);
      }
      if (!emotionStats) {
        const savedStats = loadLastStats();
        if (savedStats) setEmotionStats(savedStats);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect STT support once on mount
  useEffect(() => {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      setSttSupported(Boolean(SR));
    } catch {
      setSttSupported(false);
    }
  }, []);

  // When interview ends and we have a final AI message, save it for persistence
  useEffect(() => {
    if (!isInterviewActive) {
      const lastAi = getLastAiMessage();
      if (lastAi?.content) saveLastResult(lastAi.content);
      if (emotionStats) saveLastStats(emotionStats);
    }
  }, [isInterviewActive, messages, emotionStats]);

  // Ensure AI voice and mic are OFF when session is not active
  useEffect(() => {
    if (!isInterviewActive) {
      try { stopRecognition(); } catch {}
      try { stopSpeaking(); } catch {}
      if (voiceOn) setVoiceOn(false);
    }
  }, [isInterviewActive]);

  // Check for existing resume when component mounts
  useEffect(() => {
    if (isSignedIn) {
      checkUserResume();
    }
  }, [isSignedIn]);

  // When interview becomes active, ensure webcam starts and attaches once video element mounts
  useEffect(() => {
    const setup = async () => {
      if (isInterviewActive) {
        try {
          await startVideo();
          // Start backend video analysis and begin polling metrics
          await startVideoAnalysis();
          beginMetricsPolling();
        } catch (e) {
          // handled inside startVideo
        }
      } else {
        // stop camera when interview not active
        stopVideo();
        await endVideoAnalysis();
        stopMetricsPolling();
        setLiveMetrics(null);
      }
    };
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInterviewActive]);

  // Keep chat scrolled to bottom inside its own container
  useEffect(() => {
    if (isInterviewActive && messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isInterviewActive, isLoading, isEnding]);

  // Auto speak latest AI message when voice is on
  useEffect(() => {
    if (!voiceOn) return;
    const lastAi = getLastAiMessage();
    if (!lastAi?.content) return;
    const plain = htmlToText(normalizeAiHtml(lastAi.content));
    if (plain) {
      speakText(plain, () => {
        // After AI finishes speaking, auto-start dictation
        if (!isInterviewActive || isEnding) return;
        recognizeOnce().then(text => {
          if (text) setCurrentMessage(prev => (prev ? (prev.trimEnd() + ' ' + text) : text));
        });
      });
    }
  }, [messages, voiceOn, speakText, isInterviewActive, isEnding]);

  // Stop current speech recognition if running
  const stopRecognition = useCallback(() => {
    try { recognitionRef.current?.stop?.(); } catch {}
    try { recognitionRef.current?.abort?.(); } catch {}
    recognitionRef.current = null;
    setIsRecognizing(false);
  }, []);

  // Single-shot speech recognition using Web Speech API
  const recognizeOnce = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn('Web Speech API not supported in this browser');
      try { setSttSupported(false); } catch {}
      return Promise.resolve(null);
    }
    // Stop any ongoing speech synthesis to avoid audio ducking/conflicts
    try { stopSpeaking(); } catch {}
    setIsRecognizing(true);
    // Ensure any previous recognition is stopped
    try { recognitionRef.current?.stop?.(); recognitionRef.current?.abort?.(); } catch {}
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let finished = false;

    return new Promise((resolve) => {
      const cleanup = () => {
        try { recognition.onresult = null; recognition.onerror = null; recognition.onend = null; } catch {}
        recognitionRef.current = null;
        setIsRecognizing(false);
      };

      recognition.onresult = (event) => {
        if (finished) return;
        finished = true;
        const text = Array.from(event.results)
          .map(r => r[0]?.transcript || '')
          .join(' ')
          .trim();
        cleanup();
        resolve(text || null);
      };

      recognition.onerror = () => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(null);
      };

      recognition.onend = () => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(null);
      };

      // Safety timeout
      const to = setTimeout(() => {
        try { recognition.stop(); } catch {}
      }, 12000);

      try {
        recognition.start();
      } catch {
        clearTimeout(to);
        cleanup();
        resolve(null);
      }
    });
  }, [recognitionRef, stopSpeaking]);

  // Attach stream to video element after it exists
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      try {
        videoRef.current.srcObject = streamRef.current;
        // Some browsers require explicit play()
        const playPromise = videoRef.current.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(() => {});
        }
      } catch {}
    }
  }, [isInterviewActive, showVideo]);

  // Check if user has uploaded a resume
  const checkUserResume = async () => {
    setIsCheckingResume(true);
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:8000/api/resumes/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        const resumes = Array.isArray(data?.resumes) ? data.resumes : [];
        // Valid resume: has identifier AND either extracted text or analysis
        const validResumes = resumes.filter(r => r && (r.resume_id || r.id));
        const latest = validResumes[0] || null;
        const usable = latest && (latest.has_text_content || latest.has_analysis);
        setHasResume(Boolean(usable));
        setResumeData(latest || null);
      } else {
        setHasResume(false);
        setResumeData(null);
      }
    } catch (error) {
      console.error("Error checking resume:", error);
      setHasResume(false);
      setResumeData(null);
    } finally {
      setIsCheckingResume(false);
    }
  };

  // Start video stream
  const startVideo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: "user"
        }, 
        audio: true 
      });
      
      // Keep stream reference even if video element isn't mounted yet
      streamRef.current = stream;
      setIsVideoActive(true);
      setShowVideo(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          const playPromise = videoRef.current.play();
          if (playPromise && typeof playPromise.then === 'function') {
            await playPromise;
          }
        } catch {}
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please check permissions.");
    }
  }, []);

  // Start backend video analysis
  const startVideoAnalysis = useCallback(async () => {
    try {
      const token = await getToken();
      await fetch('http://localhost:8000/api/practice/start_video_analysis', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Error starting video analysis:', e);
    }
  }, [getToken]);

  // End backend video analysis
  const endVideoAnalysis = useCallback(async () => {
    try {
      const token = await getToken();
      await fetch('http://localhost:8000/api/practice/end_video_analysis', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Error ending video analysis:', e);
    }
  }, [getToken]);

  // Poll live metrics during interview
  const pollVideoMetricsOnce = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:8000/api/practice/video_metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.metrics) setLiveMetrics(data.metrics);
      }
    } catch (e) {
      // Suppress transient errors
    }
  }, [getToken]);

  const beginMetricsPolling = useCallback(() => {
    if (metricsIntervalRef.current) return;
    metricsIntervalRef.current = setInterval(pollVideoMetricsOnce, 2000);
  }, [pollVideoMetricsOnce]);

  const stopMetricsPolling = useCallback(() => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMetricsPolling();
    };
  }, [stopMetricsPolling]);

  // Allow normal page scrolling during interview session (scroll lock removed)

  // Stop video stream
  const stopVideo = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      try { mediaRecorderRef.current.stop(); } catch {}
      setIsRecording(false);
    }
    // Stop any ongoing speech
    stopSpeaking();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoActive(false);
    setShowVideo(false);
  }, [isRecording, stopSpeaking]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!streamRef.current) {
      alert("Please start video first");
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        await processVideoRecording(blob);
        // Also run client-side speech recognition and forward transcript to AI (no backend changes)
        try {
          if (isInterviewActive) {
            const text = await recognizeOnce();
            if (text) {
              const token = await getToken();
              // Echo user message
              setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'user',
                content: text,
                timestamp: new Date(),
              }]);
              // Send to interviewer
              const aiRes = await fetch('http://localhost:8000/api/practice/start-interview', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ message: text }),
              });
              if (aiRes.ok) {
                const result = await aiRes.json();
                if (result?.type === 'text' || result?.type === 'interview_complete') {
                  setMessages(prev => [...prev, {
                    id: Date.now(),
                    type: 'ai',
                    content: result.content,
                    timestamp: new Date(),
                  }]);
                  if (result?.type === 'interview_complete') {
                    setIsInterviewActive(false);
                    await getPerformanceMetrics();
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('Client STT error:', e);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not start recording");
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Auto-start recording once interview is active and video is active (placed after startRecording definition)
  useEffect(() => {
    if (isInterviewActive && isVideoActive && !isRecording) {
      startRecording();
    }
  }, [isInterviewActive, isVideoActive, isRecording, startRecording]);

  // Process video recording
  const processVideoRecording = async (blob) => {
    try {
      // Convert blob to base64 for processing
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        
        // Process the video for analysis
        const token = await getToken();
        const payload = {
          video_data: base64Data,
        };
        // Only include session_id if it's available
        if (sessionId) {
          payload.session_id = sessionId;
        }
        const response = await fetch('http://localhost:8000/api/practice/process_video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Video processed:", result);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error processing video:", error);
    }
  };

  // Start interview session
  const startInterview = async () => {
    if (!isSignedIn) {
      alert("Please sign in to start an interview");
      return;
    }

    if (!hasResume) {
      // No resume present; keep the info banner visible and do not open upload here
      return;
    }

    // Clear any previous results/stats so old data isn't shown in new session
    try {
      localStorage.removeItem(LAST_RESULT_KEY);
      localStorage.removeItem(LAST_STATS_KEY);
    } catch {}
    // Auto-enable AI voice playback on session start
    setVoiceOn(true);
    setMessages([]);
    setEmotionStats(null);
    setPerformanceMetrics(null);
    setInterviewAnalysis(null);
    setInterviewHistory(null);
    setInterviewReview(null);
    setIsLoading(true);
    try {
      const token = await getToken();
      // Start the interview (this endpoint creates and returns session_id)
      const response = await fetch('http://localhost:8000/api/practice/start-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: "start interview"
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.type === "text") {
          setMessages([{
            id: Date.now(),
            type: "ai",
            content: result.content,
            timestamp: new Date()
          }]);
          setIsInterviewActive(true);
          
          // Extract session_id from the response if available
          if (result.session_id) {
            setSessionId(result.session_id);
          }
          // Webcam will auto-start via effect when interview becomes active
          // Schedule a single-frame analysis to utilize /process_image
          setTimeout(() => {
            try { captureFrameAndAnalyze(); } catch {}
          }, 2000);
        } else {
          alert("Error starting interview: " + result.content);
        }
      } else {
        const errorData = await response.json();
        alert("Error starting interview: " + (errorData.detail || "Unknown error"));
      }
    } catch (error) {
      console.error("Error starting interview:", error);
      alert("Failed to start interview. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to AI interviewer
  const sendMessage = async () => {
    if (!currentMessage.trim() || !isInterviewActive) return;
    // Turn off user's mic (stop STT) when sending a message
    try { stopRecognition(); } catch {}

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsLoading(true);

    try {
      const token = await getToken();
      
      const response = await fetch('http://localhost:8000/api/practice/start-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: currentMessage
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.type === "interview_complete") {
          // Interview ended
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: "ai",
            content: result.content,
            timestamp: new Date()
          }]);
          setIsInterviewActive(false);
          
          // Save interview results
          if (sessionId) {
            await saveInterviewResults();
          }
          setSessionId(null);
          
          // Get performance metrics
          await getPerformanceMetrics();
        } else if (result.type === "text") {
          // Regular response
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: "ai",
            content: result.content,
            timestamp: new Date()
          }]);
        }
      } else {
        const errorData = await response.json();
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: "ai",
          content: "Error: " + (errorData.detail || "Failed to get response"),
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: "ai",
        content: "Error: Failed to send message. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get performance metrics
  const getPerformanceMetrics = async () => {
    try {
      const token = await getToken();
      // Prefer hyphen endpoint; fallback to underscore variant
      let response = await fetch('http://localhost:8000/api/practice/emotion-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        response = await fetch('http://localhost:8000/api/practice/emotion_stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      if (response.ok) {
        const result = await response.json();
        if (result?.success) setEmotionStats(result);
      }
    } catch (error) {
      console.error("Error getting performance metrics:", error);
    }
  };

  // Fetch AI interview analysis for a session
  const getInterviewAnalysis = async (sid) => {
  if (!sid) return null;
  try {
    const token = await getToken();
    const res = await fetch(`http://localhost:8000/api/practice/analysis/${encodeURIComponent(sid)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setInterviewAnalysis(data);
      return data;
    } else {
      const errorData = await res.json();
      console.error("Error fetching interview analysis:", errorData.detail);
    }
  } catch (error) {
    console.error("Error fetching interview analysis:", error);
  }
  return null;
};

  // Fetch interview review bundle for a session
  const getInterviewReview = async (sid) => {
    if (!sid) return null;
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:8000/api/practice/interview-review/${encodeURIComponent(sid)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewReview(data);
        return data;
      }
      // Log non-OK response
      const err = await res.json().catch(() => ({}));
      console.error("Error fetching interview review:", err.detail || res.status);
    }  catch (error) {
      console.error("Error fetching interview review:", error);
    }
    return null;
  };

  // Fetch interview history (latest sessions)
  const getInterviewHistory = async () => {
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:8000/api/practice/interview-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewHistory(data);
        return data;
      }
    } catch {}
    return null;
  };

  // Save interview results when interview ends
  const saveInterviewResults = async (sidOverride = null) => {
    const sidToUse = sidOverride || sessionId;
    if (!sidToUse) return;

    try {
      const token = await getToken();

      // 1) Fetch the review bundle for this session to get stored EyeMetric
      const rvRes = await fetch(`http://localhost:8000/api/practice/interview-review/${encodeURIComponent(sidToUse)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let eyeMetric = null;
      if (rvRes.ok) {
        const rv = await rvRes.json();
        eyeMetric = rv?.performance_metrics || null;
      }

      // 2) Compute deterministic scores from EyeMetric; if unavailable, compute from any client metrics
      let scores = computeScoresFromEyeMetrics(eyeMetric);
      if (!scores) {
        // Fallback: attempt to derive from emotionStats.metrics if present
        const emFallback = emotionStats?.metrics ? {
          loss_eye_contact_count: emotionStats.metrics.loss_eye_contact_count,
          looking_away_duration: emotionStats.metrics.looking_away_duration,
          bad_posture_count: emotionStats.metrics.bad_posture_count,
          bad_posture_duration: emotionStats.metrics.bad_posture_duration,
          hand_detection_duration: emotionStats.metrics.hand_detection_duration,
        } : null;
        scores = computeScoresFromEyeMetrics(emFallback) || {
          overall_score: 80,
          eye_contact_score: 80,
          posture_score: 80,
          confidence_score: 80,
          clarity_score: 80,
          technical_knowledge_score: 78,
          communication_score: 80,
        };
      }

      // 3) Build feedback arrays based on metrics
      const strengths = [];
      const areas_for_improvement = [];

      if (scores.eye_contact_score >= 75) strengths.push("Maintained reasonable eye contact");
      else areas_for_improvement.push("Reduce looking away and improve eye contact consistency");

      if (scores.posture_score >= 75) strengths.push("Good posture and controlled movement");
      else areas_for_improvement.push("Minimize bad posture and excessive hand movements");

      if (scores.confidence_score >= 75) strengths.push("Confident presence");
      else areas_for_improvement.push("Project more confidence in responses");

      const recommendations = [
        "Practice maintaining steady gaze towards the camera",
        "Keep posture upright and reduce fidgeting",
        "Structure answers with the STAR method for clarity",
      ];

      const resultData = {
        session_id: sidToUse,
        overall_score: scores.overall_score,
        eye_contact_score: scores.eye_contact_score,
        posture_score: scores.posture_score,
        confidence_score: scores.confidence_score,
        clarity_score: scores.clarity_score,
        technical_knowledge_score: scores.technical_knowledge_score,
        communication_score: scores.communication_score,
        ai_feedback: "Interview completed. Scores derived from recorded session metrics.",
        strengths,
        areas_for_improvement,
        recommendations,
      };

      // 4) Persist to backend
      const response = await fetch('http://localhost:8000/api/practice/save-interview-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(resultData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log("Interview results saved successfully");
        } else {
          console.error("Failed to save interview results:", result.error);
        }
      } else {
        console.error("Failed to save interview results:", response.status);
      }
    } catch (error) {
      console.error("Error saving interview results:", error);
    }
  };

  // Calculate overall performance score
  const calculateOverallScore = () => {
    let score = 85; // Base score
    
    // Adjust based on available metrics
    if (performanceMetrics) {
      if (performanceMetrics.eye_contact_score) {
        score = (score + performanceMetrics.eye_contact_score) / 2;
      }
      if (performanceMetrics.posture_score) {
        score = (score + performanceMetrics.posture_score) / 2;
      }
      if (performanceMetrics.confidence_score) {
        score = (score + performanceMetrics.confidence_score) / 2;
      }
      if (performanceMetrics.clarity_score) {
        score = (score + performanceMetrics.clarity_score) / 2;
      }
    }
    
    return Math.round(score);
  };

  // End interview
  const endInterview = async () => {
    if (!isInterviewActive || isEnding) return;
    setIsEnding(true);

    // Stop recording chunks to avoid more uploads while ending
    if (mediaRecorderRef.current && isRecording) {
      try { mediaRecorderRef.current.stop(); } catch {}
      setIsRecording(false);
    }

    // Immediately stop metrics and webcam/analysis so gestures aren't detected during finalization
    stopMetricsPolling();
    setLiveMetrics(null);
    try { await endVideoAnalysis(); } catch {}
    // Ensure speech recognition and speech synthesis are stopped, and voice toggle is off
    try { stopRecognition(); } catch {}
    try { stopSpeaking(); } catch {}
    setVoiceOn(false);
    stopVideo();

    try {
      const token = await getToken();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('http://localhost:8000/api/practice/start-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: 'end interview' }),
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      if (response && response.ok) {
        const result = await response.json();
        if (result?.type === 'interview_complete') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'ai',
            content: result.content,
            timestamp: new Date(),
          }]);
        }
        

      
      }
    } catch (error) {
      console.error('Error ending interview:', error);
    } finally {
      // Before clearing, capture sid for post-end fetches
      const sid = sessionId;
      // Now formally end the local session after chatbot responded or timed out
      setIsInterviewActive(false);
      try { await getPerformanceMetrics(); } catch {}
      // Ensure results are saved so analysis can be built/fetched
      try { await saveInterviewResults(sid); } catch {}
      // Fetch analysis/review/history best-effort
      try {
        await Promise.all([
          getInterviewAnalysis(sid),
          getInterviewReview(sid),
          getInterviewHistory(),
          fetchUserPerformance(),
        ]);
      } catch {}
      setSessionId(null);
      setIsEnding(false);
    }
  };

  // Reset interview
  const resetInterview = () => {
    setMessages([]);
    setIsInterviewActive(false);
    setSessionId(null);
    setEmotionStats(null);
    setPerformanceMetrics(null);
    setLiveMetrics(null);
    stopMetricsPolling();
    if (mediaRecorderRef.current && isRecording) {
      try { mediaRecorderRef.current.stop(); } catch {}
      setIsRecording(false);
    }
    stopVideo();
  };

  // Handle Enter key in message input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Removed: ResumeUploadForm (upload flow moved to Resume Analyser page)

  // Loading state
  if (isCheckingResume) {
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isInterviewActive ? 'h-full overflow-y-auto p-4 sm:p-6' : 'h-full overflow-y-auto p-4 sm:p-6'}`}>
      <div className={`max-w-6xl mx-auto ${isInterviewActive ? '' : 'space-y-6'}`}>
        {/* Header */}
        {!isInterviewActive && (
        <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Interview Practice</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Practice with AI-powered mock interviews tailored to your industry.
            Get real-time feedback on your responses, body language, and interview skills.
          </p>
        </div>
        )}

        {/* Resume Check Status */}
        {!isInterviewActive && !hasResume && (
          <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">Resume Required</h3>
                <p className="text-yellow-700 text-sm">
                  You need to upload a resume before starting an AI interview. 
                  This helps the AI generate personalized questions based on your background.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload form intentionally removed from this page. Users should upload via Resume Analyser. */}

        {/* Resume Status Display */}
        {!isInterviewActive && hasResume && resumeData && (resumeData.resume_id || resumeData.id) && (resumeData.has_text_content || resumeData.has_analysis) && (
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Resume Ready</h3>
                <p className="text-green-700 text-sm">
                  Resume uploaded: {getResumeDisplayName(resumeData)} 
                  {resumeData.has_text_content && " • Text extracted successfully"}
                  {resumeData.has_analysis && " • AI analysis completed"}
                </p>
              </div>
              {/* Update Resume action removed to keep this page informational only */}
            </div>
          </div>
        )}

        {/* Single Main Card: Inactive shows centered Start; Active shows two-column layout */}
        <div className={'bg-white rounded-xl shadow-lg border border-gray-200 p-6'}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Interview Session</h2>
            <div className="flex gap-2">
              {!isInterviewActive ? (
                <button
                  onClick={startInterview}
                  disabled={isLoading || !isSignedIn || !hasResume}
                  className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  {isLoading ? 'Starting…' : 'Start Interview'}
                </button>
              ) : (
                <>
                  <button
                    onClick={endInterview}
                    disabled={isEnding}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${isEnding ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-100'} border-red-200 text-red-700 bg-red-50`}
                  >
                    <Square className="w-4 h-4" />
                    {isEnding ? 'Ending…' : 'End'}
                  </button>
                  <button
                    onClick={resetInterview}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>

          {!isInterviewActive ? (
            <div className="py-16">
              <p className="text-center text-gray-600">Click the Start Interview button on the top right to begin your practice session.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Webcam */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Webcam</h3>
                </div>
                {isEnding ? (
                  <div className="w-full min-h-[360px] lg:min-h-[480px] flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-purple-600"></div>
                      <span className="text-sm">Ending session… finalizing results</span>
                    </div>
                  </div>
                ) : (
                  showVideo && (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        onLoadedMetadata={() => {
                          // Attach stream when metadata is ready
                          if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
                            videoRef.current.srcObject = streamRef.current;
                          }
                        }}
                        className="w-full rounded-lg border border-gray-300"
                      />
                      {isRecording && (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
                          REC
                        </div>
                      )}
                      {liveMetrics && (
                        <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs rounded px-3 py-2 space-y-1">
                          <div>Hands: {liveMetrics.handDetectionCount ?? 0} ({(liveMetrics.handDetectionDuration ?? 0).toFixed(1)}s)</div>
                          <div>Eye contact losses: {liveMetrics.lossEyeContactCount ?? 0}</div>
                          <div>Looking away: {(liveMetrics.lookingAwayDuration ?? 0).toFixed(1)}s</div>
                          <div>Bad posture: {liveMetrics.badPostureCount ?? 0} ({(liveMetrics.badPostureDuration ?? 0).toFixed(1)}s)</div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Right: Chat */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">AI Interview Chat</h3>
                  <button
                    onClick={() => {
                      const next = !voiceOn;
                      setVoiceOn(next);
                      if (!next) { try { window.speechSynthesis?.cancel(); } catch {} }
                    }}
                    className={`text-xs px-2 py-1 rounded-md border ${voiceOn ? 'border-green-300 text-green-700 bg-green-50' : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'}`}
                    title="Toggle AI voice playback"
                  >
                    {voiceOn ? '🔊 Voice On' : '🔈 Voice Off'}
                  </button>
                </div>
                {/* STT unsupported warning */}
                {(sttSupported === false) && (
                  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
                    Your browser doesn't support Speech Recognition. You can still type responses or switch to Chrome/Edge.
                  </div>
                )}
                <div
                  ref={messagesContainerRef}
                  className="space-y-4 mb-4 overflow-y-auto h-96 overscroll-contain"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Start typing your responses to the AI interviewer
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.type === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <div className="text-sm">{message.content}</div>
                          <div className={`text-xs mt-1 ${
                            message.type === 'user' ? 'text-purple-200' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {(isLoading || isEnding) && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                          {isEnding ? 'Ending interview… finalizing results' : 'AI is thinking...'}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2 mt-auto">
                  {/* Mic dictate (Web Speech API) */}
                  <button
                    onClick={async () => {
                      const text = await recognizeOnce();
                      if (text) setCurrentMessage(prev => (prev ? (prev.trimEnd() + ' ' + text) : text));
                    }}
                    disabled={isLoading || isEnding || isRecognizing || sttSupported === false}
                    className={`px-3 py-2 rounded-lg border text-gray-700 transition-colors ${
                      isRecognizing
                        ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-400 ring-offset-1 animate-pulse'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                    aria-label={'Dictate (speech-to-text)'}
                    title={'Dictate (speech-to-text)'}
                  >
                    {'🎤'}
                  </button>
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your response..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isLoading || isEnding}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!currentMessage.trim() || isLoading || isEnding}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interview Result (after end) */}
        {!isInterviewActive && messages.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between px-6 pt-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-800">Interview Result</h2>
                <span className="inline-flex items-center gap-1 text-green-700 text-xs bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-4 h-4" /> Generated by AI
                </span>
              </div>
              <button
                onClick={copyResultToClipboard}
                className="text-sm px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                title="Copy to clipboard"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="px-6 pb-6">
              {/* Friendly banner if feedback hit rate limits */}
              {(() => {
                const raw = getLastAiMessage()?.content;
                const text = htmlToText(normalizeAiHtml(raw));
                if (/rate limit/i.test(text) || /try again shortly/i.test(text)) {
                  return (
                    <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
                      We couldn’t generate full feedback due to AI rate limits. Please wait a bit and try ending the interview again to get a complete summary.
                    </div>
                  );
                }
                return null;
              })()}
              {renderDecoratedResult()}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {(!isInterviewActive && interviewReview?.performance_metrics) ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance Analysis (Saved Session)</h2>
            {(() => {
              const em = interviewReview.performance_metrics;
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Attention & Eye Contact</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Eye contact losses</span>
                        <span className="font-semibold">{em.loss_eye_contact_count ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Looking away duration (s)</span>
                        <span className="font-semibold">{(em.looking_away_duration ?? 0).toFixed ? em.looking_away_duration.toFixed(1) : em.looking_away_duration ?? 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">Posture & Movement</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Bad posture count</span>
                        <span className="font-semibold">{em.bad_posture_count ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bad posture duration (s)</span>
                        <span className="font-semibold">{(em.bad_posture_duration ?? 0).toFixed ? em.bad_posture_duration.toFixed(1) : em.bad_posture_duration ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hand movement duration (s)</span>
                        <span className="font-semibold">{(em.hand_detection_duration ?? 0).toFixed ? em.hand_detection_duration.toFixed(1) : em.hand_detection_duration ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          emotionStats && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Emotion Detection</h3>
                  {emotionStats.emotion_counts && (
                    <div className="space-y-2">
                      {Object.entries(emotionStats.emotion_counts).map(([emotion, count]) => (
                        <div key={emotion} className="flex justify-between">
                          <span className="capitalize">{emotion}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Session Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Detections</span>
                      <span className="font-semibold">{emotionStats.total_detections || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Session Status</span>
                      <span className="font-semibold">{isInterviewActive ? 'Active' : 'Completed'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* Detailed Performance Scores intentionally hidden on AI Interview page per request. */}

        {/* Past Performance (history) */}
        {!isInterviewActive && Array.isArray(userPerformance) && userPerformance.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Past Performance</h2>
            <p className="text-sm text-gray-600 mb-4">Your recent performance summaries.</p>
            <div className="space-y-2">
              {userPerformance.slice(0, 5).map((p, idx) => (
                <div key={p.id || idx} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2">
                  <div className="text-sm">
                    <div className="font-medium text-gray-800">Session {p.session_id || '—'}</div>
                    <div className="text-gray-600">Overall: {typeof p.overall_score === 'number' ? Math.round(p.overall_score) : (p.overall_score ?? '—')}</div>
                  </div>
                  {p.created_at && (
                    <div className="text-xs text-gray-500">{String(p.created_at).replace('T', ' ').slice(0, 19)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
// End AIInterviewContent component
