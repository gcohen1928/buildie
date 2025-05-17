# Build-in-Public Autopilot

This project aims to automate parts of the "build in public" process by ingesting GitHub changes, generating social media posts, and optionally creating video demos.

## Project Structure

- `api/`: FastAPI backend
- `web/`: Next.js frontend
- `playwright-runner/`: Standalone Playwright test runner for video recording
- `infra/`: Infrastructure as Code (Docker, Vercel, Fly.io, Supabase migrations)

## Getting Started

TODO: Add detailed setup and development instructions.

### Prerequisites

- Docker
- Node.js (version X.X.X)
- Python (version 3.11)
- Supabase account
- OpenAI API Key
- Arize Org Key

### Local Development

```bash
make dev
```

### Migrations

```bash
make migrate
```

### Manual Ingest

```bash
make ingest
``` 