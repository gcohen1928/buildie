from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request
from typing import List, Dict, Any
import asyncio
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Stores active connections, mapping job_id to a list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)
        print(f"WebSocket connected for job_id: {job_id}. Total connections for job: {len(self.active_connections[job_id])}")

    def disconnect(self, websocket: WebSocket, job_id: str):
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
                if not self.active_connections[job_id]: # If no more connections for this job_id
                    del self.active_connections[job_id]
                print(f"WebSocket disconnected for job_id: {job_id}.")
            else:
                print(f"Warning: WebSocket to disconnect not found in active connections for job_id: {job_id}")
        else:
            print(f"Warning: job_id: {job_id} not found in active_connections during disconnect.")

    async def send_event(self, job_id: str, event: Dict[str, Any]):
        """Sends an event to all WebSockets connected for a specific job_id."""
        if job_id in self.active_connections:
            disconnected_sockets = []
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_text(json.dumps(event))
                except WebSocketDisconnect:
                    print(f"WebSocket in job {job_id} disconnected during send, scheduling removal.")
                    disconnected_sockets.append(connection)
                except Exception as e:
                    print(f"Error sending event to WebSocket in job {job_id}: {e}")
                    # Optionally remove socket on other errors too
                    disconnected_sockets.append(connection)
            
            # Clean up sockets that were found disconnected during send
            for ws in disconnected_sockets:
                self.disconnect(ws, job_id)
        else:
            # This might happen if events are generated before a client connects, or after all clients disconnect.
            # Consider logging or queuing if this is a concern.
            print(f"No active WebSocket connections for job_id: {job_id} to send event: {event.get('type', 'unknown_event')}")

    # Example of how the LangGraph agent might send updates
    async def stream_agent_event(self, job_id: str, node_name: str, event_type: str, data: Any):
        """Helper to structure and send agent events."""
        event = {
            "job_id": job_id,
            "node": node_name,
            "event": event_type, # e.g., "start", "progress", "end", "tool_call", "tool_result", "error"
            "data": data
        }
        await self.send_event(job_id, event)

manager = ConnectionManager()

@router.websocket("/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await manager.connect(websocket, job_id)
    try:
        while True:
            # Keep the connection alive, listening for messages from client if any (e.g., pause/resume)
            # For now, we primarily use this for server-to-client streaming.
            data = await websocket.receive_text() # Or receive_json
            # TODO: Handle client messages if needed, e.g., control messages
            print(f"Received message from client for job {job_id}: {data}")
            # Example: await manager.send_event(job_id, {"echo": data}) 
    except WebSocketDisconnect:
        print(f"Client for job {job_id} disconnected (WebSocketDisconnect caught in endpoint).")
    except Exception as e:
        print(f"Error in WebSocket connection for job {job_id}: {e}")
    finally:
        manager.disconnect(websocket, job_id)
        print(f"WebSocket for job {job_id} connection closed.")

# TODO: For SSE (Server-Sent Events), you would use a different approach with an async generator
# from sse_starlette.sse import EventSourceResponse
# @router.get("/sse/{job_id}")
# async def sse_endpoint(request: Request, job_id: str):
#     async def event_generator():
#         # This would need a way to tap into the events for job_id, perhaps via a queue
#         # or by having the ConnectionManager also manage SSE event queues.
#         try:
#             while True:
#                 # TODO: Dequeue event for job_id and yield
#                 # yield {"event": "agent_update", "data": json.dumps(some_event_data)}
#                 await asyncio.sleep(1) # Placeholder
#                 yield {"event": "ping", "data": json.dumps({"job_id": job_id, "time": time.time()})}
#         except asyncio.CancelledError:
#             print(f"SSE connection closed for job {job_id}")
#             raise
#     return EventSourceResponse(event_generator()) 