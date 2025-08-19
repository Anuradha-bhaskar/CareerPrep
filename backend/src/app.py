# src/app.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ✅ Always use absolute imports because `src` is your module root
from src.routes import users, resumes, practice, performance, career_recommendations

app = FastAPI()

# ✅ Mount static files for uploaded resumes
app.mount("/static", StaticFiles(directory="static"), name="static")

# ✅ CORS for cross-origin requests — required if frontend runs on localhost:5173 etc.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 🔒 In prod, put your frontend URL only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Register all your routers with API prefixes
app.include_router(users.router, prefix="/api/users")
app.include_router(resumes.router, prefix="/api/resumes")
app.include_router(practice.router, prefix="/api/practice")
app.include_router(performance.router, prefix="/api/performance")
app.include_router(career_recommendations.router, prefix="/api/career-recommendations")