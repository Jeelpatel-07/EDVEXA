"""Deliver queued auth emails in a bounded batch or a polling loop."""
import argparse
import time

from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.db.session import build_engine, build_session_factory
from app.modules.accounts.email import deliver_pending_emails


def main() -> int:
    parser = argparse.ArgumentParser(description="Deliver queued verification/reset emails")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--watch", action="store_true", help="Poll until interrupted")
    parser.add_argument("--interval", type=int, default=5)
    args = parser.parse_args()
    if not 1 <= args.limit <= 100:
        parser.error("--limit must be between 1 and 100")
    if not 1 <= args.interval <= 300:
        parser.error("--interval must be between 1 and 300 seconds")
    settings = get_settings()
    if not settings.smtp_host:
        print("Set SMTP_HOST and mail settings in .env before delivering emails.")
        return 1
    engine = build_engine(settings)
    try:
        while True:
            totals = deliver_pending_emails(
                build_session_factory(engine), settings, batch_size=args.limit
            )
            if any(totals.values()) or not args.watch:
                print(
                    f"Sent: {totals['sent']}; failed: {totals['failed']}; "
                    f"cancelled: {totals['cancelled']}"
                )
            if not args.watch:
                return 1 if totals["failed"] else 0
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("Email delivery stopped.")
        return 0
    except SQLAlchemyError:
        print("Database unavailable. Check PostgreSQL and apply the account migration.")
        return 1
    finally:
        engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
