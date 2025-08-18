# routes/resumes.py

from fastapi import APIRouter, Request, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from ..database.db import get_db
from .. import crud, schemas
from ..utils import authenticate_and_get_user_details
from ..services.resume.resume_processor import ResumeProcessor
import google.generativeai as genai
import os
from pathlib import Path
import uuid
import shutil

router = APIRouter()

# Configuration for file uploads
UPLOAD_FOLDER = "static/upload"
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

def extract_and_analyze_resume(file_path: str) -> tuple[str, dict]:
    """Extract text and analyze resume using ResumeProcessor"""
    try:
        # Configure Google AI
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        
        # Initialize resume processor
        resume_processor = ResumeProcessor(genai)
        
        # Process the resume file
        analysis_data = resume_processor.process_resume(file_path)
        
        # Get the extracted text
        extracted_text = resume_processor.extracted_text
        
        return extracted_text, analysis_data
        
    except Exception as e:
        print(f"Error processing resume: {e}")
        # If processing fails, try to extract text manually based on file type
        file_ext = Path(file_path).suffix.lower()
        extracted_text = ""
        
        if file_ext == '.pdf':
            try:
                import PyPDF2
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        extracted_text += page.extract_text() or ""
            except Exception as pdf_error:
                print(f"PDF extraction failed: {pdf_error}")
                
        elif file_ext in ['.txt']:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    extracted_text = f.read()
            except Exception as txt_error:
                print(f"Text extraction failed: {txt_error}")
        
        return extracted_text, {}

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
        
        # Extract text and analyze resume
        try:
            extracted_text, analysis_data = extract_and_analyze_resume(str(file_path))
            print(f"Successfully extracted {len(extracted_text)} characters from resume")
            print(f"Analysis data type: {type(analysis_data)}")
            print(f"Analysis data: {analysis_data}")
        except Exception as e:
            print(f"Warning: Could not extract text from resume: {e}")
            extracted_text = ""
            analysis_data = {}
        
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
            
            # Update the existing resume record with extracted text and analysis
            existing_resume.file_url = relative_path
            existing_resume.file_type = file_type
            existing_resume.text_content = extracted_text
            
            # Ensure analysis_data is a dictionary before assigning
            if isinstance(analysis_data, dict):
                existing_resume.analysis_data = analysis_data
                # Extract skills if available and ensure it's JSON-serializable
                if 'skills' in analysis_data:
                    skills = analysis_data['skills']
                    if isinstance(skills, (list, dict, str, int, float, bool)):
                        existing_resume.skills = skills
                    else:
                        print(f"Warning: skills is not a JSON-serializable type: {type(skills)}")
                        existing_resume.skills = None
            else:
                print(f"Warning: analysis_data is not a dict for update, it's {type(analysis_data)}")
                existing_resume.analysis_data = {}
                existing_resume.skills = None
            
            db.commit()
            db.refresh(existing_resume)
            
            return {
                "message": "Resume updated successfully",
                "resume_id": existing_resume.id,
                "file_url": relative_path,
                "filename": unique_filename,
                "text_extracted": len(extracted_text) > 0,
                "analysis_completed": len(analysis_data) > 0
            }
        else:
            # Create new resume record with extracted text and analysis
            # Ensure analysis_data is a dictionary and extract skills safely
            if isinstance(analysis_data, dict):
                skills = analysis_data.get('skills', None)
                # Ensure skills is a valid format for JSON storage
                if skills is not None and not isinstance(skills, (list, dict, str, int, float, bool)):
                    print(f"Warning: skills is not a JSON-serializable type: {type(skills)}")
                    skills = None
            else:
                print(f"Warning: analysis_data is not a dict, it's {type(analysis_data)}")
                skills = None
                analysis_data = {} if analysis_data is None else {}
            
            # Ensure all data is properly formatted for database storage
            try:
                resume_data = schemas.ResumeCreate(
                    user_id=user_id,
                    file_url=relative_path,
                    file_type=file_type,
                    text_content=extracted_text,
                    skills=skills,
                    analysis_data=analysis_data
                )
                print(f"Successfully created ResumeCreate schema object")
            except Exception as schema_error:
                print(f"Error creating ResumeCreate schema: {schema_error}")
                # Fallback to minimal data
                resume_data = schemas.ResumeCreate(
                    user_id=user_id,
                    file_url=relative_path,
                    file_type=file_type,
                    text_content=extracted_text,
                    skills=None,
                    analysis_data={}
                )
            
            new_resume = crud.create_resume(db, resume_data)
            
            return {
                "message": "Resume uploaded successfully",
                "resume_id": new_resume.id,
                "file_url": relative_path,
                "filename": unique_filename,
                "text_extracted": len(extracted_text) > 0,
                "analysis_completed": len(analysis_data) > 0
            }
            
    except Exception as e:
        # Clean up file if database operation fails
        if file_path.exists():
            try:
                file_path.unlink()
            except OSError:
                pass
        raise HTTPException(status_code=500, detail=f"Error saving resume: {str(e)}")


