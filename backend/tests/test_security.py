from datetime import UTC, datetime
from uuid import uuid4

import jwt
import pytest
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.security import (
    InvalidAccessToken,
    create_access_token,
    decode_access_token,
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
    password_needs_rehash,
    verify_password,
)


def test_argon2_password_hashing():
    first = hash_password("example password")
    second = hash_password("example password")
    assert first.startswith("$argon2id$")
    assert first != second
    assert verify_password("example password", first)
    assert not verify_password("wrong password", first)
    assert not verify_password("example password", "not-a-hash")
    assert not password_needs_rehash(first)


def test_opaque_tokens_are_unique_and_stored_as_digest():
    first, second = generate_opaque_token(), generate_opaque_token()
    assert first != second
    digest = hash_opaque_token(first)
    assert len(digest) == 64
    assert digest != first
    assert hash_opaque_token(first) == digest


def test_outdated_argon2_parameters_require_rehash():
    old_hash = Argon2Hasher(time_cost=1, memory_cost=8192, parallelism=1).hash(
        "example password"
    )
    assert verify_password("example password", old_hash)
    assert password_needs_rehash(old_hash)


def test_access_token_roundtrip_and_global_scope(settings):
    user_id, session_id = uuid4(), uuid4()
    token = create_access_token(user_id, session_id, settings=settings)
    claims = decode_access_token(token, settings=settings)
    assert claims.sub == user_id
    assert claims.sid == session_id
    assert claims.exp - claims.iat == 15 * 60
    payload = jwt.decode(token, options={"verify_signature": False})
    assert "organization_id" not in payload
    assert "roles" not in payload
    assert decode_access_token(
        create_access_token(user_id, session_id, settings=settings), settings=settings
    ).jti != claims.jti


@pytest.mark.parametrize("change", [
    {"exp": 1},
    {"iat": 9999999999},
    {"aud": "another-application"},
    {"iss": "another-issuer"},
    {"token_type": "refresh"},
    {"sub": "not-a-uuid"},
    {"sid": "not-a-uuid"},
    {"roles": ["ORG_ADMIN"]},
    {"exp": None},
])
def test_reject_invalid_claims(settings, change):
    payload = jwt.decode(
        create_access_token(uuid4(), uuid4(), settings=settings),
        options={"verify_signature": False},
    )
    payload.update(change)
    token = jwt.encode(payload, settings.jwt_secret_key.get_secret_value(), algorithm="HS256")
    with pytest.raises(InvalidAccessToken):
        decode_access_token(token, settings=settings)


def test_missing_claim_and_wrong_signature(settings):
    now = int(datetime.now(UTC).timestamp())
    token = jwt.encode(
        {"sub": str(uuid4()), "iat": now, "exp": now + 60},
        settings.jwt_secret_key.get_secret_value(), algorithm="HS256",
    )
    with pytest.raises(InvalidAccessToken):
        decode_access_token(token, settings=settings)
    valid = create_access_token(uuid4(), uuid4(), settings=settings)
    wrong_settings = settings.model_copy(update={"jwt_audience": "different"})
    with pytest.raises(InvalidAccessToken):
        decode_access_token(valid, settings=wrong_settings)
    forged = jwt.encode(
        jwt.decode(valid, options={"verify_signature": False}), "z" * 48, algorithm="HS256"
    )
    with pytest.raises(InvalidAccessToken):
        decode_access_token(forged, settings=settings)
