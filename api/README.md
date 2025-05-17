# Buildie API

This directory contains the FastAPI backend for the Buildie - Build-in-Public Autopilot project.

## Prerequisites

Before you begin, ensure you have the following installed:
*   Python (version 3.11 or higher, compatible with `<3.14` as defined in `pyproject.toml`)
*   [Poetry](https://python-poetry.org/docs/#installation) (for dependency management)

## Setup & Installation

1.  **Navigate to the API directory**:
    ```bash
    cd api
    ```

2.  **Install dependencies**:
    Poetry will install all necessary dependencies based on the `pyproject.toml` and `poetry.lock` files.
    ```bash
    poetry install
    ```
    *(If you encounter an error about the project not being installable, it's likely because `package-mode = false` is set in `pyproject.toml`, which is fine for applications. The dependencies will still be installed.)*

## Running the API

1.  **Activate the virtual environment**:
    To find the path to your virtual environment, run:
    ```bash
    poetry env info --path
    ```
    Then, activate it (replace `/path/to/your/virtualenv` with the actual path):
    ```bash
    source /path/to/your/virtualenv/bin/activate
    ```
    Alternatively, if you've installed the `poetry-plugin-shell` (`poetry self add poetry-plugin-shell`), you can simply run:
    ```bash
    poetry shell
    ```

2.  **Set up Environment Variables**:
    This API requires certain environment variables to function correctly. Copy the `env.example.txt` from the project root to a `.env` file in the *project root directory* (`buildie/.env`) and populate it with the necessary values. Key variables for the API include:
    *   `DATABASE_URL` (for Supabase)
    *   `SUPABASE_URL`
    *   `SUPABASE_KEY`
    *   `OPENAI_API_KEY`
    *   `GITHUB_APP_ID`
    *   `GITHUB_PRIVATE_KEY`
    *   `GITHUB_WEBHOOK_SECRET`
    *   `ARIZE_SPACE_KEY`
    *   `ARIZE_API_KEY`
    *(The application is configured to load `.env` from the root project directory when run locally.)*

3.  **Start the development server**:
    Once the environment is activated and `.env` is set up, run Uvicorn:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```
    The API should now be running at `http://127.0.0.1:8000`. You can access the auto-generated API documentation at `http://127.0.0.1:8000/docs`.

## Key Technologies

*   **FastAPI**: Web framework for building APIs.
*   **LangGraph**: For building stateful, multi-actor applications with LLMs.
*   **SQLModel/Pydantic**: For data validation and ORM-like features.
*   **Supabase**: For database storage and authentication.
*   **Arize Phoenix**: For LLM observability and logging.
*   **PyGithub**: For interacting with the GitHub API.

## Project Structure (`app/`)

*   `main.py`: FastAPI application entry point and core configuration.
*   `routes/`: API endpoint definitions (e.g., `auth.py`, `webhook.py`, `generate.py`).
*   `agents/`: LangGraph agent definitions (e.g., `build_graph.py`, `graph_runner.py`).
*   `ingest/`: Modules for data ingestion and processing (e.g., `diff_splitter.py`, `embeddings.py`).
*   `video/`: Modules related to video recording (e.g., `recorder.py`).
*   `publish/`: Modules for publishing content and logging (e.g., `social_mocks.py`, `arize_logger.py`).
*   `core/`: Core application settings, configurations (e.g., `config.py` for environment variables).
*   `models/`: Pydantic/SQLModel data models.
*   `services/`: Business logic and interactions with external services.
*   `schemas/`: Pydantic schemas for request/response validation, separate from database models if needed.
*   `dependencies/`: FastAPI dependency injection functions.

*(Note: Some directories/files listed under Project Structure are conventional and might be created as development progresses.)*

## Docker

A `Dockerfile` is provided to containerize the API. To build and run with Docker:
1.  Ensure your `.env` file is correctly set up in the project root as Docker will use it.
2.  Build the image from the `api` directory:
    ```bash
    docker build -t buildie-api .
    ```
3.  Run the container:
    ```bash
    docker run -p 8000:8000 --env-file ../.env buildie-api
    ```
    *(Adjust `--env-file ../.env` path if your `.env` file is located elsewhere relative to where you run `docker run`)*
