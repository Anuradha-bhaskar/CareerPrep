# routes/practice.py

from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from ..database.db import get_db
from ..database.models import User, Resume, EyeMetric, UserEmotionData
from .. import crud, schemas
from ..utils import authenticate_and_get_user_details
from ..services.interview.video_analysis import InterviewMetricsTracker
from ..services.interview.interview import Interview
from ..services.resume.resume_processor import ResumeProcessor
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import re
import google.generativeai as genai
import cv2
import base64
import numpy as np
# Removed Keras/TensorFlow imports; emotion prediction will be a placeholder
import datetime

router = APIRouter()

active_interviews = {}

# NOTE: Keras model removed. Emotion prediction now uses a simple placeholder to keep
# the API stable. If you want real predictions, integrate a service or TF.js separately.
# Dictionary mapping emotion indices to labels
emotion_dict = {0: "Angry", 1: "Disgusted", 2: "Fearful",
                3: "Happy", 4: "Neutral", 5: "Sad", 6: "Surprised"}
# Load face cascade classifier
cascade_file_paths = [
    'haarcascade_frontalface_default.xml',
    os.path.join(os.path.dirname(os.path.abspath(__file__)),
                 'haarcascade_frontalface_default.xml'),
    os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
]
facecasc = None
for cascade_path in cascade_file_paths:
    if os.path.exists(cascade_path):
        facecasc = cv2.CascadeClassifier(cascade_path)
        if not facecasc.empty():
            break




# Initialize AI client (you might want to move this to a config file)
ai_client = None
tts_service = None

try:
    # Configure your AI client here (example with Gemini)
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    ai_client = genai
    print("AI client initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize AI client: {e}")




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



