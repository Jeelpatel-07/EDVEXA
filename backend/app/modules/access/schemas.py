from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import EmailStr, Field, SecretStr, field_validator, model_validator

from app.modules.accounts.schemas import AccountInput, EmailRequest, TokenRequest

StaffRole = Literal["TREASURER", "EVENT_MANAGER", "GATE_STAFF", "VOLUNTEER"]


class NamedInput(AccountInput):
    @field_validator("name", check_fields=False)
    @classmethod
    def clean_name(cls, value):
        if value is None:
            return value
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Name must contain at least two characters")
        return value


class OrganizationCreate(NamedInput):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    join_code: str = Field(default="", max_length=32, pattern=r"^[A-Z0-9-]*$")
    member_number_prefix: str = Field(
        default="EDV", min_length=1, max_length=12, pattern=r"^[A-Z0-9]+$"
    )
    admin_email: EmailStr


class OrganizationPatch(NamedInput):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    member_number_prefix: str | None = Field(
        default=None, min_length=1, max_length=12, pattern=r"^[A-Z0-9]+$"
    )


class SelectOrganization(AccountInput):
    organization_id: UUID


class JoinOrganization(AccountInput):
    join_code: str = Field(min_length=1, max_length=32)
    student_id: str | None = Field(default=None, min_length=1, max_length=80)


class InviteAdmin(EmailRequest):
    organization_id: UUID


class InviteStaff(EmailRequest):
    role_code: StaffRole


class AcceptInvitation(TokenRequest):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    password: SecretStr | None = Field(default=None, min_length=15, max_length=128)

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value):
        if value is None:
            return value
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Full name must contain at least two characters")
        return value


class RolesUpdate(AccountInput):
    roles: list[StaffRole] = Field(max_length=4)


class AssignRole(AccountInput):
    role_code: StaffRole


class UserStatus(AccountInput):
    status: Literal["ACTIVE", "SUSPENDED"]


class StatusReason(AccountInput):
    reason: str = Field(default="", max_length=500)


class TermCreate(NamedInput):
    name: str = Field(min_length=2, max_length=120)
    starts_on: date
    ends_on: date

    @model_validator(mode="after")
    def valid_dates(self):
        if self.ends_on < self.starts_on:
            raise ValueError("Term end must follow its start")
        return self


class ChangePassword(AccountInput):
    current_password: SecretStr = Field(min_length=1, max_length=128)
    new_password: SecretStr = Field(min_length=15, max_length=128)
