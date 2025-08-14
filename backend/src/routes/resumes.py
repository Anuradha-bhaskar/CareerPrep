# routes/resumes.py

from fastapi import APIRouter, Request, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from ..database.db import get_db
from .. import crud, schemas
from ..utils import authenticate_and_get_user_details
import google.generativeai as genai
import os
from pathlib import Path
import uuid
import shutil

router = APIRouter()

# Configuration for file uploads
UPLOAD_FOLDER = "static/uploads"
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

def secure_filename(filename: str) -> str:
    """Simple secure filename function"""
    # Remove directory path and keep only the filename
    filename = os.path.basename(filename)
    # Replace spaces and special characters
    filename = "".join(c for c in filename if c.isalnum() or c in ('-', '_', '.'))
    return filename

@router.post("/upload_resume")
async def upload_resume_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a resume file and store it in the database.
    """
    # Authenticate user
    user_info = authenticate_and_get_user_details(request)
    user_id = user_info['user_id']
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")
    
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size too large. Maximum 10MB allowed.")
    
    # Reset file pointer
    await file.seek(0)
    
    # Create upload directory if it doesn't exist
    upload_dir = Path(UPLOAD_FOLDER)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate secure filename with user ID prefix
    filename = secure_filename(file.filename)
    unique_filename = f"user_{user_id}_{uuid.uuid4().hex[:8]}_{filename}"
    file_path = upload_dir / unique_filename
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create relative path for database storage
        relative_path = f"{UPLOAD_FOLDER}/{unique_filename}"
        
        # Check if user already has a resume
        existing_resumes = crud.get_resumes_by_user(db, user_id)
        
        # Determine file type
        file_type = Path(filename).suffix.lower()
        
        if existing_resumes:
            # Update existing resume
            existing_resume = existing_resumes[0]  # Get the first one
            # Delete old file if it exists
            old_file_path = Path(existing_resume.file_url)
            if old_file_path.exists():
                try:
                    old_file_path.unlink()
                except OSError:
                    pass  # File might not exist or be in use
            
            # Update the existing resume record
            existing_resume.file_url = relative_path
            existing_resume.file_type = file_type
            existing_resume.text_content = None  # Reset for new file
            existing_resume.analysis_data = None  # Reset for new file
            db.commit()
            db.refresh(existing_resume)
            
            return {
                "message": "Resume updated successfully",
                "resume_id": existing_resume.id,
                "file_url": relative_path,
                "filename": unique_filename
            }
        else:
            # Create new resume record
            resume_data = schemas.ResumeCreate(
                user_id=user_id,
                file_url=relative_path,
                file_type=file_type,
                text_content=None,
                skills=None,
                analysis_data=None
            )
            
            new_resume = crud.create_resume(db, resume_data)
            
            return {
                "message": "Resume uploaded successfully",
                "resume_id": new_resume.id,
                "file_url": relative_path,
                "filename": unique_filename
            }
            
    except Exception as e:
        # Clean up file if database operation fails
        if file_path.exists():
            try:
                file_path.unlink()
            except OSError:
                pass
        raise HTTPException(status_code=500, detail=f"Error saving resume: {str(e)}")

@router.get("/{resume_id}/download")
async def download_resume(
    request: Request,
    resume_id: str,
    db: Session = Depends(get_db)
):
    """
    Download a resume file by resume ID.
    """
    # Authenticate user
    user_info = authenticate_and_get_user_details(request)
    user_id = user_info['user_id']
    
    # Get resume from database
    resume = crud.get_resume_by_id(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Check if the resume belongs to the authenticated user
    if resume.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if file exists
    file_path = Path(resume.file_url)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Resume file not found")
    
    # Get original filename from the stored filename
    original_filename = "_".join(file_path.name.split("_")[3:])  # Remove user_id and uuid prefix
    
    return FileResponse(
        path=str(file_path),
        filename=original_filename,
        media_type='application/octet-stream'
    )




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
