import azure.functions as func
import json
import logging
import os
from openai import AzureOpenAI
from pydantic import BaseModel, ValidationError
from typing import Optional

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)


class ReservationResponse(BaseModel):
    """Structured response from AI parsing"""
    is_reservation: bool
    date: Optional[str] = None  # ISO format: YYYY-MM-DD
    start_time: Optional[str] = None  # e.g., "5:30pm"
    end_time: Optional[str] = None  # e.g., "7:00pm"
    court: Optional[str] = None  # e.g., "North", "North, South"
    organizer: Optional[str] = None  # e.g., "John Smith"
    players: Optional[list[str]] = None  # e.g., ["John Smith", "Jane Doe"]
    error: Optional[str] = None


SYSTEM_PROMPT = """You are a specialized email parser for pickleball court reservations from Pickle Planner / Rally Club.

Your task is to extract reservation details from email text. The emails may be:
- Direct reservation confirmations
- Forwarded emails (with headers like "Begin forwarded message:")
- Various formats with or without proper line breaks

Extract the following information:
1. **date**: The reservation date (not the email sent date if forwarded). Format as YYYY-MM-DD.
2. **start_time**: Start time (e.g., "5:30pm", "8:00am")
3. **end_time**: End time (e.g., "7:00pm", "9:30am")
4. **court**: Court location (e.g., "North", "South", "North, South", "East", "West", "Center")
5. **organizer**: The person whose reservation it is (from "Name's Reservation")
6. **players**: List of all player names

Important parsing rules:
- For forwarded emails, look for the ACTUAL reservation date (often followed by a day like "TUESDAY") not the forwarding date
- Look for "following event:" as a marker for the actual reservation content
- Player names appear after "Players" and before "Reservation Fee", "Fee Breakdown", "Total:", "Status:", or "The door code"
- Courts are typically: North, South, East, West, Center (or combinations like "North, South")
- If it's not a Rally Club / Pickle Planner reservation email, set is_reservation to false

Respond with valid JSON only, no markdown formatting."""


@app.route(route="parse-email", methods=["POST"])
def parse_email(req: func.HttpRequest) -> func.HttpResponse:
    """
    Parse a pickleball reservation email using Azure OpenAI.

    Request body:
    {
        "email_text": "...",
        "email_subject": "..."
    }

    Response:
    {
        "is_reservation": true/false,
        "date": "2025-12-23",
        "start_time": "1:30pm",
        "end_time": "3:30pm",
        "court": "North, South",
        "organizer": "John Smith",
        "players": ["John Smith", "Jane Doe", ...]
    }
    """
    logging.info("Processing email parse request")

    # Validate environment configuration
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    api_key = os.environ.get("AZURE_OPENAI_API_KEY")
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")

    if not endpoint or not api_key:
        logging.error("Azure OpenAI not configured")
        return func.HttpResponse(
            json.dumps({"error": "Azure OpenAI not configured"}),
            status_code=500,
            mimetype="application/json"
        )

    # Parse request body
    try:
        req_body = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON in request body"}),
            status_code=400,
            mimetype="application/json"
        )

    email_text = req_body.get("email_text", "")
    email_subject = req_body.get("email_subject", "")

    if not email_text:
        return func.HttpResponse(
            json.dumps({"error": "email_text is required"}),
            status_code=400,
            mimetype="application/json"
        )

    # Quick check - if it doesn't look like a reservation email, skip AI
    if "Rally Club" not in email_text and "Rally Club" not in email_subject:
        return func.HttpResponse(
            json.dumps({"is_reservation": False}),
            status_code=200,
            mimetype="application/json"
        )

    # Call Azure OpenAI
    try:
        client = AzureOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            api_version="2024-02-01"
        )

        user_message = f"""Parse this reservation email:

Subject: {email_subject}

Body:
{email_text}

Extract the reservation details and respond with JSON."""

        response = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0,  # Deterministic output
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        result_text = response.choices[0].message.content
        logging.info(f"OpenAI response: {result_text}")

        # Parse and validate the response
        try:
            result_dict = json.loads(result_text)
            # Validate with Pydantic
            reservation = ReservationResponse(**result_dict)
            return func.HttpResponse(
                reservation.model_dump_json(),
                status_code=200,
                mimetype="application/json"
            )
        except (json.JSONDecodeError, ValidationError) as e:
            logging.error(f"Failed to parse AI response: {e}")
            return func.HttpResponse(
                json.dumps({
                    "is_reservation": False,
                    "error": f"Failed to parse AI response: {str(e)}"
                }),
                status_code=200,
                mimetype="application/json"
            )

    except Exception as e:
        logging.error(f"Azure OpenAI error: {e}")
        return func.HttpResponse(
            json.dumps({"error": f"AI processing failed: {str(e)}"}),
            status_code=500,
            mimetype="application/json"
        )


@app.route(route="health", methods=["GET"])
def health(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint"""
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    api_key = os.environ.get("AZURE_OPENAI_API_KEY")

    return func.HttpResponse(
        json.dumps({
            "status": "ok",
            "openai_configured": bool(endpoint and api_key)
        }),
        status_code=200,
        mimetype="application/json"
    )
