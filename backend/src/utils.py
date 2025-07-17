from fastapi import HTTPException
from clerk_backend_api import Clerk, AuthenticateRequestOptions
import os
from dotenv import load_dotenv

load_dotenv()

clerk_sdk = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))

def authenticate_and_get_user_details(request):
    print("🔑 Starting authentication...")

    try:
        request_state = clerk_sdk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                authorized_parties=["http://localhost:5173"],
                jwt_key=os.getenv("JWT_KEY")
            )
        )

        if not request_state.is_signed_in:
            print("❌ Not signed in")
            raise HTTPException(status_code=401, detail="Invalid token")

        payload = request_state.payload
        print(f"✅ Clerk payload: {payload}")

        user_id = payload.get("sub")
        email = payload.get("email_address")  # 👈 Comes from your JWT template!
        name = payload.get("name")  # Optional

        if not email:
            print("🚨 Clerk JWT missing email!")
            raise HTTPException(status_code=400, detail="Email is missing in Clerk JWT")

        return {
            "user_id": user_id,
            "email": email,
            "name": name or ""
        }

    except Exception as e:
        print(f"🔥 Exception during authentication: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
