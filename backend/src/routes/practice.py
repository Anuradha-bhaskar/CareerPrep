# routes/practice.py

from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.db import get_db
from .. import crud, schemas
from ..utils import authenticate_and_get_user_details

router = APIRouter()

@router.post("/start", response_model=schemas.SessionResponse)
def start_practice_session(
    request: Request,
    session: schemas.SessionCreate,
    db: Session = Depends(get_db)
):
    """
    Start a new practice session.
    """
    authenticate_and_get_user_details(request)  # Verify user

    return crud.start_session(db, session)


@router.post("/metrics/audio", response_model=schemas.AudioMetricResponse)
def save_audio_metric(
    request: Request,
    metric: schemas.AudioMetricCreate,
    db: Session = Depends(get_db)
):
    """
    Save audio metric for a session.
    """
    authenticate_and_get_user_details(request)

    return crud.save_audio_metric(db, metric)


@router.post("/metrics/posture", response_model=schemas.PostureMetricResponse)
def save_posture_metric(
    request: Request,
    metric: schemas.PostureMetricCreate,
    db: Session = Depends(get_db)
):
    """
    Save posture metric for a session.
    """
    authenticate_and_get_user_details(request)

    return crud.save_posture_metric(db, metric)


@router.post("/metrics/eye", response_model=schemas.EyeMetricResponse)
def save_eye_metric(
    request: Request,
    metric: schemas.EyeMetricCreate,
    db: Session = Depends(get_db)
):
    """
    Save eye metric for a session.
    """
    authenticate_and_get_user_details(request)

    return crud.save_eye_metric(db, metric)


@router.get("/analysis/{session_id}", response_model=schemas.InterviewAnalysisResponse)
def get_interview_analysis(
    request: Request,
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Get AI-generated interview analysis for a session.
    """
    authenticate_and_get_user_details(request)

    return crud.get_interview_analysis(db, session_id)
