from .build_graph import build_agent_graph, AgentState
# from ..routes.events import manager as event_manager # Import the global event manager
import os

# TODO: This should be initialized properly, perhaps passed from main app or generate route
# This is a placeholder. In a real app, the `event_manager` would be the instance
# from `autopilot.api.app.routes.events.py`.
# It needs to be accessible here to be passed into the agent state.
# One way is to have it available on the `app.state` if this code is called within a request context,
# or pass it explicitly.
class MockEventManager:
    async def stream_agent_event(self, job_id: str, node_name: str, event_type: str, data: Any):
        print(f"[Mock Event Stream job_id={job_id}] Node: {node_name}, Event: {event_type}, Data: {data}")

mock_event_manager = MockEventManager()

async def run_agent_graph(job_id: str, project_id: str, commits: list[str], user_prompt: str | None, supabase_client: Any, openai_api_key: str):
    """Runs the compiled LangGraph agent with the given inputs."""
    print(f"Job [{job_id}]: Initializing and running LangGraph agent.")
    
    agent_executor = build_agent_graph()
    
    initial_state = AgentState(
        project_id=project_id,
        commits=commits,
        user_prompt=user_prompt,
        retrieved_chunks=[],
        current_diff_content=None,
        video_path=None,
        draft_posts={},
        error_message=None,
        messages=[],
        job_id=job_id,
        event_manager=mock_event_manager # TODO: Replace with actual event_manager instance
    )

    # TODO: Configure Arize Phoenix tracing if not done globally or via LangChain callbacks
    # Ensure LANGCHAIN_TRACING_V2, LANGCHAIN_API_KEY, LANGCHAIN_PROJECT, ARIZE_ORG_KEY are set for auto-trace
    # Alternatively, use Phoenix callback handler: from phoenix.langchain import PhoenixCallbackHandler
    # phoenix_callback = PhoenixCallbackHandler()
    # config = {"callbacks": [phoenix_callback]} 
    config = {} # Add callbacks or other LangChain config here

    final_state = None
    try:
        # The agent execution will internally call event_manager.stream_agent_event
        # within its nodes if they are designed to do so.
        async for event in agent_executor.astream_events(initial_state, version="v1", config=config):
            # TODO: Process different types of streaming events from astream_events if needed
            # For example, LangGraph itself emits events like "on_llm_start", etc.
            # These are separate from the custom events we might send via event_manager.
            kind = event["event"]
            if kind == "on_chain_end": # or on_tool_end, on_chat_model_end
                if event["name"] == "LangGraph": # Check if it's the end of the main graph
                    output = event["data"].get("output")
                    if output:
                        print(f"Job [{job_id}]: LangGraph execution finished. Final state keys: {output.keys()}")
                        final_state = output
                    else:
                        print(f"Job [{job_id}]: LangGraph on_chain_end event missing output data.")

            # Minimal logging of LangGraph internal stream events:
            # print(f"--- Job [{job_id}] LangGraph Event: {kind} | Name: {event['name']} | Tags: {event['tags']} ---")
        
        # If final_state is not captured from stream (e.g., if astream_events doesn't directly yield the final output in all cases
        # or if we need to be absolutely sure we get it), invoke normally.
        # This is more of a fallback; ideally, astream_events gives us what we need.
        if final_state is None:
             print(f"Job [{job_id}]: Final state not captured from astream_events, invoking for final result.")
             final_state = await agent_executor.ainvoke(initial_state, config=config)

        if final_state:
            print(f"Job [{job_id}]: Agent execution completed. Final state: {final_state}")
        else:
            print(f"Job [{job_id}]: Agent execution completed but no final state was captured.")
            final_state = {"error": "No final state captured"} # Ensure final_state is not None

        # TODO: Perform any final actions with the final_state (e.g., save to DB)
        # The `process_generation_request` in `generate.py` will handle the completion signal via event_manager
        # if this runner is awaited.

    except Exception as e:
        print(f"Job [{job_id}]: Error during agent execution: {e}")
        # TODO: Update state with error and potentially send an error event via event_manager
        # await mock_event_manager.stream_agent_event(job_id, "graph_runner", "error", {"detail": str(e)})
        # Raise the exception so the background task in generate.py can log it or handle it.
        # Consider returning an error state instead of raising, if the background task should report completion.
        final_state = {"error": str(e)} # Store error in final state
        # raise # Or handle error reporting differently
    
    return final_state 