"""Unit tests for Azure Function email parser."""

import json
import os
from typing import Optional
from unittest.mock import MagicMock, patch

import pytest

from function_app import ReservationResponse, parse_email, health


class MockHttpRequest:
    """Mock Azure Functions HttpRequest."""

    def __init__(self, body: Optional[dict] = None, method: str = "POST"):
        self._body = body
        self.method = method

    def get_json(self) -> dict:
        if self._body is None:
            raise ValueError("No JSON body")
        return self._body


class TestReservationResponse:
    """Tests for the Pydantic model."""

    def test_valid_reservation(self):
        data = {
            "is_reservation": True,
            "date": "2024-12-23",
            "start_time": "1:30pm",
            "end_time": "3:30pm",
            "court": "North",
            "organizer": "John Smith",
            "players": ["John Smith", "Jane Doe"],
        }
        response = ReservationResponse(**data)
        assert response.is_reservation is True
        assert response.date == "2024-12-23"
        assert response.players == ["John Smith", "Jane Doe"]

    def test_not_a_reservation(self):
        data = {"is_reservation": False}
        response = ReservationResponse(**data)
        assert response.is_reservation is False
        assert response.date is None
        assert response.players is None

    def test_with_error(self):
        data = {"is_reservation": False, "error": "Could not parse email"}
        response = ReservationResponse(**data)
        assert response.error == "Could not parse email"

    def test_json_serialization(self):
        data = {
            "is_reservation": True,
            "date": "2024-12-23",
            "start_time": "1:30pm",
            "end_time": "3:30pm",
            "court": "North",
            "organizer": "John Smith",
            "players": ["John Smith", "Jane Doe"],
        }
        response = ReservationResponse(**data)
        json_str = response.model_dump_json()
        parsed = json.loads(json_str)
        assert parsed["is_reservation"] is True
        assert parsed["court"] == "North"


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    def test_health_configured(self):
        with patch.dict(
            os.environ,
            {
                "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com",
                "AZURE_OPENAI_API_KEY": "test-key",
            },
        ):
            req = MockHttpRequest(method="GET")
            response = health(req)

            assert response.status_code == 200
            body = json.loads(response.get_body())
            assert body["status"] == "ok"
            assert body["openai_configured"] is True

    def test_health_not_configured(self):
        with patch.dict(os.environ, {}, clear=True):
            # Remove any existing env vars
            os.environ.pop("AZURE_OPENAI_ENDPOINT", None)
            os.environ.pop("AZURE_OPENAI_API_KEY", None)

            req = MockHttpRequest(method="GET")
            response = health(req)

            assert response.status_code == 200
            body = json.loads(response.get_body())
            assert body["status"] == "ok"
            assert body["openai_configured"] is False


