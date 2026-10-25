from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.main import app
from app.models import User


@pytest.fixture(scope="session")
def test_engine() -> Iterator[Engine]:
    settings = get_settings()
    if not settings.test_database_url:
        pytest.fail("Set TEST_DATABASE_URL to the wheeldeal_test PostgreSQL database")

    url = make_url(settings.test_database_url)
    if url.get_backend_name() != "postgresql" or url.database != "wheeldeal_test":
        pytest.fail("TEST_DATABASE_URL must point to the wheeldeal_test PostgreSQL database")
    if url == make_url(settings.database_url):
        pytest.fail("TEST_DATABASE_URL must differ from DATABASE_URL")

    engine = create_engine(settings.test_database_url)
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    User.metadata.create_all(bind=engine)
    yield engine
    User.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(test_engine: Engine) -> Iterator[Session]:
    with test_engine.connect() as connection:
        outer_transaction = connection.begin()
        with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
            yield session
        outer_transaction.rollback()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
