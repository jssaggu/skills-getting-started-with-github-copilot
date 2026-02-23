import copy

import httpx
import pytest

from src import app as app_module
from src.app import app


@pytest.fixture(autouse=True)
def reset_activities():
    """Arrange: snapshot and restore the in-memory activities between tests.
    This keeps tests isolated (AAA: Arrange).
    """
    original = copy.deepcopy(app_module.activities)
    yield
    app_module.activities = copy.deepcopy(original)


@pytest.fixture
def client():
    # Act/Assert helper: a test client bound to the FastAPI app
    with httpx.Client(app=app, base_url="http://test") as c:
        yield c


def test_get_activities_returns_expected_shape(client):
    # Arrange: default activities exist (reset_activities fixture)

    # Act
    resp = client.get("/activities")

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_post_signup_adds_participant(client):
    # Arrange
    activity = "Chess Club"
    email = "tester@mergington.edu"

    # Act
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})

    # Assert
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")

    # Confirm participant present
    get_resp = client.get("/activities")
    participants = get_resp.json()[activity]["participants"]
    assert email in participants


def test_delete_unregister_removes_participant(client):
    # Arrange: sign someone up first
    activity = "Programming Class"
    email = "remove_me@mergington.edu"

    post = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert post.status_code == 200

    # Act: remove them
    delete = client.delete(f"/activities/{activity}/signup", params={"email": email})

    # Assert
    assert delete.status_code == 200
    assert "Unregistered" in delete.json().get("message", "")

    # Confirm participant removed
    get_resp = client.get("/activities")
    participants = get_resp.json()[activity]["participants"]
    assert email not in participants
