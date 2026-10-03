from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import text
from app.db import SessionLocal
from app.services.order_service import cancel_expired_orders

scheduler = BackgroundScheduler()

def cleanup_expired_orders_job():
    db = SessionLocal()
    try:
        cancel_expired_orders(db)
    except Exception as e:
        print(f"[JOB ERROR] cleanup_expired_orders: {e}")
    finally:
        db.close()

def membership_expiry_and_reminders_job():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        today = now.date()

        # 1. Expire memberships past end_date
        db.execute(
            text("""
                UPDATE memberships 
                SET status = 'EXPIRED', updated_at = :now 
                WHERE status = 'ACTIVE' AND end_date < :today
            """),
            {"now": now, "today": today}
        )

        # 2. Queue renewal reminders for 30, 7, and 1 days before expiry
        # Check intervals:
        for days in [30, 7, 1]:
            target_date = today + timedelta(days=days)
            expiring = db.execute(
                text("""
                    SELECT m.id, m.organization_id, m.user_id, m.end_date, mp.name as plan_name
                    FROM memberships m
                    JOIN membership_plans mp ON mp.id = m.plan_id
                    WHERE m.status = 'ACTIVE' AND m.end_date = :tdate
                """),
                {"tdate": target_date}
            ).mappings().all()

            for m in expiring:
                # Check if notification already queued today for this user
                already_notified = db.execute(
                    text("""
                        SELECT 1 FROM notifications 
                        WHERE user_id = :uid AND organization_id = :oid AND type = 'RENEWAL_REMINDER' 
                          AND created_at >= :today_start
                    """),
                    {"uid": m["user_id"], "oid": m["organization_id"], "today_start": now - timedelta(hours=24)}
                ).scalar()

                if not already_notified:
                    db.execute(
                        text("""
                            INSERT INTO notifications (organization_id, user_id, title, message, type, channel, status, created_at)
                            VALUES (:oid, :uid, 'Membership Renewal Reminder', :msg, 'RENEWAL_REMINDER', 'IN_APP', 'SENT', :now)
                        """),
                        {
                            "oid": m["organization_id"],
                            "uid": m["user_id"],
                            "msg": f"Your {m['plan_name']} membership expires in {days} day{'s' if days > 1 else ''} (on {m['end_date']}). Renew now to maintain your member discounts!",
                            "now": now
                        }
                    )

        db.commit()
    except Exception as e:
        print(f"[JOB ERROR] membership_expiry_and_reminders: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(cleanup_expired_orders_job, "interval", minutes=1, id="cleanup_expired_orders", replace_existing=True)
    scheduler.add_job(membership_expiry_and_reminders_job, "interval", minutes=60, id="membership_expiry_and_reminders", replace_existing=True)
    scheduler.start()

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
