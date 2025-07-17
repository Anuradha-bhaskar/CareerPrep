# models.py
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    name = Column(String)
    password = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    performances = relationship("Performance", back_populates="user")
    resumes = relationship("Resume", back_populates="user")
    emotions = relationship("UserEmotionData", back_populates="user")
    summaries = relationship("SessionSummary", back_populates="user")
    eye_metrics = relationship("EyeMetric", back_populates="user")

class Performance(Base):
    __tablename__ = "performance"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="performances")

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    file_url = Column(Text, nullable=False)
    file_type = Column(String)
    text_content = Column(Text)
    skills = Column(JSON)
    analysis_data = Column(JSON)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="resumes")
    sessions = relationship("Session", back_populates="resume")

class UserEmotionData(Base):
    __tablename__ = "user_emotion_data"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    emotion = Column(String(20), nullable=False)
    confidence = Column(Float, nullable=False)

    user = relationship("User", back_populates="emotions")

class SessionSummary(Base):
    __tablename__ = "session_summary"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    summary_text = Column(Text, nullable=False)

    user = relationship("User", back_populates="summaries")

class EyeMetric(Base):
    __tablename__ = "eye_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    session_id = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    hand_detection_count = Column(Integer, default=0)
    hand_detection_duration = Column(Float, default=0.0)
    loss_eye_contact_count = Column(Integer, default=0)
    looking_away_duration = Column(Float, default=0.0)
    bad_posture_count = Column(Integer, default=0)
    bad_posture_duration = Column(Float, default=0.0)
    is_auto_save = Column(Boolean, default=False)

    user = relationship("User", back_populates="eye_metrics")

class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(Text, primary_key=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    resume_id = Column(String, ForeignKey("resumes.id"))
    questions_count = Column(Integer, default=0)

    resume = relationship("Resume", back_populates="sessions")
    audio_metrics = relationship("AudioMetric", back_populates="session")
    posture_metrics = relationship("PostureMetric", back_populates="session")
    interview_analysis = relationship("InterviewAnalysis", back_populates="session")

class AudioMetric(Base):
    __tablename__ = "audio_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Text, ForeignKey("sessions.session_id"))
    timestamp = Column(DateTime)
    fluency_score = Column(Float)
    is_stuttering = Column(Boolean)
    word_count = Column(Integer)
    filler_word_count = Column(Integer)
    speech_rate = Column(Float)
    transcript = Column(Text)

    session = relationship("Session", back_populates="audio_metrics")

class PostureMetric(Base):
    __tablename__ = "posture_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Text, ForeignKey("sessions.session_id"))
    timestamp = Column(DateTime)
    hand_detected = Column(Boolean)
    hand_detection_duration = Column(Float)
    not_facing_camera = Column(Boolean)
    not_facing_duration = Column(Float)
    bad_posture_detected = Column(Boolean)
    bad_posture_duration = Column(Float)

    session = relationship("Session", back_populates="posture_metrics")

class InterviewAnalysis(Base):
    __tablename__ = "interview_analysis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Text, ForeignKey("sessions.session_id"))
    strengths = Column(Text)
    areas_for_improvement = Column(Text)
    communication_rating = Column(Text)
    technical_rating = Column(Text)
    recommendations = Column(Text)

    session = relationship("Session", back_populates="interview_analysis")
