import copy

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


# Snapshot the initial activities so tests can reset state.
_ORIGINAL_ACTIVITIES = copy.deepcopy(activities)


@pytest.fixture(autouse=True)
def reset_activities():
    """Arrange: reset the in-memory `activities` before each test to avoid interference."""
    activities.clear()
    activities.update(copy.deepcopy(_ORIGINAL_ACTIVITIES))
    yield


def test_get_activities_returns_all_activities():
    # Arrange
    client = TestClient(app)

    # Act
    resp = client.get("/activities")

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    # Must include at least the Chess Club and Programming Class keys
    assert "Chess Club" in data
    assert "Programming Class" in data


def test_post_signup_adds_participant_and_prevents_duplicates():
    # Arrange
    client = TestClient(app)
    activity_name = "Chess Club"
    new_email = "tester@mergington.edu"

    # Act: sign up the user
    resp = client.post(f"/activities/{activity_name}/signup?email={new_email}")

    # Assert signup succeeded
    assert resp.status_code == 200
    assert f"Signed up {new_email}" in resp.json().get("message", "")

    # Act: fetch activities and confirm participant present
    resp2 = client.get("/activities")
    assert resp2.status_code == 200
    participants = resp2.json()[activity_name]["participants"]
    assert new_email in participants

    # Act: try signing up same email again
    resp3 = client.post(f"/activities/{activity_name}/signup?email={new_email}")

    # Assert duplicate rejected
    assert resp3.status_code == 400


def test_delete_unregister_removes_participant():
    # Arrange
    client = TestClient(app)
    activity_name = "Chess Club"
    # Use an existing participant from the original snapshot
    existing = _ORIGINAL_ACTIVITIES[activity_name]["participants"][0]

    # Act: delete/unregister
    resp = client.delete(f"/activities/{activity_name}/signup?email={existing}")

    # Assert
    assert resp.status_code == 200
    assert f"Unregistered {existing}" in resp.json().get("message", "")

    # Confirm participant removed
    resp2 = client.get("/activities")
    assert resp2.status_code == 200
    assert existing not in resp2.json()[activity_name]["participants"]
