from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, text

from app.db.session import build_session_factory, get_db


@pytest.fixture
def database_request():
    # SQLite exercises SQLAlchemy transaction ownership only, not PostgreSQL schema rules.
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE sample (id INTEGER PRIMARY KEY)"))
    factory = build_session_factory(engine)
    request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(session_factory=factory)))
    yield request
    engine.dispose()


def count_rows(request):
    with request.app.state.session_factory() as session:
        return session.scalar(text("SELECT COUNT(*) FROM sample"))


def test_dependency_does_not_commit(database_request):
    generator = get_db(database_request)
    session = next(generator)
    session.execute(text("INSERT INTO sample VALUES (1)"))
    with pytest.raises(StopIteration):
        next(generator)
    assert count_rows(database_request) == 0


def test_service_commit_is_preserved(database_request):
    generator = get_db(database_request)
    session = next(generator)
    session.execute(text("INSERT INTO sample VALUES (1)"))
    session.commit()
    with pytest.raises(StopIteration):
        next(generator)
    assert count_rows(database_request) == 1


def test_exception_rolls_back(database_request):
    generator = get_db(database_request)
    session = next(generator)
    session.execute(text("INSERT INTO sample VALUES (1)"))
    with pytest.raises(RuntimeError):
        generator.throw(RuntimeError("service failed"))
    assert count_rows(database_request) == 0
