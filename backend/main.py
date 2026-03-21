from fastapi import fastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, builds, devices

app = FastAPI(title ="BuildLab API")

app.add_middleware(
    CORSMiddleware,
    allow_origins =["http://localhost:5173"]   #React dev server
    allow_credentials= True,
    allow_methods = ["*"],
    allow_headers={"*"},
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(devices.router, prefix="/devices",tags=["devices"])
app.include_router(builds.router, prefix="/builds", tags=["builds"])