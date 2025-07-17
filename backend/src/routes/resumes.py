# routes/resumes.py

from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.db import get_db

from .. import crud, schemas
from ..utils import authenticate_and_get_user_details

router = APIRouter()

@router.post("/upload", response_model=schemas.ResumeResponse)
def upload_resume(
    request: Request,
    resume: schemas.ResumeCreate,
    db: Session = Depends(get_db)
):
    """
    Upload a resume and store initial data.
    """
    user_info = authenticate_and_get_user_details(request)
    user_id = user_info['user_id']

    # Force user_id from token
    resume.user_id = user_id

    return crud.create_resume(db, resume)


@router.post("/{resume_id}/analysis", response_model=schemas.ResumeResponse)
def save_resume_analysis(
    request: Request,
    resume_id: str,
    analysis: dict,
    db: Session = Depends(get_db)
):
    """
    Save AI-generated analysis for a resume.
    """
    authenticate_and_get_user_details(request)  # Just to verify

    return crud.update_resume_analysis(db, resume_id, analysis)


@router.get("/", response_model=list[schemas.ResumeResponse])
def list_resumes(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get all resumes for the authenticated user.
    """
    user_info = authenticate_and_get_user_details(request)
    user_id = user_info['user_id']

    return crud.get_resumes_by_user(db, user_id)


@router.get("/career-roadmap", response_model=schemas.SessionSummaryResponse)
def get_career_roadmap(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Return the user's personalized career roadmap (AI generated).
    """
    user_info = authenticate_and_get_user_details(request)
    user_id = user_info['user_id']

    # For now, get the latest summary — adjust as needed
    summaries = crud.get_user_performance(db, user_id)
    if not summaries:
        raise HTTPException(status_code=404, detail="No roadmap found")

    return summaries[-1]  # Example: just return last one