@router.get("/")
async def get_user_resumes(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get all resumes for the authenticated user.
    """
    # Authenticate user
    user_info = authenticate_and_get_user_details(request)
    user_id = user_info['user_id']
    
    # Get all resumes for the user
    resumes = crud.get_resumes_by_user(db, user_id)
    
    return {
        "resumes": [
            {
                "resume_id": resume.id,
                "file_url": resume.file_url,
                "file_type": resume.file_type,
                "uploaded_at": resume.uploaded_at,
                "has_text_content": resume.text_content is not None and len(resume.text_content) > 0,
                "has_analysis": resume.analysis_data is not None and len(resume.analysis_data) > 0,
                "text_length": len(resume.text_content) if resume.text_content else 0
            }
            for resume in resumes
        ]
    }


@router.get("/{resume_id}")
async def get_resume(
    request: Request,
    resume_id: str,
    db: Session = Depends(get_db)
):
    """
    Get resume details including extracted text and analysis data.
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
    
    return {
        "resume_id": resume.id,
        "file_url": resume.file_url,
        "file_type": resume.file_type,
        "text_content": resume.text_content,
        "skills": resume.skills,
        "analysis_data": resume.analysis_data,
        "uploaded_at": resume.uploaded_at
    }


@router.get("/{resume_id}/text")
async def get_resume_text(
    request: Request,
    resume_id: str,
    db: Session = Depends(get_db)
):
    """
    Get the extracted text content of a resume.
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
    
    return {
        "resume_id": resume.id,
        "text_content": resume.text_content,
        "text_length": len(resume.text_content) if resume.text_content else 0,
        "has_text": resume.text_content is not None and len(resume.text_content) > 0
    }


@router.post("/{resume_id}/reprocess")
async def reprocess_resume(
    request: Request,
    resume_id: str,
    db: Session = Depends(get_db)
):
    """
    Reprocess an existing resume to extract text and analysis.
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
    
    try:
        # Extract text and analyze resume
        extracted_text, analysis_data = extract_and_analyze_resume(str(file_path))
        
        # Update the resume with extracted text and analysis
        updated_resume = crud.update_resume_text_content(
            db, resume_id, extracted_text, analysis_data
        )
        
        return {
            "message": "Resume reprocessed successfully",
            "resume_id": resume_id,
            "text_extracted": len(extracted_text) > 0,
            "analysis_completed": len(analysis_data) > 0,
            "text_length": len(extracted_text),
            "analysis_fields": list(analysis_data.keys()) if analysis_data else []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reprocessing resume: {str(e)}")


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
        
        # Use stored text content if available, otherwise extract from file
        resume_text = resume.text_content
        
        if not resume_text:
            # If no stored text, try to extract from file
            resume_path = Path(resume.file_url)
            if not resume_path.exists():
                raise HTTPException(status_code=404, detail="Resume file not found")
            
            try:
                resume_text, analysis_data = extract_and_analyze_resume(str(resume_path))
                
                # Update the resume with extracted text and analysis
                if resume_text:
                    crud.update_resume_text_content(db, resume_id, resume_text, analysis_data)
                    
            except Exception as e:
                print(f"Error extracting text from resume file: {e}")
                # Fall back to basic extraction methods
                if resume_path.suffix.lower() == '.pdf':
                    try:
                        import PyPDF2
                        with open(resume_path, 'rb') as f:
                            reader = PyPDF2.PdfReader(f)
                            for page in reader.pages:
                                resume_text += page.extract_text() or ""
                    except Exception:
                        pass
                elif resume_path.suffix.lower() in ['.txt']:
                    try:
                        with open(resume_path, 'r', encoding='utf-8') as f:
                            resume_text = f.read()
                    except Exception:
                        pass
        
        if not resume_text:
            print("No resume text available for analysis")
            return {
                "success": True,
                "resume_id": resume_id,
                "tips": _get_fallback_resume_tips()
            }
        
        # Initialize the functions module for resume analysis
        try:
            # Use stored analysis data if available, otherwise create empty
            analysis = resume.analysis_data or {}
            dummy_career_paths = []
            skill_keywords = [
                "python", "java", "javascript", "html", "css", "react", "node.js",
                "sql", "mysql", "postgresql", "mongodb", "aws", "azure", "docker",
                "machine learning", "data science", "project management", "leadership"
            ]
            
            # Initialize the functions module
            functions.initialize(
                resume.file_url, 
                resume_text, 
                analysis, 
                dummy_career_paths, 
                skill_keywords, 
                user_id
            )
            
            # Analyze the resume if not already done
            if not analysis:
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
