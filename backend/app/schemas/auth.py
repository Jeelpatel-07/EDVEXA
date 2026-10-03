from typing import Annotated
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, AliasChoices, AfterValidator

def password_bytes(value):
    if len(value.encode("utf-8"))>72:
        raise ValueError("Password must fit in 72 UTF-8 bytes")
    return value
Password = Annotated[str,Field(min_length=8,max_length=72),AfterValidator(password_bytes)]
class StrictModel(BaseModel):
    model_config=ConfigDict(extra="forbid",populate_by_name=True)
class RegisterRequest(StrictModel):
    full_name:str=Field(min_length=2,max_length=120,validation_alias=AliasChoices("full_name","name"))
    email:EmailStr
    password:Password
    student_id:str|None=Field(None,max_length=60)
    join_code:str|None=Field(None,max_length=50)
    role:str|None=Field(None,max_length=50)
class LoginRequest(StrictModel):
    email:EmailStr
    password:str=Field(min_length=1,max_length=128)
class SelectOrgRequest(StrictModel):
    organization_id:UUID
class JoinOrgRequest(StrictModel):
    join_code:str=Field(min_length=1,max_length=50)
    student_id:str|None=Field(None,max_length=60)
class ForgotPasswordRequest(StrictModel):
    email:EmailStr
class TokenRequest(StrictModel):
    token:str=Field(min_length=40,max_length=128)
class ResetPasswordRequest(TokenRequest):
    new_password:Password
class ChangePasswordRequest(StrictModel):
    current_password:str=Field(min_length=1,max_length=128,validation_alias=AliasChoices("current_password","old_password"))
    new_password:Password
class AcceptInviteRequest(TokenRequest):
    password:Password|None=None
    full_name:str|None=Field(None,min_length=2,max_length=120)
class ProfileUpdate(StrictModel):
    full_name:str=Field(min_length=2,max_length=120)
    phone:str|None=Field(None,max_length=30)
