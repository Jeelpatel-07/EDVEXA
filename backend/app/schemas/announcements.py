from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

class AnnouncementCreate(BaseModel):
    title: str = Field(..., max_length=255)
    content: str = Field(..., min_length=1)
    category: str = "GENERAL" # MEETING, DEADLINE, CHANGE, GENERAL
    audience: str = "ALL" # ALL, MEMBERS_ONLY, VOLUNTEERS, EVENT_ATTENDEES
    is_pinned: bool = False
    publish_at: Optional[datetime] = None
    event_id: Optional[str] = None

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    audience: Optional[str] = None
    is_pinned: Optional[bool] = None
    publish_at: Optional[datetime] = None

class MailingSubscribeRequest(BaseModel):
    email: EmailStr
