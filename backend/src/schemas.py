# schemas.py

from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# ================================
# User Schemas
# ================================
class UserBase(BaseModel):
    email: EmailStr
    username: str
    name: Optional[str] = None

from pydantic import BaseModel

class UserCreate(BaseModel):
    id: str
    email: str | None = None
    username: str | None = None
    name: str | None = None
    password: str | None = None



class UserResponse(BaseModel):
    id: str
    email: str | None
    username: str | None
    name: str | None

    class Config:
        from_attributes = True



# ================================
# Resume Schemas
# ================================
class ResumeBase(BaseModel):
    file_url: str
    file_type: Optional[str]
    text_content: Optional[str]
    skills: Optional[Dict] = None
    analysis_data: Optional[Dict] = None

class ResumeCreate(ResumeBase):
    user_id: str

class ResumeResponse(ResumeBase):
    id: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

# ================================
# Session Schemas
# ================================
class SessionBase(BaseModel):
    resume_id: Optional[str]
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    questions_count: Optional[int] = 0

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    session_id: str

    class Config:
        from_attributes = True

# ================================
# Audio Metric Schemas
# ================================
class AudioMetricBase(BaseModel):
    session_id: str
    timestamp: datetime
    fluency_score: Optional[float]
    is_stuttering: Optional[bool]
    word_count: Optional[int]
    filler_word_count: Optional[int]
    speech_rate: Optional[float]
    transcript: Optional[str]

class AudioMetricCreate(AudioMetricBase):
    pass

class AudioMetricResponse(AudioMetricBase):
    id: int

    class Config:
        from_attributes = True

# ================================
# Posture Metric Schemas
# ================================
class PostureMetricBase(BaseModel):
    session_id: str
    timestamp: datetime
    hand_detected: Optional[bool]
    hand_detection_duration: Optional[float]
    not_facing_camera: Optional[bool]
    not_facing_duration: Optional[float]
    bad_posture_detected: Optional[bool]
    bad_posture_duration: Optional[float]

class PostureMetricCreate(PostureMetricBase):
    pass

class PostureMetricResponse(PostureMetricBase):
    id: int

    class Config:
        from_attributes = True

# ================================
# Eye Metric Schemas
# ================================
class EyeMetricBase(BaseModel):
    user_id: str
    session_id: str
    timestamp: datetime
    hand_detection_count: Optional[int] = 0
    hand_detection_duration: Optional[float] = 0.0
    loss_eye_contact_count: Optional[int] = 0
    looking_away_duration: Optional[float] = 0.0
    bad_posture_count: Optional[int] = 0
    bad_posture_duration: Optional[float] = 0.0
    is_auto_save: Optional[bool] = False

class EyeMetricCreate(EyeMetricBase):
    pass

class EyeMetricResponse(EyeMetricBase):
    id: str

    class Config:
        from_attributes = True

# ================================
# Interview Analysis Schemas
# ================================
class InterviewAnalysisBase(BaseModel):
    session_id: str
    strengths: Optional[str]
    areas_for_improvement: Optional[str]
    communication_rating: Optional[str]
    technical_rating: Optional[str]
    recommendations: Optional[str]

class InterviewAnalysisResponse(InterviewAnalysisBase):
    id: int

    class Config:
        from_attributes = True

# ================================
# Interview Session & Review Schemas
# ================================
class InterviewSessionBase(BaseModel):
    user_id: str
    session_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = 0
    questions_asked: Optional[int] = 0
    questions_answered: Optional[int] = 0
    resume_used: Optional[str] = None
    status: str = "active"  # active, completed, abandoned
    performance_score: Optional[float] = 0.0

class InterviewSessionCreate(InterviewSessionBase):
    pass

class InterviewSessionResponse(InterviewSessionBase):
    id: str
    
    class Config:
        from_attributes = True

class InterviewMessageBase(BaseModel):
    session_id: str
    speaker: str  # "ai" or "user"
    message: str
    timestamp: datetime
    message_order: int

class InterviewMessageCreate(InterviewMessageBase):
    pass

class InterviewMessageResponse(InterviewMessageBase):
    id: str
    
    class Config:
        from_attributes = True

class InterviewResultBase(BaseModel):
    session_id: str
    overall_score: float
    eye_contact_score: float
    posture_score: float
    confidence_score: float
    clarity_score: float
    technical_knowledge_score: float
    communication_score: float
    ai_feedback: str
    strengths: List[str]
    areas_for_improvement: List[str]
    recommendations: List[str]

class InterviewResultCreate(InterviewResultBase):
    pass

class InterviewResultResponse(InterviewResultBase):
    id: str
    
    class Config:
        from_attributes = True

class InterviewHistoryResponse(BaseModel):
    success: bool
    interviews: List[InterviewSessionResponse]
    total_count: int
    error: Optional[str] = None

class InterviewReviewResponse(BaseModel):
    success: bool
    session: InterviewSessionResponse
    messages: List[InterviewMessageResponse]
    result: Optional[InterviewResultResponse] = None
    performance_metrics: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ================================
# Performance (Generic Example)
# ================================
class PerformanceResponse(BaseModel):
    id: str
    user_id: str

    class Config:
        from_attributes = True

# ================================
# Session Summary (Career Roadmap)
# ================================
class SessionSummaryResponse(BaseModel):
    id: str
    user_id: str
    summary_text: str

    class Config:
        from_attributes = True


# Pydantic models for request/response
class StartInterviewRequest(BaseModel):
    message: Optional[str] = None

class InterviewResponse(BaseModel):
    type: str
    content: str
    button_text: Optional[str] = None

# ================================
# Image Processing Schemas
# ================================
class ImageProcessRequest(BaseModel):
    image: str  # Base64 encoded image
    savePrediction: Optional[bool] = False

class ImageProcessResponse(BaseModel):
    success: bool
    annotated_image_base64: Optional[str] = None
    prediction: Optional[str] = None
    probability: Optional[float] = None
    error: Optional[str] = None

class EmotionStatsResponse(BaseModel):
    success: bool
    emotion_counts: Optional[Dict[str, int]] = None
    emotion_percentages: Optional[Dict[str, float]] = None
    total_detections: Optional[int] = None
    error: Optional[str] = None

# ================================
# Video Analysis Schemas
# ================================
class VideoAnalysisResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None

class VideoMetricsResponse(BaseModel):
    success: bool
    metrics: Optional[Dict[str, Any]] = None
    error: Optional[str] = None