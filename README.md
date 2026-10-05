# LokiBot AI Portfolio

LokiBot is a developer portfolio with a FastAPI backend and a React/Vite
frontend. Visitors can ask questions about the candidate, see answers stream
from Groq, and request an evidence-based comparison with a job description.
Candidate facts live in one structured JSON profile used by both the frontend
and backend.

## Requirements

- Python 3.12 or newer
- Node.js and npm
- A Groq API key for AI chat and job matching

## Run locally

1. Copy `.env.example` to `.env` and set `GROQ_API_KEY`. Keep this file
   private; the key is used only by FastAPI.
2. Start the backend from the project root:

   ```powershell
   uv sync
   uv run uvicorn main:app --reload --host 127.0.0.1 --port 8001
   ```

   Or install from `requirements.txt` and run
   `uvicorn main:app --reload --host 127.0.0.1 --port 8001`.
3. In another terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev -- --host 127.0.0.1 --port 5181
   ```
4. Open the Vite URL printed in the terminal. The development server proxies
   `/chat` to this project's FastAPI backend at `http://127.0.0.1:8001`.
   If the backend uses another local port, set `VITE_API_PROXY_TARGET` in the
   frontend environment.

Health and API documentation are available at
`http://127.0.0.1:8001/health` and `http://127.0.0.1:8001/docs`.

## Candidate profile

Edit [`candidate.json`](./candidate.json) to update verified candidate
information. It is validated with the Pydantic `Candidate` model in
`lokibot.py` and imported by the frontend; candidate facts are not duplicated
in UI components. Unknown contact, education, experience, achievement, or
certification values should remain empty or `null`, not be guessed.

## Chat API

`POST /chat` accepts the latest question, up to 20 prior user/assistant
messages, and an optional job description:

```json
{
  "question": "Which project was the hardest?",
  "history": [
    {"role": "user", "content": "Tell me about his projects."},
    {"role": "assistant", "content": "The listed projects are PayLocal and LokiAI."}
  ],
  "job_description": null
}
```

The response is a Server-Sent Events stream (`text/event-stream`). Token
events contain JSON with a `token` field; completion uses an `event: done`
event, and generation failures use an `event: error`. The frontend maintains
and resends conversation history so follow-up questions retain context.

For job matching, the frontend sends the pasted job description with a
comparison question to the same grounded backend endpoint. The model is
instructed to distinguish profile evidence from unlisted requirements and not
to make a hiring decision.

## API URL and CORS

Vite development uses its `/chat` proxy, so no frontend API URL is needed
locally. For a production frontend, set `NEXT_PUBLIC_API_URL` in the Vercel project
environment settings to the deployed FastAPI origin (for example,
`https://your-api.example`). The frontend also accepts `VITE_API_URL` as a
backwards-compatible alias. Do not include `/chat` in the value. The app
appends that endpoint itself and rejects an unconfigured production API URL;
never set this to a localhost address.

Set `FRONTEND_ORIGINS` on the backend to the exact comma-separated production
frontend origins, such as `https://your-portfolio.vercel.app` (scheme included,
no trailing slash). If it is unset, FastAPI only permits the documented local
development origins, so production browser requests will fail CORS checks.
Once configured, only the listed origins are allowed; this keeps localhost
origins out of the production allowlist.

## Deployment

- **FastAPI (Render, Koyeb, or Railway):** use the project root as the service
  directory, install with `pip install -r requirements.txt`, and start with
  `uvicorn main:app --host 0.0.0.0 --port $PORT`. Configure `GROQ_API_KEY` and
  `FRONTEND_ORIGINS` as server environment variables.
- **Frontend (Vercel):** set the project root to `frontend`, build with
  `npm run build`, use `dist` as the output directory, and configure
  `NEXT_PUBLIC_API_URL` to the public HTTPS FastAPI origin. In the backend
  deployment, set `FRONTEND_ORIGINS` to the Vercel site's exact HTTPS origin.
  Redeploy both services after changing these environment variables.

Never add `.env`, `GROQ_API_KEY`, or other credentials to source control.
Production frontend and backend URLs should be added here after they are
deployed; no live URL is configured in this project yet.

## Existing resume parsing endpoint

The backend also retains its existing `POST /resume` PDF parsing endpoint.
It validates text-based PDFs and uses Groq to parse them into the Pydantic
`Resume` schema. The parsed profile is held in process memory for the running
API and replaces the default profile for subsequent chat requests. It is not
a database-backed or per-user upload system.
