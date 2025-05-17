import os
import phoenix as px
from phoenix.trace import SpanInContext,exporter
from datetime import datetime

# Arize Phoenix setup
# This assumes environment variables for Phoenix are set, e.g., ARIZE_ORG_KEY, PHOENIX_PROJECT_NAME
# PHOENIX_PROJECT_NAME can be set here or in the environment.
# os.environ["PHOENIX_PROJECT_NAME"] = "autopilot-llm-ops"

# Global Phoenix session (recommended for long-running apps)
# try:
#     px.launch_app() # This launches the Phoenix UI locally if ARIZE_ORG_KEY is set for cloud.
#     print("Phoenix Arize tracing session started. Ensure env vars are set for cloud exporting.")
# except Exception as e:
#     print(f"Phoenix Arize UI could not be launched (may already be running or config error): {e}")


def get_phoenix_tracer(tracer_name: str = "autopilot_agent"):
    """Returns a Phoenix tracer instance."""
    # TODO: Configure exporter if not using global/env setup
    # from phoenix.trace.exporter import HttpExporter
    # from phoenix.session.session import Session
    # if os.getenv("ARIZE_ORG_KEY"):
    #    exporter = HttpExporter(project_name=os.getenv("PHOENIX_PROJECT_NAME", "autopilot-llm-ops"),
    #                            org_id=os.getenv("ARIZE_ORG_KEY"))
    #    session = Session(exporter=exporter)
    # else:
    #    session = px.active_session() # Use default local session if no org key
    # return session.tracer(tracer_name)
    
    # For simplicity with auto-configuration via env vars for LangChain or direct use:
    return px.tracer(tracer_name)

async def log_llm_call_to_arize(
    tracer_name: str,
    span_name: str, 
    prompt: any, 
    response: any, 
    metadata: dict = None, 
    tags: list = None,
    start_time: datetime = None,
    end_time: datetime = None
):
    """Logs a single LLM call (or a segment of work) to Arize Phoenix as a span.
    This is a manual way to log. LangChain integrations might do this automatically.
    """
    if not os.getenv("ARIZE_ORG_KEY"):
        print(f"Skipping Arize log for '{span_name}': ARIZE_ORG_KEY not set.")
        return

    tracer = get_phoenix_tracer(tracer_name)
    
    actual_start_time = start_time if start_time else datetime.now()
    
    attributes = {
        "llm.prompt": str(prompt), # Convert Pydantic models or complex objects to string
        "llm.response": str(response),
    }
    if metadata:
        attributes.update(metadata) # e.g., model_name, temperature, etc.

    # TODO: Define how to extract input/output tokens if available and desired for logging.
    # "llm.usage.total_tokens", "llm.usage.prompt_tokens", "llm.usage.completion_tokens"

    print(f"Logging to Arize Phoenix: Span '{span_name}' for tracer '{tracer_name}'")
    try:
        with tracer.start_as_current_span(
            span_name,
            start_time=actual_start_time,
            # end_time will be set on exit if not provided, but explicit is better if known
            end_time=end_time if end_time else datetime.now(), 
            attributes=attributes,
            tags=tags if tags else []
        ) as span: # type: ignore
            # If you have sub-operations within this call, they can be nested spans.
            # For a simple LLM call, the context block itself represents the duration.
            print(f"  Arize Span '{span_name}' created. Trace ID: {span.context.trace_id}")
            # If end_time was not provided, it's set automatically when the context manager exits.
            if end_time and start_time:
                span.end_time = end_time # Ensure it's set if passed

    except Exception as e:
        print(f"Error logging to Arize Phoenix: {e}")

# Example usage (typically called by your LangGraph nodes or LLM interaction points)
# async def example_llm_interaction():
#     prompt = "What is the capital of France?"
#     # Simulate LLM call
#     await asyncio.sleep(0.5)
#     response = "Paris"
#     start_time = datetime.now() - timedelta(seconds=0.5)
#     end_time = datetime.now()

#     await log_llm_call_to_arize(
#         tracer_name="my_agent_tracer",
#         span_name="ask_capital_city",
#         prompt=prompt,
#         response=response,
#         metadata={"llm.model_name": "gpt-mock-1", "custom.category": "geography"},
#         tags=["test_log", "llm_call"],
#         start_time=start_time,
#         end_time=end_time
#     )

# if __name__ == '__main__':
#     import asyncio
#     # You might need to set ARIZE_ORG_KEY and PHOENIX_PROJECT_NAME env vars for this to run meaningfully
#     # For local-only viewing, just ensure phoenix is installed.
#     # px.launch_app() # Call this once at the start of your app
#     asyncio.run(example_llm_interaction()) 