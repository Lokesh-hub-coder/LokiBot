# PortBot API

FastAPI backend for parsing a candidate resume and answering questions about
the candidate. The `/resume` endpoint extracts text from an uploaded PDF,
parses it with Groq, and makes the result available to `/chat`. Chat answers
are streamed as Server-Sent Events (SSE).

## Run locally

1. Create a `.env` file in this folder and add your Groq API key:

   ```env
   GROQ_API_KEY=your_groq_api_key
   ```

2. Install/sync project dependencies and start the development server:

   ```powershell
   uv sync
   uv run uvicorn main:app --reload
   ```

3. Open `http://127.0.0.1:8000/docs` to try the API, or check
   `http://127.0.0.1:8000/health` for the health status.

## Run the chat interface

Start the API as above, then in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The development server proxies chat
requests to the API at `http://127.0.0.1:8000`; conversation history is saved
in the browser.

## Stream a chat response

Send a POST request to `http://127.0.0.1:8000/chat` with JSON:

```json
{
   "question": "Which one was the hardest?",
   "history": [
      {"role": "user", "content": "Tell me about his projects."},
      {"role": "assistant", "content": "He has worked on PayLocal and LokiAI."}
   ]
}
```

`history` is optional for a first message. When provided, it contains up to 20
prior `user` and `assistant` messages in conversation order; the frontend sends
the selected conversation's history with each request.

The optional `job_description` field accepts up to 12,000 characters. The chat
uses it to compare role requirements with evidence in the candidate profile;
interview recommendations are non-binding decision support for human review.

The response uses `text/event-stream`. Each `data` event contains one JSON
token, followed by an `event: done` event. If Groq cannot generate the answer,
the stream sends an `event: error`.

## Parse a resume PDF

Upload a text-based PDF to `POST /resume` as multipart form data using the
`file` field. The endpoint returns the parsed resume as JSON, with fields for
contact information, experience, skills, education, projects, and
certifications. PDFs larger than 10 MB, encrypted PDFs, and PDFs without
extractable text are rejected.

After a successful upload, `/chat` uses that parsed resume instead of the
default profile in `lokibot.py`. The uploaded profile is held in memory for
the running API process; it is shared by all users of that process and resets
to the default profile when the server restarts. This is intended for a
single-candidate/local workflow, not concurrent per-user resumes.

## How resume parsing works

1. FastAPI validates the uploaded file and reads its PDF text with `pypdf`.
2. The extracted text and resume schema are sent to Groq with instructions not
   to invent missing information.
3. The JSON response is validated as a resume model and returned to the caller.
4. A valid parsed resume becomes the profile used by subsequent `/chat` calls.

## How the request flows

1. FastAPI validates the request body with the `ChatRequest` model.
2. The endpoint checks that `GROQ_API_KEY` is configured.
3. The active candidate profile, prior conversation messages, and the current
   question are sent with grounding instructions to the Groq chat-completions
   API.
4. Groq's asynchronous stream is consumed as tokens arrive; each token is
   emitted immediately as an SSE event.