from fastapi import HTTPException
from clerk_backend_api import Clerk, AuthenticateRequestOptions
import os
from dotenv import load_dotenv
import json
import tempfile
from typing import Dict
import pytesseract
from PIL import Image
import fitz


load_dotenv()

clerk_sdk = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))

def authenticate_and_get_user_details(request):
    print("🔑 Starting authentication...")
    
    # Debug: Print request headers
    print(f"🔍 Request headers: {dict(request.headers)}")
    print(f"🔍 Authorization header: {request.headers.get('authorization', 'Not found')}")

    try:
        request_state = clerk_sdk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                authorized_parties=["http://localhost:5173", "http://localhost:5174"],
                jwt_key=os.getenv("JWT_KEY")
            )
        )

        if not request_state.is_signed_in:
            print("❌ Not signed in")
            print(f"🔍 Request state: {request_state}")
            raise HTTPException(status_code=401, detail="Invalid token")

        payload = request_state.payload
        print(f"✅ Clerk payload: {payload}")

        user_id = payload.get("sub")
        email = payload.get("email_address") or payload.get("email")  # Try both possible keys
        name = payload.get("name")  # Optional

        if not user_id:
            print("🚨 Clerk JWT missing user_id (sub)!")
            raise HTTPException(status_code=400, detail="User ID is missing in Clerk JWT")

        # Make email optional for now - it can be fetched separately if needed
        if not email:
            print("⚠️ Email not found in JWT payload - using user_id only")
            email = f"user_{user_id}@temp.local"  # Temporary email format

        return {
            "user_id": user_id,
            "email": email,
            "name": name or ""
        }

    except Exception as e:
        print(f"🔥 Exception during authentication: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def load_json_file(file_path: str) -> Dict:
    """Load data from a JSON file."""
    try:
        with open(file_path, 'r') as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error loading JSON file: {e}")
        return {}


def save_json_file(data: Dict, file_path: str) -> bool:
    """Save data to a JSON file."""
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=2)
        return True
    except Exception as e:
        print(f"Error saving file {file_path}: {e}")
        return False


def create_temp_file(content: str, suffix: str = '.txt') -> str:
    """Create a temporary file with the given content."""
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp.write(content.encode('utf-8'))
    temp.close()
    return temp.name


def read_text_file(file_path: str) -> str:
    """Read text from a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return ""


def ensure_directory(path: str) -> None:
    """Ensure a directory exists, creating it if necessary."""
    os.makedirs(path, exist_ok=True)


def validate_api_keys() -> bool:
    """Validate required API keys are present in environment."""
    required_keys = ["GOOGLE_API_KEY"]
    optional_keys = ["ELEVENLABS_API_KEY"]

    missing_keys = [key for key in required_keys if not os.getenv(key)]

    if missing_keys:
        print(f"Missing required API keys: {', '.join(missing_keys)}")
        return False

    missing_optional = [key for key in optional_keys if not os.getenv(key)]
    if missing_optional:
        print(f"Missing optional API keys: {', '.join(missing_optional)}")

    return True

def extract_text_from_pdf(pdf_path):

    global resume_text
    """Extract text from a PDF file"""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")

        # Fallback: Try to use OCR on the PDF pages
        try:
            doc = fitz.open(pdf_path)
            text = ""
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap()
                img = Image.frombytes(
                    "RGB", [pix.width, pix.height], pix.samples)
                text += pytesseract.image_to_string(img)
            return text
        except Exception as e2:
            print(f"Fallback extraction failed: {e2}")
            return ""
