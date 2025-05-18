from __future__ import annotations

"""Utility wrapper to execute the LangGraph Autopilot agent.

This helper is primarily used by FastAPI background tasks or other async
orchestrators.  It fills out the initial AgentState and streams events via the
provided event_manager (or a mock).
"""

import os
from typing import Any, Optional

from .build_graph import build_agent_graph, AgentState
# Optionally import the real WebSocket/ SSE event manager when running inside the FastAPI app.
# from ..routes.events import manager as event_manager # Import the global event manager

# The event manager can be swapped out for the real implementation when the runner is
# executed inside the FastAPI context; otherwise the `_MockEventManager` provides
# basic stdout logging.

# ---------------------------------------------------------------------------
# Event manager fallback ------------------------------------------------------
# ---------------------------------------------------------------------------

class _MockEventManager:  # noqa: D101 (simple mock)
    async def stream_agent_event(self, job_id: str, node_name: str, event_type: str, data: Any):
        print(f"[MockStream job={job_id}] {node_name} » {event_type} : {data}")


# ---------------------------------------------------------------------------
# Public runner API -----------------------------------------------------------
# ---------------------------------------------------------------------------

async def run_agent_graph(
    *,
    job_id: str,
    message: str,
    diff_text: str | None,
    change_summary: str,
    repo_name: str,
    app_url: str | None = None,
    event_manager: Optional[Any] = None,
) -> AgentState:
    """Execute the LangGraph agent and return the final state.

    Parameters
    ----------
    job_id : str
        A unique identifier for this run – also used for streaming events.
    message : str
        Git commit message.
    diff_text : str | None
        Textual diff of the commit.
    change_summary : str
        LLM-generated high-level summary of the change (feature summary).
    repo_name : str
        Short name of the repository (e.g. "buildie").
    app_url : str | None, default "http://localhost:3000"
        The URL where the Next.js/React app is running for the browser demo.
    event_manager : Any, optional
        If supplied, must provide `stream_agent_event(job_id, node, event, data)`
        coroutine for real-time updates. Falls back to stdout logging.
    """

    print(f"Job [{job_id}] – booting Autopilot agent")

    app_url = app_url or os.getenv("APP_URL", "http://localhost:3000")
    event_manager = event_manager or _MockEventManager()

    agent_runnable = build_agent_graph()

    initial_state: AgentState = {
        "message": message,
        "diff_text": diff_text,
        "change_summary": change_summary,
        "repo_name": repo_name,
        "app_url": app_url,
        # outputs (None / empty)
        "retrieved_code_chunks": [],
        "video_path": None,
        "x_post": None,
        # plumbing
        "job_id": job_id,
        "event_manager": event_manager,
    }

    # Runtime configuration for LangGraph/LangChain callbacks (empty for MVP).
    config: dict = {}

    try:
        final_state: AgentState = await agent_runnable.ainvoke(initial_state, config=config)
    except Exception as exc:  # noqa: BLE001
        print(f"Job [{job_id}] – agent failed: {exc}")
        raise

    print(
        f"Job [{job_id}] – Autopilot agent complete. Video: {final_state.get('video_path')} | "
        f"X-post len: {len(final_state.get('x_post') or '')} chars"
    )
    return final_state 