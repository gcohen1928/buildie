from __future__ import annotations

"""LangGraph workflow for Buildie Autopilot

This graph orchestrates the full MVP flow:
1. Retrieve relevant code chunks via vector search (Supabase pgvector).
2. Generate an end-to-end browser demo video of the new feature.
3. Draft an X (Twitter) post announcing the change.

The heavy-lifting utilities live in *api/app/agents/tools.py* – we import and
invoke them here so the graph stays skinny.
"""

import os
import asyncio
from typing import Any, Dict, List, TypedDict, Optional

from langgraph.graph import StateGraph, END

# Tooling implemented in the same package
from .tools import (
    code_search,
    demo_generation,
    GenerateXPostTool,
)

# ---------------------------------------------------------------------------
# State definition
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    """Mutable graph state passed between nodes."""

    # --- Immutable input values ------------------------------------------------
    message: str  # Git commit message
    diff_text: Optional[str]  # Full diff text (may be None)
    change_summary: str  # LLM-generated feature summary
    repo_name: str  # Short repository name (e.g. "buildie")
    app_url: str  # URL of the locally running web app for browser-use

    # --- Outputs filled during graph execution ---------------------------------
    retrieved_code_chunks: List[Dict[str, Any]]  # vector search results
    video_path: Optional[str]  # path to recorded mp4
    x_post: Optional[str]  # drafted tweet / thread starter

    # --- Misc / plumbing -------------------------------------------------------
    job_id: str
    event_manager: Any  # A websocket manager for streaming events; may be Mock


# ---------------------------------------------------------------------------
# Helper – safe event streaming (no-op if manager is mock/None)
# ---------------------------------------------------------------------------

async def _emit(state: AgentState, node: str, event: str, data: Dict[str, Any] | None = None):
    """Utility wrapper to send WS events from inside nodes (best-effort)."""
    manager = state.get("event_manager")
    if manager is None:
        return
    try:
        await manager.stream_agent_event(state["job_id"], node, event, data or {})
    except Exception as exc:  # noqa: BLE001
        # Never crash the agent because of streaming errors – just log.
        print(f"[Agent ‑ warn] Failed to stream event via event_manager: {exc}")


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

async def node_retrieve_chunks(state: AgentState) -> Dict[str, Any]:
    """Fetch top-k relevant code chunks from Supabase vector store."""
    await _emit(state, "retrieve_chunks", "start")

    try:
        chunks = code_search(
            feature_summary=state["change_summary"],
            commit_message=state["message"],
            diff_text=state.get("diff_text"),
            repo_name=state.get("repo_name"),
            top_k=5,
        )
        await _emit(state, "retrieve_chunks", "end", {"count": len(chunks)})
        return {"retrieved_code_chunks": chunks}
    except Exception as exc:  # noqa: BLE001
        await _emit(state, "retrieve_chunks", "error", {"detail": str(exc)})
        raise


async def node_generate_assets(state: AgentState) -> Dict[str, Any]:
    """Run demo generation (video) + X-post drafting in parallel."""
    await _emit(state, "generate_assets", "start")

    # Guard – we need code chunks; if missing, raise
    if not state.get("retrieved_code_chunks"):
        raise RuntimeError("Code chunks missing – ensure node_retrieve_chunks ran first.")

    # Convert chunk dicts to raw snippets used by X-post tool
    chunk_texts: List[str] = []
    for ch in state["retrieved_code_chunks"]:
        txt = ch.get("content") or ch.get("text") or ""
        if txt:
            chunk_texts.append(txt)

    # Helper wrappers so we can run them concurrently with asyncio.gather
    async def _run_demo_generation() -> Dict[str, str]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: demo_generation(
                feature_summary=state["change_summary"],
                commit_message=state["message"],
                diff_text=state.get("diff_text"),
                repo_name=state.get("repo_name"),
                app_url=state["app_url"],
                top_k=5,
            ),
        )

    async def _run_x_post() -> str:
        tool = GenerateXPostTool()
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: tool.run({
                "feature_summary": state["change_summary"],
                "commit_message": state["message"],
                "diff_text": state.get("diff_text", ""),
                "repo_name": state.get("repo_name", ""),
                "retrieved_code_chunks": chunk_texts,
            }),
        )

    try:
        demo_result, x_post_text = await asyncio.gather(_run_demo_generation(), _run_x_post())
        await _emit(state, "generate_assets", "end", {"video_path": demo_result.get("video_path")})
        return {
            "video_path": demo_result.get("video_path"),
            "x_post": x_post_text,
        }
    except Exception as exc:  # noqa: BLE001
        await _emit(state, "generate_assets", "error", {"detail": str(exc)})
        raise


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def build_agent_graph():
    """Compile and return the LangGraph runnable for the Autopilot MVP."""

    workflow = StateGraph(AgentState)

    # Nodes
    workflow.add_node("retrieve_chunks", node_retrieve_chunks)
    workflow.add_node("generate_assets", node_generate_assets)

    # Edges / flow
    workflow.set_entry_point("retrieve_chunks")
    workflow.add_edge("retrieve_chunks", "generate_assets")
    workflow.add_edge("generate_assets", END)

    # Compile
    runnable = workflow.compile()
    print("[Agent] LangGraph agent graph compiled.")
    return runnable

# Example of how to get the runnable agent
# agent_runnable = build_agent_graph() 