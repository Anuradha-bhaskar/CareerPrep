# crud.py


from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext

from src import  schemas 
from src.database import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============================
# USERS
# ============================

def get_password_hash(password: str):
    return pwd_context.hash(password)

# crud.py

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = None
    if user.password:
        hashed_password = get_password_hash(user.password)

    email = user.email or f"{user.id}@placeholder.local"
    username = user.username or email.split('@')[0] or f"user_{user.id[:8]}"
    name = user.name or "No Name"

    db_user = models.User(
        id=user.id,
        email=email,
        username=username,
        name=name,
        password=hashed_password  # Will be None — Clerk handles auth
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user



def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

# ============================
# RESUMES
# ============================

def create_resume(db: Session, resume: schemas.ResumeCreate):
    db_resume = models.Resume(**resume.dict())
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume

def get_resumes_by_user(db: Session, user_id: str):
    return db.query(models.Resume).filter(models.Resume.user_id == user_id).all()

def update_resume_analysis(db: Session, resume_id: str, analysis_data: dict):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume.analysis_data = analysis_data
    db.commit()
    db.refresh(resume)
    return resume

# ============================
# SESSIONS
# ============================

def start_session(db: Session, session: schemas.SessionCreate):
    db_session = models.Session(**session.dict())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_session_by_id(db: Session, session_id: str):
    session = db.query(models.Session).filter(models.Session.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

# ============================
# AUDIO METRICS
# ============================

def save_audio_metric(db: Session, metric: schemas.AudioMetricCreate):
    db_metric = models.AudioMetric(**metric.dict())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric

# ============================
# POSTURE METRICS
# ============================

def save_posture_metric(db: Session, metric: schemas.PostureMetricCreate):
    db_metric = models.PostureMetric(**metric.dict())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric

# ============================
# EYE METRICS
# ============================

def save_eye_metric(db: Session, metric: schemas.EyeMetricCreate):
    db_metric = models.EyeMetric(**metric.dict())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric

# ============================
# INTERVIEW ANALYSIS (AI OUTPUT)
# ============================

def save_interview_analysis(db: Session, session_id: str, analysis: schemas.InterviewAnalysisBase):
    db_analysis = models.InterviewAnalysis(
        session_id=session_id,
        strengths=analysis.strengths,
        areas_for_improvement=analysis.areas_for_improvement,
        communication_rating=analysis.communication_rating,
        technical_rating=analysis.technical_rating,
        recommendations=analysis.recommendations
    )
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    return db_analysis

def get_interview_analysis(db: Session, session_id: str):
    analysis = db.query(models.InterviewAnalysis).filter(
        models.InterviewAnalysis.session_id == session_id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis

# ============================
# PERFORMANCE (OPTIONAL)
# ============================

def get_user_performance(db: Session, user_id: str):
    return db.query(models.Performance).filter(models.Performance.user_id == user_id).all()