@router.get("/analysis/{session_id}", response_model=schemas.InterviewAnalysisResponse)
def get_interview_analysis(
    request: Request,
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Get AI-generated interview analysis for a session.
    """
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get("user_id")

        # Verify session belongs to user
        session = crud.get_interview_session_by_id(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found.")
        if session.user_id != user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this session.")

        # Try fetching stored analysis first
        try:
            analysis = crud.get_interview_analysis(db, session_id)
            return analysis
        except HTTPException as e:
            if e.status_code != 404:
                raise
            # Fallback: derive analysis-like response from InterviewResult if available
            result = crud.get_interview_result_by_session(db, session_id)
            if not result:
                raise HTTPException(status_code=404, detail="Analysis not found")

            # Convert list fields to text blocks
            strengths_txt = "\n".join(result.strengths or []) if isinstance(result.strengths, list) else (result.strengths or "")
            areas_txt = "\n".join(result.areas_for_improvement or []) if isinstance(result.areas_for_improvement, list) else (result.areas_for_improvement or "")
            recs_txt = "\n".join(result.recommendations or []) if isinstance(result.recommendations, list) else (result.recommendations or "")

            # Map numeric scores to string ratings (simple representation)
            comm_rating = f"Communication: {getattr(result, 'communication_score', 0):.0f}/100"
            tech_rating = f"Technical: {getattr(result, 'technical_knowledge_score', 0):.0f}/100"

            return {
                "id": 0,  # synthetic id for response shaping
                "session_id": session_id,
                "strengths": strengths_txt,
                "areas_for_improvement": areas_txt,
                "communication_rating": comm_rating,
                "technical_rating": tech_rating,
                "recommendations": recs_txt,
            }
    except HTTPException as e:
        print(f"HTTPException: {e.detail}")
        raise e
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")




@router.post("/start-interview")
def start_interview_post(
    request: Request,
    interview_request: schemas.StartInterviewRequest,
    db: Session = Depends(get_db)
):
    """
    Handle POST request for interview message processing.
    """
    # Authenticate user
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details["user_id"]
    
    # Get user from database, create if doesn't exist
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Auto-create user if they don't exist (similar to users.py)
        email = user_details.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Cannot create user: missing email")
        
        name = user_details.get("name") or "No Name"
        username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
        
        new_user = schemas.UserCreate(
            id=user_id,
            email=email,
            username=username,
            name=name,
            password=None
        )
        try:
            user = crud.create_user(db, new_user)
            print(f"[DEBUG] Auto-created user {user_id} in database")
        except Exception as e:
            print(f"[DEBUG] Error creating user: {e}")
            raise HTTPException(status_code=500, detail="Failed to create user account")
    
    # Check if user has uploaded a resume
    user_resume = db.query(Resume).filter(Resume.user_id == user_id).first()
    if not user_resume:
        raise HTTPException(status_code=400, detail="Please upload a resume first")
    
    user_message = interview_request.message
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    response_data = None
    
    print(f"[DEBUG] Received POST for user {user_id}. Message: '{user_message}'")
    
    if user_id in active_interviews:
        print(f"[DEBUG] User {user_id} found in active_interviews.")
        interview_instance = active_interviews[user_id]
        
        # Check if the message is the "End Interview" command
        is_end_command = "end interview" in user_message.lower() or user_message.strip().lower() == "end"
        print(f"[DEBUG] Is end command? {is_end_command}")
        
        if is_end_command:
            print(f"[DEBUG] Ending interview for user {user_id} via command.")
            
            # 1. Get closing statement and transcript from Interview object
            closing_statement, transcript = interview_instance.end_interview()
            print(f"[DEBUG] Closing statement: {closing_statement[:100]}...")
            print(f"[DEBUG] Transcript length: {len(transcript)}")
            
            # 2. Retrieve performance metrics for this user/session
            performance_metrics = "No performance metrics found."
            try:
                latest_metric = db.query(EyeMetric).filter(
                    EyeMetric.user_id == user_id,
                    EyeMetric.is_auto_save == False
                ).order_by(EyeMetric.timestamp.desc()).first()
                
                if latest_metric:
                    performance_metrics = f"""
Performance Metrics (Latest Session: {latest_metric.session_id}):
- Eye Contact Losses: {latest_metric.loss_eye_contact_count}
- Looking Away Duration: {latest_metric.looking_away_duration:.1f}s
- Bad Posture Count: {latest_metric.bad_posture_count}
- Bad Posture Duration: {latest_metric.bad_posture_duration:.1f}s
- Hand Movement Duration: {latest_metric.hand_detection_duration:.1f}s
"""
                    print("[DEBUG] Successfully fetched performance metrics.")
                else:
                    print("[DEBUG] No final performance metrics found for user.")
            except Exception as e:
                print(f"[DEBUG] Error fetching performance metrics: {e}")
                performance_metrics = "Error fetching performance metrics."
            
            # 3. Construct the prompt for feedback and recommendations
            feedback_prompt = f"""
You are an expert interview coach reviewing a completed interview session.
Analyze the following interview transcript and performance metrics (if available).
Provide constructive feedback and actionable recommendations for the candidate to improve their interview skills.

Focus on:
- Clarity and conciseness of answers.
- Relevance of answers to the questions.
- Use of specific examples (STAR method if applicable).
- Professionalism and tone.
- Handling of technical/behavioral questions.
- Any insights from performance metrics (e.g., frequent looking away might suggest lack of confidence or preparation).

Structure your response:
1.  **Overall Summary:** A brief overview of the candidate's performance.
2.  **Strengths:** Mention specific positive aspects.
3.  **Areas for Improvement:** Provide specific, actionable feedback on weaknesses.
4.  **Performance Metrics Insights (if applicable):** Briefly comment on what the metrics might indicate.
5.  **Recommendations:** Suggest concrete steps the candidate can take (e.g., practice STAR method, research common questions, work on body language).

Keep the feedback professional, encouraging, and helpful.

**Interview Transcript:**
{transcript}

**Performance Metrics:**
{performance_metrics}

**Generate the feedback and recommendations:**
"""
            
            # 4. Call the AI with the feedback prompt
            ai_feedback = "Could not generate feedback at this time."
            if ai_client:
                try:
                    print("[DEBUG] Calling AI for feedback...")
                    feedback_model = ai_client.GenerativeModel('gemini-1.5-flash')
                    # Add safety settings to potentially mitigate content filtering issues
                    safety_settings = [
                        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
                    ]
                    feedback_response = feedback_model.generate_content(
                        feedback_prompt,
                        safety_settings=safety_settings
                    )
                    ai_feedback = feedback_response.text
                    # Check if feedback is empty even after successful call (e.g., filtering)
                    if not ai_feedback.strip():
                        ai_feedback = "Feedback generation resulted in an empty response (potentially due to content filtering)."
                        print("[DEBUG] AI Feedback was empty after successful call.")
                    else:
                        print(f"[DEBUG] AI Feedback generated: {ai_feedback[:100]}...")
                except Exception as e:
                    print(f"[DEBUG] Error calling AI for feedback: {e}")
                    # Provide a more informative error in the response
                    ai_feedback = f"Error generating feedback. Please check server logs. (Error: {e})"
            else:
                print("[DEBUG] AI client not available for feedback generation.")
                ai_feedback = "AI Client not configured, cannot generate feedback."
            
            # Ensure ai_feedback is always a non-empty string before formatting
            if not ai_feedback:
                ai_feedback = "Feedback could not be generated."
            
            # 5. Construct final response (Closing + Feedback)
            # Format feedback for HTML: Replace double newlines with paragraph breaks, single newlines with <br>
            feedback_text = str(ai_feedback).strip()
            formatted_feedback = re.sub(r'\n\s*\n', '<br><br>', feedback_text)  # Paragraphs
            formatted_feedback = re.sub(r'\n', '<br>', formatted_feedback)  # Line breaks within paragraphs
            
            ai_response = f"{closing_statement}<br><br>--- Feedback ---<br>{formatted_feedback}"
            
            # Wrap as interview completed response
            response_data = {
                "type": "interview_complete",
                "content": ai_response,
                "button_text": "Start New Interview"
            }
            
            # Clean up active interview
            active_interviews.pop(user_id, None)
            print(f"[DEBUG] Final response_data created for interview end")
            
        else:
            # Otherwise, process the answer normally
            print(f"[DEBUG] Processing answer normally for user {user_id}.")
            
            # Save user message to database
            try:
                # Get the session ID from active interviews
                session_id = None
                for sid, interview in active_interviews.items():
                    if sid == user_id:
                        # We need to get the session_id from somewhere - let's store it in the interview instance
                        session_id = getattr(interview_instance, 'session_id', None)
                        break
                
                if session_id:
                    # Get the next message order
                    existing_messages = crud.get_interview_messages_by_session(db, session_id)
                    next_order = len(existing_messages)
                    
                    # Save user message
                    user_message_data = schemas.InterviewMessageCreate(
                        session_id=session_id,
                        speaker="user",
                        message=user_message,
                        timestamp=datetime.datetime.now(),
                        message_order=next_order
                    )
                    crud.create_interview_message(db, user_message_data)
                    
                    # Update questions answered count
                    crud.update_interview_session(db, session_id, {"questions_answered": next_order // 2})
                    
            except Exception as e:
                print(f"[DEBUG] Error saving user message: {e}")
            
            ai_response_text = interview_instance.process_answer(user_message)
            print(f"[DEBUG] Response from process_answer(): {ai_response_text[:100]}...")
            
            # Save AI response to database
            try:
                if session_id:
                    existing_messages = crud.get_interview_messages_by_session(db, session_id)
                    next_order = len(existing_messages)
                    
                    ai_message_data = schemas.InterviewMessageCreate(
                        session_id=session_id,
                        speaker="ai",
                        message=ai_response_text,
                        timestamp=datetime.datetime.now(),
                        message_order=next_order
                    )
                    crud.create_interview_message(db, ai_message_data)
                    
                    # Update questions asked count
                    crud.update_interview_session(db, session_id, {"questions_asked": (next_order + 1) // 2})
                    
            except Exception as e:
                print(f"[DEBUG] Error saving AI response: {e}")
            
            # Check if process_answer itself ended the interview
            if interview_instance.interview_end_time:
                print(f"[DEBUG] Interview ended during process_answer for user {user_id}.")
                active_interviews.pop(user_id, None)
                # Interview completed response
                response_data = {
                    "type": "interview_complete",
                    "content": ai_response_text,
                    "button_text": "Start New Interview"
                }
            else:
                # Just a text response
                response_data = {"type": "text", "content": ai_response_text}
    
    else:
        print(f"[DEBUG] User {user_id} NOT found in active_interviews. Treating as start command.")
        # Check if the command is specifically to start the interview
        if "start interview" in user_message.lower() or user_message.strip().lower() == "start":
            if ai_client:
                error_occurred = False  # Flag to track if setup failed
                ai_response_text = None  # Initialize ai_response_text
                resume_data = {}  # Initialize resume_data
                try:
                    resume_processor = ResumeProcessor(ai_client=ai_client)
                    if not user_resume:
                        ai_response_text = "Error: Resume not found. Please upload first."
                        error_occurred = True
                    else:
                        resume_path_abs = user_resume.file_url
                        print(f"[DEBUG] Re-fetched absolute path for start: {resume_path_abs}")
                        
                        if os.path.exists(resume_path_abs):
                            print(f"Processing resume file: {resume_path_abs}")
                            # Call the AI to process resume
                            resume_data = resume_processor.process_resume(resume_path_abs)
                            print(f"Resume processed. Data keys: {list(resume_data.keys())}")
                            # Check if processing actually returned data
                            if not resume_data:
                                print("[ERROR] Resume processing returned empty data.")
                                ai_response_text = "Error processing resume data."
                                error_occurred = True
                        else:
                            print(f"Error: Resume file not found at {resume_path_abs}")
                            ai_response_text = "Error: Could not find your resume file. Please re-upload."
                            error_occurred = True
                    
                    if not error_occurred:  # Check the flag
                        print("[DEBUG] No errors during resume processing, proceeding to create Interview instance.")
                        
                        # Create interview session in database
                        session_id = f"session_{int(datetime.datetime.now().timestamp())}"
                        session_data = schemas.InterviewSessionCreate(
                            user_id=user_id,
                            session_id=session_id,
                            start_time=datetime.datetime.now(),
                            resume_used=user_resume.file_url,
                            status="active"
                        )
                        
                        try:
                            db_session = crud.create_interview_session(db, session_data)
                            print(f"[DEBUG] Created interview session: {session_id}")
                            
                            # Create Interview instance and start
                            interview_instance = Interview(ai_client=ai_client, tts_service=tts_service, resume_data=resume_data)
                            active_interviews[user_id] = interview_instance
                            
                            # Call start_interview and store the response
                            ai_response_text = interview_instance.start_interview()
                            print(f"[DEBUG] Interview started for user {user_id}. First question: {ai_response_text[:100]}...")
                            
                            # Save AI's first question
                            first_question_data = schemas.InterviewMessageCreate(
                                session_id=session_id,
                                speaker="ai",
                                message=ai_response_text,
                                timestamp=datetime.datetime.now(),
                                message_order=1
                            )
                            crud.create_interview_message(db, first_question_data)
                            
                            response_data = {"type": "text", "content": ai_response_text, "session_id": session_id}
                            
                        except Exception as db_error:
                            print(f"[DEBUG] Database error creating session: {db_error}")
                            error_occurred = True
                            ai_response_text = "Error creating interview session. Please try again."
                            response_data = {"type": "text", "content": ai_response_text}
                    else:
                        print("[DEBUG] Error occurred during resume processing or file handling, skipping Interview creation.")
                        # Minor improvement: Use specific error message if available
                        error_message = ai_response_text if ai_response_text else "An error occurred starting the interview."
                        response_data = {"type": "text", "content": error_message}
                
                except Exception as e:
                    error_occurred = True  # Set flag in except
                    print(f"[DEBUG] Exception during interview start: {e}")
                    ai_response_text = f"An error occurred while starting the interview: {e}"
                    response_data = {"type": "text", "content": ai_response_text}
            else:
                ai_response_text = "AI Client not configured. Cannot start AI interview."
                print("[DEBUG] AI client not configured.")
                response_data = {"type": "text", "content": ai_response_text}
        else:
            # Invalid command when no interview is active
            response_data = {
                "type": "error", 
                "content": "Please click 'Start Interview' to begin your interview session."
            }
    
    # Ensure response_data is always a dictionary
    if not isinstance(response_data, dict):
        print(f"[WARN] response_data is not a dict: {response_data}. Wrapping as text error.")
        response_data = {"type": "text", "content": str(response_data or "Error: Invalid response generated.")}
    
    print(f"[DEBUG] Returning JSON response: {str(response_data)[:200]}...")
    return JSONResponse(response_data)



@router.post("/process_image", response_model=schemas.ImageProcessResponse)
def process_image(
    request: Request,
    image_data: schemas.ImageProcessRequest,
    db: Session = Depends(get_db)
):
    """
    Process an image for emotion detection and return annotated image with prediction.
    """
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get('user_id')
        
        if not user_id:
            return schemas.ImageProcessResponse(
                success=False,
                error='User not logged in'
            )
        
        # Ensure user exists in database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Auto-create user if they don't exist
            email = user_details.get("email")
            if not email:
                return schemas.ImageProcessResponse(
                    success=False,
                    error='Cannot create user: missing email'
                )
            
            name = user_details.get("name") or "No Name"
            username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
            
            new_user = schemas.UserCreate(
                id=user_id,
                email=email,
                username=username,
                name=name,
                password=None
            )
            try:
                user = crud.create_user(db, new_user)
                print(f"[DEBUG] Auto-created user {user_id} in process_image")
            except Exception as e:
                print(f"[DEBUG] Error creating user in process_image: {e}")
                return schemas.ImageProcessResponse(
                    success=False,
                    error='Failed to create user account'
                )

        # Get the image data from the request
        image_base64 = image_data.image
        save_prediction = image_data.savePrediction

        # Remove the data URL prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]

        # Decode the base64 image
        try:
            image_bytes = base64.b64decode(image_base64)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return schemas.ImageProcessResponse(
                    success=False,
                    error='Invalid image data'
                )
        except Exception as e:
            return schemas.ImageProcessResponse(
                success=False,
                error=f'Error decoding image: {str(e)}'
            )

        # Process the image
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = facecasc.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

        prediction = None
        probability = 0.0
        detected_emotion = None

        # If faces are detected, focus on the largest face
        if len(faces) > 0:
            # Find the largest face
            largest_face = max(faces, key=lambda face: face[2] * face[3])
            x, y, w, h = largest_face

            # Draw rectangle around the face
            cv2.rectangle(frame, (x, y-50), (x+w, y+h+10), (255, 0, 0), 2)

            # Extract the face ROI (kept in case future use)
            roi_gray = gray[y:y + h, x:x + w]
            _ = cv2.resize(roi_gray, (48, 48))  # preprocessed ROI (unused without model)

            # Placeholder prediction without Keras: default to Neutral with low confidence
            detected_emotion = "Neutral"
            probability = 0.0

            # Add text to the image
            cv2.putText(frame, detected_emotion, (x+20, y-60),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)

            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            # Save to database if requested
            if save_prediction and detected_emotion:
                try:
                    emotion_data = UserEmotionData(
                        user_id=user_id,
                        timestamp=timestamp,
                        emotion=detected_emotion,
                        confidence=probability
                    )
                    db.add(emotion_data)
                    db.commit()
                except Exception as e:
                    print(f"Error saving emotion data: {str(e)}")
                    # Don't fail the request if saving fails
                    pass

        # Encode the processed image back to base64
        try:
            _, buffer = cv2.imencode('.jpg', frame)
            encoded_image = base64.b64encode(buffer).decode('utf-8')
        except Exception as e:
            return schemas.ImageProcessResponse(
                success=False,
                error=f'Error encoding processed image: {str(e)}'
            )

        # Return the results
        return schemas.ImageProcessResponse(
            success=True,
            annotated_image_base64=encoded_image,
            prediction=detected_emotion,
            probability=probability
        )
        
    except Exception as e:
        print(f"Error in process_image: {str(e)}")
        return schemas.ImageProcessResponse(
            success=False,
            error=f'Internal server error: {str(e)}'
        )


@router.get("/emotion_stats", response_model=schemas.EmotionStatsResponse)
def emotion_stats(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get emotion statistics for the current user from the last hour.
    """
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get('user_id')
        
        if not user_id:
            return schemas.EmotionStatsResponse(
                success=False,
                error='User not logged in'
            )
        
        # Ensure user exists in database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Auto-create user if they don't exist
            email = user_details.get("email")
            if not email:
                return schemas.EmotionStatsResponse(
                    success=False,
                    error='Cannot create user: missing email'
                )
            
            name = user_details.get("name") or "No Name"
            username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
            
            new_user = schemas.UserCreate(
                id=user_id,
                email=email,
                username=username,
                name=name,
                password=None
            )
            try:
                user = crud.create_user(db, new_user)
                print(f"[DEBUG] Auto-created user {user_id} in emotion-stats")
            except Exception as e:
                print(f"[DEBUG] Error creating user in emotion-stats: {e}")
                return schemas.EmotionStatsResponse(
                    success=False,
                    error='Failed to create user account'
                )

        # Get the latest session data (last hour)
        from datetime import timedelta
        one_hour_ago = datetime.datetime.now() - timedelta(hours=1)

        emotions = db.query(UserEmotionData).filter_by(user_id=user_id).filter(
            UserEmotionData.timestamp >= one_hour_ago
        ).all()

        # Calculate statistics
        emotion_counts = {"Angry": 0, "Disgusted": 0, "Fearful": 0, "Happy": 0,
                          "Neutral": 0, "Sad": 0, "Surprised": 0}

        for emotion_data in emotions:
            if emotion_data.emotion in emotion_counts:
                emotion_counts[emotion_data.emotion] += 1

        total = sum(emotion_counts.values())

        # Calculate percentages
        emotion_percentages = {}
        if total > 0:
            for emotion, count in emotion_counts.items():
                emotion_percentages[emotion] = round((count / total) * 100, 1)
        else:
            emotion_percentages = {emotion: 0.0 for emotion in emotion_counts.keys()}

        return schemas.EmotionStatsResponse(
            success=True,
            emotion_counts=emotion_counts,
            emotion_percentages=emotion_percentages,
            total_detections=total
        )
        
    except Exception as e:
        print(f"Error in emotion_stats: {str(e)}")
        return schemas.EmotionStatsResponse(
            success=False,
            error=f'Internal server error: {str(e)}'
        )


# Initialize the metrics tracker
metrics_tracker = None


@router.get("/start_video_analysis", response_model=schemas.VideoAnalysisResponse)
def start_video_analysis(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Start video analysis for the current user.
    """
    global metrics_tracker
    
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get('user_id')
        
        if not user_id:
            return schemas.VideoAnalysisResponse(
                success=False,
                error='User not logged in'
            )
        
        # Ensure user exists in database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Auto-create user if they don't exist
            email = user_details.get("email")
            if not email:
                return schemas.VideoAnalysisResponse(
                    success=False,
                    error='Cannot create user: missing email'
                )
            
            name = user_details.get("name") or "No Name"
            username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
            
            new_user = schemas.UserCreate(
                id=user_id,
                email=email,
                username=username,
                name=name,
                password=None
            )
            try:
                user = crud.create_user(db, new_user)
                print(f"[DEBUG] Auto-created user {user_id} in start_video_analysis")
            except Exception as e:
                print(f"[DEBUG] Error creating user in start_video_analysis: {e}")
                return schemas.VideoAnalysisResponse(
                    success=False,
                    error='Failed to create user account'
                )

        # Initialize the metrics tracker if it doesn't exist
        if metrics_tracker is None:
            metrics_tracker = InterviewMetricsTracker()
            metrics_tracker.start3()  # Start in background thread with simulation

        return schemas.VideoAnalysisResponse(
            success=True,
            message='Video analysis started'
        )
        
    except Exception as e:
        print(f"Error in start_video_analysis: {str(e)}")
        return schemas.VideoAnalysisResponse(
            success=False,
            error=f'Internal server error: {str(e)}'
        )


@router.get("/end_video_analysis", response_model=schemas.VideoAnalysisResponse)
def end_video_analysis(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    End video analysis and save final metrics for the current user.
    """
    global metrics_tracker
    
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get('user_id')
        
        if not user_id:
            return schemas.VideoAnalysisResponse(
                success=False,
                error='User not logged in'
            )
        
        # Ensure user exists in database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Auto-create user if they don't exist
            email = user_details.get("email")
            if not email:
                return schemas.VideoAnalysisResponse(
                    success=False,
                    error='Cannot create user: missing email'
                )
            
            name = user_details.get("name") or "No Name"
            username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
            
            new_user = schemas.UserCreate(
                id=user_id,
                email=email,
                username=username,
                name=name,
                password=None
            )
            try:
                user = crud.create_user(db, new_user)
                print(f"[DEBUG] Auto-created user {user_id} in end_video_analysis")
            except Exception as e:
                print(f"[DEBUG] Error creating user in end_video_analysis: {e}")
                return schemas.VideoAnalysisResponse(
                    success=False,
                    error='Failed to create user account'
                )

        if metrics_tracker is not None:
            # Save final metrics
            metrics_tracker.close()

            # Save final metrics to our SQLAlchemy model
            try:
                # Create a final EyeMetric record
                final_metrics = EyeMetric(
                    user_id=user_id,
                    session_id=metrics_tracker.session_id,
                    hand_detection_count=metrics_tracker.metrics["handDetectionCount"],
                    hand_detection_duration=metrics_tracker.metrics["handDetectionDuration"],
                    loss_eye_contact_count=metrics_tracker.metrics["lossEyeContactCount"],
                    looking_away_duration=metrics_tracker.metrics["lookingAwayDuration"],
                    bad_posture_count=metrics_tracker.metrics["badPostureCount"],
                    bad_posture_duration=metrics_tracker.metrics["badPostureDuration"],
                    is_auto_save=False  # This is a final save, not an auto-save
                )

                # Add and commit
                db.add(final_metrics)
                db.commit()

                print(f"Final eye metrics saved to database for session {metrics_tracker.session_id}")
            except Exception as e:
                error_msg = str(e)
                print(f"Error saving final eye metrics: {error_msg}")
                db.rollback()

            # Clear the tracker
            metrics_tracker = None

            return schemas.VideoAnalysisResponse(
                success=True,
                message='Video analysis ended and metrics saved'
            )
        else:
            return schemas.VideoAnalysisResponse(
                success=False,
                error='Video analysis not started'
            )
            
    except Exception as e:
        print(f"Error in end_video_analysis: {str(e)}")
        return schemas.VideoAnalysisResponse(
            success=False,
            error=f'Internal server error: {str(e)}'
        )


@router.get("/video_metrics", response_model=schemas.VideoMetricsResponse)
def get_video_metrics(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get current video analysis metrics for the current user.
    """
    global metrics_tracker
    
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get('user_id')
        
        if not user_id:
            return schemas.VideoMetricsResponse(
                success=False,
                error='User not logged in'
            )
        
        # Ensure user exists in database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Auto-create user if they don't exist
            email = user_details.get("email")
            if not email:
                return schemas.VideoMetricsResponse(
                    success=False,
                    error='Cannot create user: missing email'
                )
            
            name = user_details.get("name") or "No Name"
            username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
            
            new_user = schemas.UserCreate(
                id=user_id,
                email=email,
                username=username,
                name=name,
                password=None
            )
            try:
                user = crud.create_user(db, new_user)
                print(f"[DEBUG] Auto-created user {user_id} in get_video_metrics")
            except Exception as e:
                print(f"[DEBUG] Error creating user in get_video_metrics: {e}")
                return schemas.VideoMetricsResponse(
                    success=False,
                    error='Failed to create user account'
                )

        # Return current metrics if the tracker exists
        if metrics_tracker is not None:
            # Auto save metrics to database for persistence
            metrics_tracker.auto_save_metrics()

            # Save to our SQLAlchemy model
            try:
                # Check if there's an existing auto-save record for this session
                existing = db.query(EyeMetric).filter_by(
                    user_id=user_id,
                    session_id=metrics_tracker.session_id,
                    is_auto_save=True
                ).first()

                if existing:
                    # Update existing record instead of creating a new one
                    existing.hand_detection_count = metrics_tracker.metrics["handDetectionCount"]
                    existing.hand_detection_duration = metrics_tracker.metrics["handDetectionDuration"]
                    existing.loss_eye_contact_count = metrics_tracker.metrics["lossEyeContactCount"]
                    existing.looking_away_duration = metrics_tracker.metrics["lookingAwayDuration"]
                    existing.bad_posture_count = metrics_tracker.metrics["badPostureCount"]
                    existing.bad_posture_duration = metrics_tracker.metrics["badPostureDuration"]
                    existing.timestamp = datetime.datetime.now()
                else:
                    # Create a new EyeMetric record
                    eye_metrics = EyeMetric(
                        user_id=user_id,
                        session_id=metrics_tracker.session_id,
                        hand_detection_count=metrics_tracker.metrics["handDetectionCount"],
                        hand_detection_duration=metrics_tracker.metrics["handDetectionDuration"],
                        loss_eye_contact_count=metrics_tracker.metrics["lossEyeContactCount"],
                        looking_away_duration=metrics_tracker.metrics["lookingAwayDuration"],
                        bad_posture_count=metrics_tracker.metrics["badPostureCount"],
                        bad_posture_duration=metrics_tracker.metrics["badPostureDuration"],
                        is_auto_save=True
                    )
                    db.add(eye_metrics)

                db.commit()
            except Exception as e:
                error_msg = str(e)
                print(f"Error saving to eye metrics database: {error_msg}")
                db.rollback()

            return schemas.VideoMetricsResponse(
                success=True,
                metrics=metrics_tracker.metrics
            )
        else:
            return schemas.VideoMetricsResponse(
                success=False,
                error='Video analysis not started'
            )
            
    except Exception as e:
        print(f"Error in get_video_metrics: {str(e)}")
        return schemas.VideoMetricsResponse(
            success=False,
            error=f'Internal server error: {str(e)}'
        )


@router.post("/process_video")
def process_video(
    request: Request,
    video_data: dict,
    db: Session = Depends(get_db)
):
    """
    Process uploaded video for analysis and metrics.
    """
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get('user_id')
        
        if not user_id:
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "User not logged in"}
            )
        
        # Ensure user exists in database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Auto-create user if they don't exist
            email = user_details.get("email")
            if not email:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "Cannot create user: missing email"}
                )
            
            name = user_details.get("name") or "No Name"
            username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
            
            new_user = schemas.UserCreate(
                id=user_id,
                email=email,
                username=username,
                name=name,
                password=None
            )
            try:
                user = crud.create_user(db, new_user)
                print(f"[DEBUG] Auto-created user {user_id} in process_video")
            except Exception as e:
                print(f"[DEBUG] Error creating user in process_video: {e}")
                return JSONResponse(
                    status_code=500,
                    content={"success": False, "error": "Failed to create user account"}
                )

        # Extract video data and session ID
        video_base64 = video_data.get('video_data')
        session_id = video_data.get('session_id')
        
        if not video_base64:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "No video data provided"}
            )

        # Remove the data URL prefix if present
        if ',' in video_base64:
            video_base64 = video_base64.split(',')[1]

        # Process the video (this is a simplified version - in production you'd want more sophisticated processing)
        # For now, we'll just acknowledge receipt and simulate some metrics
        
        # Generate some sample metrics for demonstration
        import random
        sample_metrics = {
            "handDetectionCount": random.randint(0, 5),
            "handDetectionDuration": random.uniform(0, 10),
            "lossEyeContactCount": random.randint(0, 3),
            "lookingAwayDuration": random.uniform(0, 5),
            "badPostureCount": random.randint(0, 2),
            "badPostureDuration": random.uniform(0, 3)
        }
        
        # Save metrics to database if session_id is provided
        if session_id:
            try:
                eye_metrics = EyeMetric(
                    user_id=user_id,
                    session_id=session_id,
                    hand_detection_count=sample_metrics["handDetectionCount"],
                    hand_detection_duration=sample_metrics["handDetectionDuration"],
                    loss_eye_contact_count=sample_metrics["lossEyeContactCount"],
                    looking_away_duration=sample_metrics["lookingAwayDuration"],
                    bad_posture_count=sample_metrics["badPostureCount"],
                    bad_posture_duration=sample_metrics["badPostureDuration"],
                    is_auto_save=False
                )
                db.add(eye_metrics)
                db.commit()
                
                print(f"Video metrics saved for user {user_id}, session {session_id}")
                
            except Exception as e:
                print(f"Error saving video metrics: {e}")
                db.rollback()

        return JSONResponse(
            content={
                "success": True,
                "message": "Video processed successfully",
                "metrics": sample_metrics
            }
        )
        
    except Exception as e:
        print(f"Error processing video: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Internal server error: {str(e)}"}
        )


@router.get("/emotion-stats", response_model=schemas.EmotionStatsResponse)
def get_emotion_stats(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get emotion detection statistics for the current user.
    """
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get('user_id')
        
        if not user_id:
            return schemas.EmotionStatsResponse(
                success=False,
                error='User not logged in'
            )
        
        # Ensure user exists in database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Auto-create user if they don't exist
            email = user_details.get("email")
            if not email:
                return schemas.EmotionStatsResponse(
                    success=False,
                    error='Cannot create user: missing email'
                )
            
            name = user_details.get("name") or "No Name"
            username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
            
            new_user = schemas.UserCreate(
                id=user_id,
                email=email,
                username=username,
                name=name,
                password=None
            )
            try:
                user = crud.create_user(db, new_user)
                print(f"[DEBUG] Auto-created user {user_id} in emotion-stats")
            except Exception as e:
                print(f"[DEBUG] Error creating user in emotion-stats: {e}")
                return schemas.EmotionStatsResponse(
                    success=False,
                    error='Failed to create user account'
                )

        # Get the latest eye metrics for the user
        latest_metrics = db.query(EyeMetric).filter(
            EyeMetric.user_id == user_id,
            EyeMetric.is_auto_save == False
        ).order_by(EyeMetric.timestamp.desc()).first()

        if not latest_metrics:
            return schemas.EmotionStatsResponse(
                success=False,
                error='No performance metrics found'
            )

        # For now, we'll return the eye metrics as emotion stats
        # In a full implementation, you'd have separate emotion detection data
        emotion_counts = {
            "Eye Contact Losses": latest_metrics.loss_eye_contact_count,
            "Looking Away": 1 if latest_metrics.looking_away_duration > 0 else 0,
            "Bad Posture": latest_metrics.bad_posture_count,
            "Hand Movements": latest_metrics.hand_detection_count
        }

        total_detections = sum(emotion_counts.values())
        
        emotion_percentages = {}
        if total_detections > 0:
            for emotion, count in emotion_counts.items():
                emotion_percentages[emotion] = (count / total_detections) * 100

        return schemas.EmotionStatsResponse(
            success=True,
            emotion_counts=emotion_counts,
            emotion_percentages=emotion_percentages,
            total_detections=total_detections
        )
        
    except Exception as e:
        print(f"Error getting emotion stats: {e}")
        return schemas.EmotionStatsResponse(
            success=False,
            error=f'Internal server error: {str(e)}'
        )

@router.get("/interview-history", response_model=schemas.InterviewHistoryResponse)
def get_interview_history(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get interview history for the current user.
    """
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get('user_id')
        
        if not user_id:
            return schemas.InterviewHistoryResponse(
                success=False,
                interviews=[],
                total_count=0,
                error='User not logged in'
            )
        
        # Ensure user exists in database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Auto-create user if they don't exist
            email = user_details.get("email")
            if not email:
                return schemas.InterviewHistoryResponse(
                    success=False,
                    interviews=[],
                    total_count=0,
                    error='Cannot create user: missing email'
                )
            
            name = user_details.get("name") or "No Name"
            username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
            
            new_user = schemas.UserCreate(
                id=user_id,
                email=email,
                username=username,
                name=name,
                password=None
            )
            try:
                user = crud.create_user(db, new_user)
                print(f"[DEBUG] Auto-created user {user_id} in interview-history")
            except Exception as e:
                print(f"[DEBUG] Error creating user in interview-history: {e}")
                return schemas.InterviewHistoryResponse(
                    success=False,
                    interviews=[],
                    total_count=0,
                    error='Failed to create user account'
                )

        # Get interview sessions for the user
        interview_sessions = crud.get_interview_sessions_by_user(db, user_id)
        
        return schemas.InterviewHistoryResponse(
            success=True,
            interviews=interview_sessions,
            total_count=len(interview_sessions)
        )
        
    except Exception as e:
        print(f"Error getting interview history: {e}")
        return schemas.InterviewHistoryResponse(
            success=False,
            interviews=[],
            total_count=0,
            error=f'Internal server error: {str(e)}'
        )

@router.get("/interview-review/{session_id}", response_model=schemas.InterviewReviewResponse)
def get_interview_review(
    session_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get detailed review for a specific interview session.
    """
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get('user_id')
        
        if not user_id:
            return schemas.InterviewReviewResponse(
                success=False,
                session=None,
                messages=[],
                result=None,
                performance_metrics=None,
                error='User not logged in'
            )
        
        # Ensure user exists in database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Auto-create user if they don't exist
            email = user_details.get("email")
            if not email:
                return schemas.InterviewReviewResponse(
                    success=False,
                    session=None,
                    messages=[],
                    result=None,
                    performance_metrics=None,
                    error='Cannot create user: missing email'
                )
            
            name = user_details.get("name") or "No Name"
            username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
            
            new_user = schemas.UserCreate(
                id=user_id,
                email=email,
                username=username,
                name=name,
                password=None
            )
            try:
                user = crud.create_user(db, new_user)
                print(f"[DEBUG] Auto-created user {user_id} in interview-review")
            except Exception as e:
                print(f"[DEBUG] Error creating user in interview-review: {e}")
                return schemas.InterviewReviewResponse(
                    success=False,
                    session=None,
                    messages=[],
                    result=None,
                    performance_metrics=None,
                    error='Failed to create user account'
                )

        # Get interview session
        session = crud.get_interview_session_by_id(db, session_id)
        if not session:
            return schemas.InterviewReviewResponse(
                success=False,
                session=None,
                messages=[],
                result=None,
                performance_metrics=None,
                error='Interview session not found'
            )
        
        # Verify the session belongs to the authenticated user
        if session.user_id != user_id:
            return schemas.InterviewReviewResponse(
                success=False,
                session=None,
                messages=[],
                result=None,
                performance_metrics=None,
                error='Access denied: session does not belong to user'
            )

        # Get interview messages
        messages = crud.get_interview_messages_by_session(db, session_id)
        
        # Get interview result
        result = crud.get_interview_result_by_session(db, session_id)
        
        # Get performance metrics (eye metrics)
        performance_metrics = db.query(EyeMetric).filter(
            EyeMetric.user_id == user_id,
            EyeMetric.session_id == session_id,
            EyeMetric.is_auto_save == False
        ).first()
        
        return schemas.InterviewReviewResponse(
            success=True,
            session=session,
            messages=messages,
            result=result,
            performance_metrics=performance_metrics
        )
        
    except Exception as e:
        print(f"Error getting interview review: {e}")
        return schemas.InterviewReviewResponse(
            success=False,
            session=None,
            messages=[],
            result=None,
            performance_metrics=None,
            error=f'Internal server error: {str(e)}'
        )

@router.post("/save-interview-result")
def save_interview_result(
    request: Request,
    result_data: schemas.InterviewResultCreate,
    db: Session = Depends(get_db)
):
    """
    Save interview result with performance scores and feedback.
    """
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get('user_id')
        
        if not user_id:
            return {"success": False, "error": "User not logged in"}
        
        # Ensure user exists in database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Auto-create user if they don't exist
            email = user_details.get("email")
            if not email:
                return {"success": False, "error": "Cannot create user: missing email"}
            
            name = user_details.get("name") or "No Name"
            username = email.split('@')[0] if '@' in email else f"user_{user_id[:8]}"
            
            new_user = schemas.UserCreate(
                id=user_id,
                email=email,
                username=username,
                name=name,
                password=None
            )
            try:
                user = crud.create_user(db, new_user)
                print(f"[DEBUG] Auto-created user {user_id} in save-interview-result")
            except Exception as e:
                print(f"[DEBUG] Error creating user in save-interview-result: {e}")
                return {"success": False, "error": "Failed to create user account"}

        # Verify the session belongs to the authenticated user
        session = crud.get_interview_session_by_id(db, result_data.session_id)
        if not session:
            return {"success": False, "error": "Interview session not found"}
        
        if session.user_id != user_id:
            return {"success": False, "error": "Access denied: session does not belong to user"}

        # Save the interview result
        result = crud.create_interview_result(db, result_data)
        
        # Update the session with performance score
        crud.update_interview_session(db, result_data.session_id, {
            "performance_score": result_data.overall_score,
            "status": "completed"
        })
        
        return {"success": True, "result_id": result.id}
        
    except Exception as e:
        print(f"Error saving interview result: {e}")
        return {"success": False, "error": f"Internal server error: {str(e)}"}