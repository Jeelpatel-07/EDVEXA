from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.jobs.scheduler import start_scheduler, shutdown_scheduler

# Routers
from app.routers import (
    auth, platform, org_admin, membership,
    events, tickets, orders, store, announcements,
    fundraisers, finance, public
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start APScheduler background jobs
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()

app = FastAPI(
    title="EDVEXA API",
    description="Multi-tenant SaaS backend for collegiate student organizations, events, memberships, and treasury management.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for receipts and product uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Standardized Error Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = "ERROR"
    if exc.status_code == 401:
        code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        code = "FORBIDDEN"
    elif exc.status_code == 404:
        code = "NOT_FOUND"
    elif exc.status_code == 422:
        code = "UNPROCESSABLE_ENTITY"
    elif exc.status_code == 429:
        code = "RATE_LIMITED"

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": code}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Extract error message cleanly
    errors = exc.errors()
    msg = errors[0].get("msg") if errors else "Validation failed"
    loc = " -> ".join([str(l) for l in errors[0].get("loc", [])]) if errors else ""
    detail = f"{loc}: {msg}" if loc else msg

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": detail, "code": "VALIDATION_ERROR"}
    )

# Include API v1 Routers
api_v1_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(platform.router, prefix=api_v1_prefix)
app.include_router(org_admin.router, prefix=api_v1_prefix)
app.include_router(membership.router, prefix=api_v1_prefix)
app.include_router(events.router, prefix=api_v1_prefix)
app.include_router(tickets.router, prefix=api_v1_prefix)
app.include_router(orders.router, prefix=api_v1_prefix)
app.include_router(store.router, prefix=api_v1_prefix)
app.include_router(announcements.router, prefix=api_v1_prefix)
app.include_router(fundraisers.router, prefix=api_v1_prefix)
app.include_router(finance.router, prefix=api_v1_prefix)
app.include_router(public.router, prefix=api_v1_prefix)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "EDVEXA API"}