class TestParseEmailEndpoint:
    """Tests for the parse_email endpoint."""

    def test_missing_config(self):
        """Test that missing OpenAI config returns 500."""
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("AZURE_OPENAI_ENDPOINT", None)
            os.environ.pop("AZURE_OPENAI_API_KEY", None)

            req = MockHttpRequest(body={"email_text": "test"})
            response = parse_email(req)

            assert response.status_code == 500
            body = json.loads(response.get_body())
            assert "not configured" in body["error"]

    def test_invalid_json_body(self):
        """Test that invalid JSON returns 400."""
        with patch.dict(
            os.environ,
            {
                "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com",
                "AZURE_OPENAI_API_KEY": "test-key",
            },
        ):
            req = MockHttpRequest(body=None)  # Will raise ValueError
            response = parse_email(req)

            assert response.status_code == 400
            body = json.loads(response.get_body())
            assert "Invalid JSON" in body["error"]

    def test_missing_email_text(self):
        """Test that missing email_text returns 400."""
        with patch.dict(
            os.environ,
            {
                "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com",
                "AZURE_OPENAI_API_KEY": "test-key",
            },
        ):
            req = MockHttpRequest(body={"email_subject": "Test"})
            response = parse_email(req)

            assert response.status_code == 400
            body = json.loads(response.get_body())
            assert "email_text is required" in body["error"]

    @patch("function_app.AzureOpenAI")
    def test_successful_parse(self, mock_openai_class):
        """Test successful email parsing with mocked OpenAI."""
        # Setup mock
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(
            {
                "is_reservation": True,
                "date": "2024-12-23",
                "start_time": "1:30pm",
                "end_time": "3:30pm",
                "court": "North",
                "organizer": "John Smith",
                "players": ["John Smith", "Jane Doe"],
            }
        )
        mock_client.chat.completions.create.return_value = mock_response

        with patch.dict(
            os.environ,
            {
                "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com",
                "AZURE_OPENAI_API_KEY": "test-key",
            },
        ):
            req = MockHttpRequest(
                body={
                    "email_text": "Reservation for John Smith on Dec 23",
                    "email_subject": "Rally Club Reservation",
                }
            )
            response = parse_email(req)

            assert response.status_code == 200
            body = json.loads(response.get_body())
            assert body["is_reservation"] is True
            assert body["date"] == "2024-12-23"
            assert body["court"] == "North"
            assert "John Smith" in body["players"]

    @patch("function_app.AzureOpenAI")
    def test_not_a_reservation(self, mock_openai_class):
        """Test parsing non-reservation email."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(
            {"is_reservation": False}
        )
        mock_client.chat.completions.create.return_value = mock_response

        with patch.dict(
            os.environ,
            {
                "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com",
                "AZURE_OPENAI_API_KEY": "test-key",
            },
        ):
            req = MockHttpRequest(
                body={
                    "email_text": "Hey, want to play pickleball sometime?",
                    "email_subject": "Pickleball",
                }
            )
            response = parse_email(req)

            assert response.status_code == 200
            body = json.loads(response.get_body())
            assert body["is_reservation"] is False

    @patch("function_app.AzureOpenAI")
    def test_openai_error(self, mock_openai_class):
        """Test handling of OpenAI API errors."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        mock_client.chat.completions.create.side_effect = Exception("API error")

        with patch.dict(
            os.environ,
            {
                "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com",
                "AZURE_OPENAI_API_KEY": "test-key",
            },
        ):
            req = MockHttpRequest(
                body={"email_text": "Test email", "email_subject": "Test"}
            )
            response = parse_email(req)

            assert response.status_code == 500
            body = json.loads(response.get_body())
            assert "AI processing failed" in body["error"]

    @patch("function_app.AzureOpenAI")
    def test_invalid_ai_response(self, mock_openai_class):
        """Test handling of invalid JSON from OpenAI."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "not valid json"
        mock_client.chat.completions.create.return_value = mock_response

        with patch.dict(
            os.environ,
            {
                "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com",
                "AZURE_OPENAI_API_KEY": "test-key",
            },
        ):
            req = MockHttpRequest(
                body={"email_text": "Test email", "email_subject": "Test"}
            )
            response = parse_email(req)

            # Should return 200 with is_reservation=False and error
            assert response.status_code == 200
            body = json.loads(response.get_body())
            assert body["is_reservation"] is False
            assert "Failed to parse AI response" in body["error"]


class TestWithFixtures:
    """Tests using the email fixture files."""

    @pytest.fixture
    def fixtures_dir(self):
        return os.path.join(os.path.dirname(__file__), "test-fixtures")

    def load_fixture(self, fixtures_dir: str, filename: str) -> str:
        with open(os.path.join(fixtures_dir, filename)) as f:
            return f.read()

    @patch("function_app.AzureOpenAI")
    def test_simple_reservation_fixture(self, mock_openai_class, fixtures_dir):
        """Test with simple-reservation.eml fixture."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(
            {
                "is_reservation": True,
                "date": "2024-12-23",
                "start_time": "1:30pm",
                "end_time": "3:30pm",
                "court": "North",
                "organizer": "John Smith",
                "players": ["John Smith", "Jane Doe", "Bob Wilson", "Alice Johnson"],
            }
        )
        mock_client.chat.completions.create.return_value = mock_response

        email_text = self.load_fixture(fixtures_dir, "simple-reservation.eml")

        with patch.dict(
            os.environ,
            {
                "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com",
                "AZURE_OPENAI_API_KEY": "test-key",
            },
        ):
            req = MockHttpRequest(
                body={
                    "email_text": email_text,
                    "email_subject": "Rally Club Reservation",
                }
            )
            response = parse_email(req)

            assert response.status_code == 200
            body = json.loads(response.get_body())
            assert body["is_reservation"] is True
            assert len(body["players"]) == 4

            # Verify OpenAI was called with the email content
            call_args = mock_client.chat.completions.create.call_args
            user_message = call_args.kwargs["messages"][1]["content"]
            assert "Rally Club Reservation" in user_message
            assert "John Smith" in user_message
