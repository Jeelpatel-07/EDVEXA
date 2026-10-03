import logging
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from time import monotonic
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.db import engine

log=logging.getLogger("edvexa")
SCHEMA_VERSION="2026.10.recovery.1"


def database_diagnostic():
    try:
        with engine.connect() as db:
            db.execute(text("SELECT 1"))
            info=dict(db.execute(text("SELECT current_database() AS database, version() AS server_version")).mappings().one())
            info["tables"]=db.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).scalar()
            info["roles"]=db.execute(text("SELECT count(*) FROM roles")).scalar()
            info["users"]=db.execute(text("SELECT count(*) FROM users")).scalar()
            version=db.execute(text("SELECT value FROM platform_settings WHERE key='schema_version'")).scalar()
            guard=db.execute(text("SELECT count(*) FROM pg_trigger WHERE tgname='trg_guard_platform_admin' AND NOT tgisinternal AND tgenabled='O'")).scalar()
            if info["roles"]!=6 or info["tables"]!=42 or version!=SCHEMA_VERSION or guard!=1:
                return False,{"detail":"Schema mismatch. Back up the database; run backend/database/edvexa_complete.sql on a separate empty database.","code":"SCHEMA_MISMATCH",**info}
            return True,{"status":"ready","schema_version":version,**info}
    except SQLAlchemyError as exc:
        code=getattr(getattr(exc,"orig",None),"sqlstate",None)
        message=str(getattr(exc,"orig",exc)).lower()
        if code=="28P01" or "password authentication failed" in message:
            cause="PostgreSQL rejected the credentials; check DATABASE_URL username/password."
        elif code=="3D000" or "does not exist" in message and "database" in message:
            cause="Database does not exist; create the database named in DATABASE_URL."
        elif code in ("42P01","42703"):
            cause="Required schema is missing. Run backend/database/edvexa_complete.sql on an empty database."
        elif "ssl" in message or "pg_hba" in message:
            cause="Check SSL requirements (sslmode=require) and the server pg_hba.conf access rule."
        else:
            cause="Cannot connect to PostgreSQL. Check host/port, running service, LAN firewall and listen_addresses."
        return False,{"detail":cause,"code":"DATABASE_UNAVAILABLE"}


@asynccontextmanager
async def lifespan(application):
    ready,details=database_diagnostic()
    application.state.database_ready=ready
    if not ready:
        log.error("EDVEXA startup check: %s",details["detail"])
    if ready and settings.JOBS_ENABLED:
        from app.jobs.scheduler import start_scheduler
        start_scheduler()
    yield
    if ready and settings.JOBS_ENABLED:
        from app.jobs.scheduler import shutdown_scheduler
        shutdown_scheduler()
    engine.dispose()


app=FastAPI(title="EDVEXA",version="1.0.0",lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["Authorization","Content-Type","X-CSRF-Token","Idempotency-Key"],
    expose_headers=["X-Request-ID","Retry-After"])
attempts=defaultdict(deque)


@app.middleware("http")
async def headers_and_limit(request:Request,call_next):
    request.state.request_id=str(uuid4())
    if request.method=="POST" and request.url.path.startswith("/api/v1/auth/"):
        key=(request.client.host if request.client else "unknown",request.url.path)
        now=monotonic()
        queue=attempts[key]
        while queue and queue[0]<now-60:
            queue.popleft()
        if len(queue)>=30:
            return JSONResponse({"detail":"Too many requests","code":"RATE_LIMITED"},429,headers={"Retry-After":"60"})
        queue.append(now)
    response=await call_next(request)
    response.headers.update({"X-Request-ID":request.state.request_id,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"})
    return response


@app.exception_handler(StarletteHTTPException)
async def http_error(request,exc):
    codes={401:"UNAUTHENTICATED",403:"FORBIDDEN",404:"NOT_FOUND",409:"CONFLICT",422:"VALIDATION_ERROR",429:"RATE_LIMITED"}
    return JSONResponse({"detail":exc.detail,"code":codes.get(exc.status_code,"REQUEST_FAILED")},exc.status_code,headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error(request,exc):
    fields=[{"field":".".join(map(str,e["loc"])),"type":e["type"]} for e in exc.errors()]
    return JSONResponse({"detail":"Check the submitted fields","code":"VALIDATION_ERROR","fields":fields},422)


@app.exception_handler(IntegrityError)
async def constraint_error(request,exc):
    return JSONResponse({"detail":"This operation conflicts with an existing record or organization rule","code":"CONFLICT"},409)


@app.exception_handler(SQLAlchemyError)
async def db_error(request,exc):
    log.error("Database operation failed type=%s request=%s",type(exc).__name__,request.state.request_id)
    return JSONResponse({"detail":"Database operation unavailable; check /health/db","code":"DATABASE_ERROR"},503)


@app.exception_handler(Exception)
async def internal_error(request,exc):
    log.error("Unhandled error type=%s request=%s",type(exc).__name__,request.state.request_id)
    return JSONResponse({"detail":"Unexpected server error","code":"INTERNAL_ERROR"},500)


@app.get("/health")
def health():
    return {"status":"alive","service":"EDVEXA"}


@app.get("/health/db")
def health_db():
    ready,result=database_diagnostic()
    return JSONResponse(jsonable_encoder(result),200 if ready else 503)


from app.routers import workspace,auth,platform,org_admin,membership,events,tickets,orders,store,announcements,fundraisers,finance,public
for module in (workspace,auth,platform,org_admin,membership,events,tickets,orders,store,announcements,fundraisers,finance,public):
    app.include_router(module.router,prefix="/api/v1")
