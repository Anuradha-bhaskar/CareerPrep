# routes/career_recommendations.py

from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from ..database.db import get_db
from .. import crud, schemas
from ..utils import authenticate_and_get_user_details
from ..services.resume.career_recommendations import get_career_recommendations
import os
import re
import json
from pathlib import Path
import google.generativeai as genai

router = APIRouter()

@router.get("/generate/{resume_id}")
async def generate_career_recommendations(
    request: Request,
    resume_id: str,
    db: Session = Depends(get_db)
):
    """
    Generate career recommendations based on an uploaded resume.
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
    resume_path = Path(resume.file_url)
    if not resume_path.exists():
        raise HTTPException(status_code=404, detail="Resume file not found")
    
    try:
        # Extract resume data
        resume_data = {}
        
        # Initialize AI client
        api_key = os.getenv("GOOGLE_API_KEY") 
        if api_key:
            genai.configure(api_key=api_key)
            ai_client = genai
            print("Google AI client configured successfully")
        else:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        
        # Process resume using ResumeProcessor
        try:
            from ..services.resume.resume_processor import ResumeProcessor
            resume_processor = ResumeProcessor(ai_client=ai_client)
            resume_data = resume_processor.process_resume(str(resume_path))
            print(f"Resume processing successful. Extracted data keys: {list(resume_data.keys())}")
            
            # If AI processing failed but we have text, try basic text analysis
            if not resume_data and hasattr(resume_processor, 'extracted_text') and resume_processor.extracted_text:
                print("AI processing failed, performing basic text analysis")
                resume_data = _perform_basic_text_analysis(resume_processor.extracted_text)
                
        except Exception as e:
            print(f"Error processing resume with ResumeProcessor: {e}")
            # Try to extract basic text at least
            try:
                basic_text = _extract_basic_text_from_file(str(resume_path))
                if basic_text:
                    resume_data = _perform_basic_text_analysis(basic_text)
                else:
                    resume_data = {
                        "file_exists": True,
                        "file_path": str(resume_path),
                        "error": f"Failed to process resume: {str(e)}"
                    }
            except Exception as text_error:
                print(f"Even basic text extraction failed: {text_error}")
                resume_data = {
                    "file_exists": True,
                    "file_path": str(resume_path),
                    "error": f"Failed to process resume: {str(e)}"
                }
        
        # Get user profile information
        user = crud.get_user_by_id(db, user_id)
        user_profile = {
            "user_id": user_id,
            "username": getattr(user, 'username', '') if user else "",
        }

        # Generate career recommendations using AI
        career_paths = []
        
        try:
            # Only proceed with AI recommendations if we have meaningful resume data
            if resume_data and len(resume_data) > 2:  # More than just file_exists and file_path
                career_paths = get_career_recommendations(ai_client, resume_data, user_profile)
                print(f"AI career recommendations generated: {len(career_paths)} recommendations")
            else:
                print("Resume data insufficient for AI recommendations, using fallback")
                career_paths = []
        except Exception as e:
            print(f"Error getting AI career recommendations: {e}")
            career_paths = []
        
        # Add fallback generic careers if no careers were generated
        if not career_paths:
            print("Using fallback career recommendations")
            career_paths = _get_fallback_careers()
        
        # Convert to response format
        career_paths_response = []
        for path in career_paths:
            career_paths_response.append({
                "role": path.get('role', 'Unknown Role').strip().strip('*'),
                "match": path.get('match', 0),
                "description": path.get('description', 'No description available'),
                "skills_needed": path.get('skills_needed', 'No skills information available'),
                "growth_potential": path.get('growth_potential', 'Unknown'),
                "salary_range": path.get('salary_range', 'Not specified')
            })
        
        return {
            "success": True,
            "career_recommendations": career_paths_response,
            "resume_id": resume_id
        }
        
    except Exception as e:
        print(f"Error generating career recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")

@router.get("/roadmap/{career_title}")
async def generate_career_roadmap(
    request: Request,
    career_title: str,
    skills_needed: str = "",
    db: Session = Depends(get_db)
):
    """
    Generate a career roadmap for a specific career path using Gemini AI.
    Ensures clean JSON parsing and handles any extra text from AI.
    """
    # Authenticate user
    user_info = authenticate_and_get_user_details(request)

    try:
        # Convert dashes back to slashes for the original career title
        original_career_title = career_title.replace('-', '/')
        
        # Parse skills
        skills_list = [skill.strip() for skill in skills_needed.split(",") if skill.strip()]

        # Configure Google AI client
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        genai.configure(api_key=api_key)

        # Prepare strict JSON prompt
        prompt = f"""
        You are an expert career coach and professional roadmap planner.

        Generate a detailed, actionable career roadmap for the role: "{original_career_title}".
        The user currently has these skills: {', '.join(skills_list) if skills_list else "No listed skills"}.

        Guidelines:
        1. Structure the roadmap into **clear phases** with timeframes (e.g., "0-6 months", "6-12 months", "1-2 years", "3-5 years").
        2. Each phase must have:
           - "timeframe": key time duration
           - "focus": key learning or experience goal.
           - "tasks": a list of practical, actionable steps.
        3. Recommend "additional_resources" (courses, books, certifications, communities).
        4. Keep the advice realistic for someone in India but still applicable worldwide.
        5. Respond with **valid JSON only**. No markdown, no explanation, no extra text.

        JSON format:
        {{
          "title": "Career Roadmap for {original_career_title}",
          "overview": "Brief inspiring description",
          "steps": [
            {{
              "timeframe": "0-6 months",
              "focus": "Learning fundamentals",
              "tasks": ["Task 1", "Task 2"]
            }}
          ],
          "additional_resources": ["Resource 1", "Resource 2"]
        }}
        """

        # Call Gemini
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}  # Helps force JSON
        )

        # Log raw AI output for debugging
        raw_text = response.text.strip()
        print("RAW AI OUTPUT:", repr(raw_text))

        # Extract JSON from response (remove markdown/code fences/etc.)
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if not json_match:
            raise HTTPException(status_code=500, detail="No JSON found in AI response")

        cleaned_json_str = json_match.group()

        try:
            roadmap = json.loads(cleaned_json_str)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Invalid JSON from AI: {str(e)}")

        return {
            "success": True,
            "roadmap": roadmap,
            "career_title": career_title
        }

    except Exception as e:
        print(f"Error generating roadmap: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating roadmap: {str(e)}")


def _extract_basic_text_from_file(file_path):
    """Extract basic text from PDF or text files when full processing fails."""
    try:
        from pypdf2 import PdfReader
        from pathlib import Path
        
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            with open(file_path, 'rb') as f:
                reader = PdfReader(f)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
                return text
        elif file_ext in ['.txt', '.md']:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            print(f"Cannot extract text from {file_ext} files")
            return ""
    except Exception as e:
        print(f"Error extracting basic text: {e}")
        return ""


def _perform_basic_text_analysis(text):
    """Perform basic text analysis to extract simple resume information."""
    import re
    
    result = {
        "extracted_text": text[:1000],  # First 1000 characters for debugging
        "basic_analysis": True
    }
    
    # Basic email extraction
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    if emails:
        result["email"] = emails[0]
    
    # Basic phone extraction
    phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    phones = re.findall(phone_pattern, text)
    if phones:
        result["phone"] = phones[0]
    
    # Basic skills detection (common technical skills)
    skills_keywords = [
        "python", "java", "javascript", "sql", "excel", "powerpoint", "word",
        "project management", "data analysis", "communication", "leadership",
        "teamwork", "problem solving", "microsoft office", "google analytics"
    ]
    
    found_skills = []
    text_lower = text.lower()
    for skill in skills_keywords:
        if skill in text_lower:
            found_skills.append(skill.title())
    
    if found_skills:
        result["skills"] = found_skills[:10]  # Limit to 10 skills
    
    return result


def _get_fallback_careers():
    """Return fallback career recommendations when AI is not available."""
    return [
        {
            "role": "Business Analyst",
            "match": 75,
            "description": "Analyze business processes and requirements to improve efficiency and drive strategic decisions",
            "skills_needed": "Data Analysis, SQL, Excel, Business Process Mapping, Communication",
            "growth_potential": "High",
            "salary_range": "₹5,00,000 - ₹12,00,000"
        },
        {
            "role": "Project Coordinator",
            "match": 78,
            "description": "Coordinate project activities, manage timelines, and ensure deliverables meet quality standards",
            "skills_needed": "Project Management, Communication, MS Office, Time Management, Team Coordination",
            "growth_potential": "High",
            "salary_range": "₹4,50,000 - ₹9,00,000"
        },
        {
            "role": "Content Specialist",
            "match": 72,
            "description": "Create engaging content across multiple platforms while maintaining brand consistency",
            "skills_needed": "Content Writing, SEO, Social Media, Research Skills, Creative Thinking",
            "growth_potential": "High",
            "salary_range": "₹3,50,000 - ₹8,00,000"
        }
    ]


