"""Create the first platform administrator through a trusted operator terminal."""

import argparse
from datetime import UTC, datetime
from getpass import getpass

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.model_registry import load_models
from app.db.session import build_engine, build_session_factory
from app.modules.access.models import PlatformAdmin
from app.modules.access.service import audit
from app.modules.accounts.models import User
from app.modules.accounts.schemas import RegisterRequest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    load_models()
    engine = build_engine(get_settings())
    try:
        factory = build_session_factory(engine)
        with factory.begin() as db:
            email = args.email.strip().casefold()
            user = db.scalar(select(User).where(User.email == email).with_for_update())
            if user is None:
                password = getpass("New administrator password (15–128 characters): ")
                if getpass("Confirm password: ") != password:
                    raise ValueError("Passwords do not match")
                data = RegisterRequest(email=email, full_name=args.name, password=password)
                user = User(
                    email=str(data.email),
                    full_name=data.full_name,
                    password_hash=hash_password(password),
                    status="ACTIVE",
                    email_verified_at=datetime.now(UTC),
                )
                db.add(user)
                db.flush()
            elif user.status != "ACTIVE" or user.email_verified_at is None:
                raise ValueError("Existing account must already be active and email-verified")
            if db.get(PlatformAdmin, user.id) is None:
                db.add(PlatformAdmin(user_id=user.id))
                audit(db, user.id, "PLATFORM_ADMIN_BOOTSTRAPPED", "user", user.id)
        print("Platform administrator is ready. Sign in with the account password.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
