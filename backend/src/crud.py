# crud.py


from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from datetime import datetime

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
    try:
        print(f"Creating resume with data: {resume.dict()}")
        db_resume = models.Resume(**resume.dict())
        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)
        return db_resume
    except Exception as e:
        print(f"Error in create_resume: {e}")
        db.rollback()
        raise e

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

def update_resume_text_content(db: Session, resume_id: str, text_content: str, analysis_data: dict = None):
    """Update resume text content and optionally analysis data"""
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume.text_content = text_content
    if analysis_data is not None:
        resume.analysis_data = analysis_data
        # Extract skills if available
        if 'skills' in analysis_data:
            resume.skills = analysis_data['skills']
    db.commit()
    db.refresh(resume)
    return resume

def get_resume_by_id(db: Session, resume_id: str):
    return db.query(models.Resume).filter(models.Resume.id == resume_id).first()

def update_resume_file(db: Session, resume_id: str, file_url: str, file_type: str = None):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume.file_url = file_url
    if file_type:
        resume.file_type = file_type
    db.commit()
    db.refresh(resume)
    return resume

# ============================
# INTERVIEW SESSIONS & RESULTS
# ============================

def create_interview_session(db: Session, session_data: schemas.InterviewSessionCreate):
    """Create a new interview session"""
    db_session = models.InterviewSession(**session_data.dict())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_interview_session_by_id(db: Session, session_id: str):
    """Get interview session by session_id"""
    return db.query(models.InterviewSession).filter(models.InterviewSession.session_id == session_id).first()

def get_interview_sessions_by_user(db: Session, user_id: str, limit: int = 50):
    """Get all interview sessions for a user, ordered by most recent"""
    return db.query(models.InterviewSession).filter(
        models.InterviewSession.user_id == user_id
    ).order_by(models.InterviewSession.created_at.desc()).limit(limit).all()

def update_interview_session(db: Session, session_id: str, update_data: dict):
    """Update interview session data"""
    session = get_interview_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    for key, value in update_data.items():
        if hasattr(session, key):
            setattr(session, key, value)
    
    db.commit()
    db.refresh(session)
    return session

def end_interview_session(db: Session, session_id: str, end_time: datetime, duration_minutes: int):
    """Mark interview session as completed"""
    return update_interview_session(db, session_id, {
        "end_time": end_time,
        "duration_minutes": duration_minutes,
        "status": "completed"
    })

def create_interview_message(db: Session, message_data: schemas.InterviewMessageCreate):
    """Create a new interview message"""
    db_message = models.InterviewMessage(**message_data.dict())
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_interview_messages_by_session(db: Session, session_id: str):
    """Get all messages for an interview session, ordered by message_order"""
    return db.query(models.InterviewMessage).filter(
        models.InterviewMessage.session_id == session_id
    ).order_by(models.InterviewMessage.message_order).all()

def create_interview_result(db: Session, result_data: schemas.InterviewResultCreate):
    """Create interview result with performance scores and feedback"""
    db_result = models.InterviewResult(**result_data.dict())
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    return db_result

def get_interview_result_by_session(db: Session, session_id: str):
    """Get interview result for a specific session"""
    return db.query(models.InterviewResult).filter(
        models.InterviewResult.session_id == session_id
    ).first()

def calculate_performance_score(eye_metrics: models.EyeMetric) -> float:
    """Calculate overall performance score based on eye metrics"""
    if not eye_metrics:
        return 0.0
    
    # Base score starts at 100
    score = 100.0
    
    # Deduct points for various issues
    if eye_metrics.loss_eye_contact_count > 0:
        score -= min(eye_metrics.loss_eye_contact_count * 2, 20)  # Max 20 points off
    
    if eye_metrics.looking_away_duration > 0:
        score -= min(eye_metrics.looking_away_duration * 0.5, 15)  # Max 15 points off
    
    if eye_metrics.bad_posture_count > 0:
        score -= min(eye_metrics.bad_posture_count * 3, 25)  # Max 25 points off
    
    if eye_metrics.hand_detection_duration > 0:
        score -= min(eye_metrics.hand_detection_duration * 0.3, 10)  # Max 10 points off
    
    return max(score, 0.0)  # Ensure score doesn't go below 0

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

