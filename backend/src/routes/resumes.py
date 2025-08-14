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




@router.get("/{resume_id}/tips")
async def get_resume_tips(
    request: Request,
    resume_id: str,
    db: Session = Depends(get_db)
):
    """
    Get AI-powered resume improvement tips for a specific resume.
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
    
    try:
        # Import the functions module to get resume tips
        try:
            from src.services import functions
        except ImportError:
            print("Functions module not available, using fallback tips")
            return {
                "success": True,
                "resume_id": resume_id,
                "tips": _get_fallback_resume_tips()
            }
        
        # Get the resume file path
        resume_path = Path(resume.file_url)
        if not resume_path.exists():
            raise HTTPException(status_code=404, detail="Resume file not found")
        
        # Initialize the functions module for resume analysis
        try:
            # Extract text from resume
            resume_text = ""
            if resume_path.suffix.lower() == '.pdf':
                resume_text = functions.extract_text_from_pdf(str(resume_path))
            elif resume_path.suffix.lower() in ['.png', '.jpg', '.jpeg']:
                resume_text = functions.extract_text_from_image(str(resume_path))
            
            # Initialize with basic data
            analysis = {}
            dummy_career_paths = []
            skill_keywords = [
                "python", "java", "javascript", "html", "css", "react", "node.js",
                "sql", "mysql", "postgresql", "mongodb", "aws", "azure", "docker",
                "machine learning", "data science", "project management", "leadership"
            ]
            
            # Initialize the functions module
            functions.initialize(
                str(resume_path), 
                resume_text, 
                analysis, 
                dummy_career_paths, 
                skill_keywords, 
                user_id
            )
            
            # Analyze the resume
            functions.analyze_resume()
            
        except Exception as e:
            print(f"Error initializing functions module: {e}")
        
        # Get resume tips
        try:
            (structure_tips, content_improvement_tips, tech_and_soft_skill_tips, 
             experience_tips, achievement_tips, ats_tips, modern_tips, tailoring_tips) = functions.provide_resume_tips()
            
            return {
                "success": True,
                "resume_id": resume_id,
                "tips": {
                    "structure_tips": structure_tips,
                    "content_improvement_tips": content_improvement_tips,
                    "tech_and_soft_skill_tips": tech_and_soft_skill_tips,
                    "experience_tips": experience_tips,
                    "achievement_tips": achievement_tips,
                    "ats_tips": ats_tips,
                    "modern_tips": modern_tips,
                    "tailoring_tips": tailoring_tips
                }
            }
            
        except Exception as e:
            print(f"Error getting resume tips: {e}")
            # Return fallback tips
            return {
                "success": True,
                "resume_id": resume_id,
                "tips": _get_fallback_resume_tips()
            }
        
    except Exception as e:
        print(f"Error generating resume tips: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating tips: {str(e)}")


def _get_fallback_resume_tips():
    """Return fallback resume tips when AI analysis is not available."""
    return {
        "structure_tips": [
            "Use a clean, professional layout with consistent formatting",
            "Include clear section headers (Summary, Experience, Education, Skills)",
            "Keep your resume to 1-2 pages maximum",
            "Use bullet points for easy readability"
        ],
        "content_improvement_tips": [
            "Start with a compelling professional summary",
            "Use action verbs to describe your accomplishments",
            "Quantify your achievements with specific numbers and metrics",
            "Tailor your content to match the job description"
        ],
        "tech_and_soft_skill_tips": [
            "List relevant technical skills prominently",
            "Include both hard and soft skills",
            "Use industry-standard terminology",
            "Highlight skills that match the job requirements"
        ],
        "experience_tips": [
            "List experience in reverse chronological order",
            "Focus on achievements rather than just responsibilities",
            "Use the STAR method (Situation, Task, Action, Result)",
            "Include relevant internships and volunteer work"
        ],
        "achievement_tips": [
            "Quantify your accomplishments with specific metrics",
            "Highlight awards, recognitions, and certifications",
            "Show progression and growth in your career",
            "Include relevant projects and their outcomes"
        ],
        "ats_tips": [
            "Use standard section headings that ATS can recognize",
            "Include relevant keywords from the job posting",
            "Avoid complex formatting, tables, and graphics",
            "Save your resume in both PDF and Word formats"
        ],
        "modern_tips": [
            "Include a link to your LinkedIn profile",
            "Consider adding a portfolio or personal website",
            "Use a modern, clean font (Arial, Calibri, or similar)",
            "Ensure your contact information is up to date"
        ],
        "tailoring_tips": [
            "Customize your resume for each job application",
            "Research the company and include relevant keywords",
            "Emphasize skills and experience most relevant to the role",
            "Write a targeted professional summary for each application"
        ]
    }
