# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV POETRY_VERSION=1.7.1
ENV POETRY_HOME="/opt/poetry"
ENV PATH="$POETRY_HOME/bin:$PATH"

# Install system dependencies required by Playwright and potentially other libraries
# Lite versions for browsers. For full browser versions, adjust accordingly.
# May need to install full browsers if record.sh doesn't use Playwright's own download mechanism or if that fails in Docker.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    # Dependencies for Playwright, ensure these cover what's needed by npx playwright install-deps
    # Or, install browsers directly: 
    # RUN npx playwright install --with-deps chromium # or firefox, webkit
    # For now, assuming playwright runner might handle its own browser install or these are sufficient for a lite version.
    # Check Playwright Docker guide for minimal deps: https://playwright.dev/docs/docker
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

# Set the working directory in the container
WORKDIR /app

# Copy the pyproject.toml and poetry.lock files
COPY pyproject.toml poetry.lock* /app/

# Install project dependencies using Poetry
# --no-root is used if the app is not a library to be installed itself
# --no-dev is important for production images to exclude dev dependencies
RUN poetry install --no-root --no-dev

# Copy the rest of the application code into the container
COPY ./app /app/app

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the application using Uvicorn
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# It's often better to run poetry run uvicorn for consistency with dev environment if using poetry for run scripts.
CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# To build this Dockerfile:
# docker build -t autopilot-api .

# To run this Docker container:
# docker run -p 8000:8000 -e SUPABASE_URL=... -e SUPABASE_KEY=... autopilot-api 