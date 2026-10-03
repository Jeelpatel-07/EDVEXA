from concurrent.futures import ThreadPoolExecutor

import pytest
from redis.exceptions import ConnectionError

from app.core.errors import AppError
from app.core.rate_limits import MemoryRateLimiter, RedisRateLimiter


def test_memory_expiry_and_subject_isolation(monkeypatch):
    clock = [100.0]
    monkeypatch.setattr("app.core.rate_limits.time.monotonic", lambda: clock[0])
    limiter = MemoryRateLimiter()
    assert limiter.check("alice", limit=1, window_seconds=10).allowed
    blocked = limiter.check("alice", limit=1, window_seconds=10)
    assert not blocked.allowed and blocked.retry_after_seconds == 10
    assert limiter.check("bob", limit=1, window_seconds=10).allowed
    clock[0] = 111.0
    assert limiter.check("alice", limit=1, window_seconds=10).allowed


def test_memory_concurrent_requests_cannot_exceed_limit():
    limiter = MemoryRateLimiter()
    with ThreadPoolExecutor(max_workers=10) as executor:
        decisions = list(executor.map(
            lambda _: limiter.check("same-ip", limit=5, window_seconds=60), range(50)
        ))
    assert sum(decision.allowed for decision in decisions) == 5


def test_invalid_policy():
    with pytest.raises(ValueError):
        MemoryRateLimiter().check("key", limit=0, window_seconds=60)


def test_redis_key_hides_subject_and_handles_ttl():
    captured = {}
    class FakeRedis:
        def register_script(self, script):
            assert "PEXPIRE" in script
            def call(**kwargs):
                captured.update(kwargs)
                return [6, 1200]
            return call
        def close(self):
            pass
    limiter = RedisRateLimiter(FakeRedis(), "edvexa")
    decision = limiter.check("person@example.com", limit=5, window_seconds=60)
    assert not decision.allowed
    assert decision.retry_after_seconds == 2
    assert "person@example.com" not in captured["keys"][0]
    assert captured["args"] == [60000]


def test_redis_failure_does_not_silently_allow_authentication():
    class BrokenRedis:
        def register_script(self, script):
            def call(**kwargs):
                raise ConnectionError("redis-secret")
            return call
    with pytest.raises(AppError) as caught:
        RedisRateLimiter(BrokenRedis(), "edvexa").check("ip", limit=5, window_seconds=60)
    assert caught.value.status_code == 503
    assert "redis-secret" not in caught.value.message
