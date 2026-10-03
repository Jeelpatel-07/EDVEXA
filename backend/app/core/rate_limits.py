import math
import time
from dataclasses import dataclass
from hashlib import sha256
from threading import Lock
from typing import Protocol

from fastapi import Request
from redis import Redis
from redis.exceptions import RedisError

from app.core.config import Settings
from app.core.errors import AppError


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int


class RateLimiter(Protocol):
    """Common interface for memory and Redis implementations."""

    def check(
        self,
        key: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> RateLimitDecision: ...

    def close(self) -> None: ...


def validate_policy(
    limit: int,
    window_seconds: int,
) -> None:
    if limit < 1 or window_seconds < 1:
        raise ValueError(
            "Rate limit and window must be positive"
        )


class MemoryRateLimiter:
    """Fixed-window limiter for single-process development."""

    def __init__(self) -> None:
        self._buckets: dict[str, tuple[int, float]] = {}
        self._lock = Lock()
        self._next_cleanup = 0.0

    def check(
        self,
        key: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> RateLimitDecision:
        validate_policy(limit, window_seconds)
        now = time.monotonic()

        with self._lock:
            if now >= self._next_cleanup:
                self._buckets = {
                    bucket_key: value
                    for bucket_key, value in self._buckets.items()
                    if value[1] > now
                }
                self._next_cleanup = now + 60

            count, expiry = self._buckets.get(
                key,
                (0, now + window_seconds),
            )

            if expiry <= now:
                count = 0
                expiry = now + window_seconds

            if count >= limit:
                return RateLimitDecision(
                    allowed=False,
                    retry_after_seconds=max(
                        1,
                        math.ceil(expiry - now),
                    ),
                )

            self._buckets[key] = (count + 1, expiry)

            return RateLimitDecision(
                allowed=True,
                retry_after_seconds=0,
            )

    def close(self) -> None:
        with self._lock:
            self._buckets.clear()


# Increment and expiry are executed atomically in Redis.
REDIS_FIXED_WINDOW = """
local count = redis.call('INCR', KEYS[1])

if count == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
end

return {count, redis.call('PTTL', KEYS[1])}
"""


class RedisRateLimiter:
    """Shared fixed-window limiter for multiple backend processes."""

    def __init__(
        self,
        client: Redis,
        prefix: str,
    ) -> None:
        self.client = client
        self.prefix = prefix
        self._check = client.register_script(
            REDIS_FIXED_WINDOW
        )

    def check(
        self,
        key: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> RateLimitDecision:
        validate_policy(limit, window_seconds)

        # Avoid storing raw emails or IP addresses in Redis key names.
        digest = sha256(key.encode("utf-8")).hexdigest()

        try:
            count, ttl = self._check(
                keys=[
                    f"{self.prefix}:rate:{digest}"
                ],
                args=[
                    window_seconds * 1000
                ],
            )
        except RedisError as exc:
            raise AppError(
                status_code=503,
                code="RATE_LIMIT_UNAVAILABLE",
                message="Please try again later",
            ) from exc

        allowed = int(count) <= limit

        return RateLimitDecision(
            allowed=allowed,
            retry_after_seconds=(
                0
                if allowed
                else max(
                    1,
                    math.ceil(int(ttl) / 1000),
                )
            ),
        )

    def close(self) -> None:
        self.client.close()


def build_rate_limiter(
    settings: Settings,
) -> RateLimiter:
    if settings.rate_limit_backend == "memory":
        return MemoryRateLimiter()

    client = Redis.from_url(
        settings.redis_url.get_secret_value(),
        socket_connect_timeout=2,
        socket_timeout=2,
        decode_responses=True,
    )

    return RedisRateLimiter(
        client=client,
        prefix=settings.rate_limit_prefix,
    )


def enforce_rate_limit(
    request: Request,
    *,
    scope: str,
    subject: str,
    limit: int,
    window_seconds: int,
) -> None:
    """Reject the request when its configured limit is exceeded."""
    key = (
        f"{scope}:{subject}:{limit}:{window_seconds}"
    )

    decision = request.app.state.rate_limiter.check(
        key,
        limit=limit,
        window_seconds=window_seconds,
    )

    if not decision.allowed:
        raise AppError(
            status_code=429,
            code="RATE_LIMITED",
            message=(
                "Too many attempts. Please try again later."
            ),
            headers={
                "Retry-After": str(
                    decision.retry_after_seconds
                )
            },
        )


def client_ip(request: Request) -> str:
    """Read the client address provided by the server."""
    # Configure trusted proxies in Uvicorn before using forwarded IPs.
    # Never read a user-supplied X-Forwarded-For header directly.
    return (
        request.client.host
        if request.client
        else "unknown"
    )