# schemas.py

from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
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
        orm_mode = True



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
        orm_mode = True

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
        orm_mode = True

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
        orm_mode = True

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
        orm_mode = True

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
        orm_mode = True

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
        orm_mode = True

# ================================
# Performance (Generic Example)
# ================================
class PerformanceResponse(BaseModel):
    id: str
    user_id: str

    class Config:
        orm_mode = True

# ================================
# Session Summary (Career Roadmap)
# ================================
class SessionSummaryResponse(BaseModel):
    id: str
    user_id: str
    summary_text: str

    class Config:
        orm_mode = True
