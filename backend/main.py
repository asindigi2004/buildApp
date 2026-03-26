from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, builds, devices
from database import Base, engine
import models

app = FastAPI(title="BuildLab API")

# Create tables with error handling
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully")
except Exception as e:
    print(f"❌ Table creation failed: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://build-app-alpha.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(devices.router, prefix="/devices", tags=["devices"])
app.include_router(builds.router, prefix="/builds", tags=["builds"])