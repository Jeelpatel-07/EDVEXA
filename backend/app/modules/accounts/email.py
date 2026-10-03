import base64
import hashlib
import hmac
import json
import smtplib
import ssl
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage
from urllib.parse import quote
from uuid import UUID

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.modules.accounts.models import AuthEmail


def email_cipher(settings: Settings) -> Fernet:
    if settings.auth_email_encryption_key:
        return Fernet(settings.auth_email_encryption_key.get_secret_value().encode())
    # Domain-separated development fallback; production requires a separate key.
    derived = hmac.new(
        settings.jwt_secret_key.get_secret_value().encode(),
        b"edvexa:auth-email-encryption:v1",
        hashlib.sha256,
    ).digest()
    return Fernet(base64.urlsafe_b64encode(derived))


def queue_auth_email(
    db: Session,
    settings: Settings,
    *,
    user_id: UUID,
    email: str,
    kind: str,
    token: str,
    expires_at: datetime,
) -> None:
    path = "verify-email" if kind == "VERIFY_EMAIL" else "reset-password"
    # Fragment keeps the token out of HTTP URLs and web server access logs.
    link = f"{settings.frontend_base_url.rstrip('/')}/{path}#token={quote(token, safe='')}"
    subject = "Verify your EDVEXA email" if kind == "VERIFY_EMAIL" else "Reset your EDVEXA password"
    body = (
        f"{subject}\n\nOpen this link:\n{link}\n\n"
        f"Expires at {expires_at.isoformat()}.\n"
        "If you did not request this, you can ignore this email."
    )
    payload = json.dumps({"recipient": email, "subject": subject, "body": body}).encode()
    db.add(
        AuthEmail(
            user_id=user_id,
            kind=kind,
            encrypted_payload=email_cipher(settings).encrypt(payload).decode(),
            expires_at=expires_at,
            next_attempt_at=datetime.now(UTC),
        )
    )


def send_smtp(settings: Settings, payload: dict[str, str]) -> None:
    if not settings.smtp_host:
        raise ValueError("SMTP_HOST is not configured")
    message = EmailMessage()
    message["From"] = str(settings.smtp_from_email)
    message["To"] = payload["recipient"]
    message["Subject"] = payload["subject"]
    message.set_content(payload["body"])
    transport = smtplib.SMTP_SSL if settings.smtp_security == "ssl" else smtplib.SMTP
    kwargs = {"timeout": settings.smtp_timeout_seconds}
    if settings.smtp_security == "ssl":
        kwargs["context"] = ssl.create_default_context()
    with transport(settings.smtp_host, settings.smtp_port, **kwargs) as client:
        if settings.smtp_security == "starttls":
            client.starttls(context=ssl.create_default_context())
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password.get_secret_value())
        refused = client.send_message(message)
        if refused:
            raise smtplib.SMTPException("Recipient rejected")


def deliver_pending_emails(
    factory: sessionmaker[Session],
    settings: Settings,
    *,
    batch_size: int = 20,
    sender: Callable[[Settings, dict[str, str]], None] = send_smtp,
) -> dict[str, int]:
    """Bounded batch; PostgreSQL locks prevent simultaneous worker delivery.

    At least once: a crash after SMTP acceptance but before commit can retry.
    No messages are sent automatically from requests or application startup.
    """
    totals = {"sent": 0, "failed": 0, "cancelled": 0}
    for _ in range(batch_size):
        with factory.begin() as db:
            now = datetime.now(UTC)
            row = db.scalar(
                select(AuthEmail)
                .where(
                    AuthEmail.sent_at.is_(None),
                    AuthEmail.cancelled_at.is_(None),
                    AuthEmail.next_attempt_at <= now,
                )
                .order_by(AuthEmail.next_attempt_at, AuthEmail.id)
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            if row is None:
                break
            expiry = row.expires_at
            if expiry.tzinfo is None:  # SQLite tests return naive datetimes.
                expiry = expiry.replace(tzinfo=UTC)
            if expiry <= now or row.attempts >= settings.auth_email_max_attempts:
                row.cancelled_at = now
                row.encrypted_payload = None
                totals["cancelled"] += 1
                continue
            row.attempts += 1
            try:
                if row.encrypted_payload is None:
                    raise ValueError("Missing encrypted payload")
                payload = json.loads(email_cipher(settings).decrypt(row.encrypted_payload.encode()))
                sender(settings, payload)
            except (InvalidToken, ValueError, OSError, smtplib.SMTPException) as exc:
                row.last_error = type(exc).__name__
                if row.attempts >= settings.auth_email_max_attempts:
                    row.cancelled_at = now
                    row.encrypted_payload = None
                else:
                    row.next_attempt_at = now + timedelta(seconds=min(3600, 30 * 2**row.attempts))
                totals["failed"] += 1
            else:
                row.sent_at = now
                row.last_error = None
                row.encrypted_payload = None
                totals["sent"] += 1
    return totals
