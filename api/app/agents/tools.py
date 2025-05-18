"""
Agent tools for the AutopilotAgent:
- code_search: Search over the indexed codebase
- video_generation: Generate a Playwright script and video
- post_creation: Generate a post for X/LinkedIn
"""

import os
from openai import OpenAI
from typing import List, Dict, Any, Optional, Type
from datetime import datetime
import asyncio, json, ast as _ast
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.callbacks import CallbackManagerForToolRun
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.tools import BaseTool
from loguru import logger
import github
from github import Github

load_dotenv()

# NOTE: Requires: pip install openai supabase tiktoken
# Ensure tiktoken is available for the same token counting logic as the indexer
try:
    import tiktoken
    enc = tiktoken.encoding_for_model("text-embedding-ada-002")
    def count_tokens(text):
        return len(enc.encode(text))
except ImportError:
    def count_tokens(text):
        # Fallback: estimate 1 token per 4 chars
        return max(1, len(text) // 4)

# Import the Supabase-backed indexer for vector search
# NOTE: agents package is in the same app; adjust relative import if your structure differs.
from app.ingest.indexer import RepoIndexer  # type: ignore

# browser-use imports (public API – see https://github.com/browser-use/browser-use)
try:
    from browser_use import Agent as BrowserAgent, Browser, BrowserConfig
    from browser_use.browser.context import BrowserContext, BrowserContextConfig
    from browser_use.controller.service import Controller
except ImportError:
    # Allow rest of codebase to load even if browser-use is not installed in the
    # current environment (e.g. unit-test runners). The actual tool call will
    # raise a helpful error instead of ImportError at import time.
    BrowserAgent = Browser = BrowserConfig = BrowserContext = BrowserContextConfig = Controller = None  # type: ignore

OPENAI_EMBEDDING_MODEL = "text-embedding-ada-002"

# -- Initialise RepoIndexer (for search only) ---------------------------------

_indexer_singleton: RepoIndexer | None = None


def _get_indexer() -> RepoIndexer:
    """Lazily build a RepoIndexer configured for search-only operations."""
    global _indexer_singleton
    if _indexer_singleton is None:
        openai_key = os.getenv("OPENAI_API_KEY")
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        if not (openai_key and supabase_url and supabase_key):
            raise RuntimeError("OPENAI_API_KEY, SUPABASE_URL and SUPABASE_KEY must be set for code search tool.")

        _indexer_singleton = RepoIndexer(
            openai_api_key=openai_key,
            supabase_url=supabase_url,
            supabase_key=supabase_key,
        )
    return _indexer_singleton

def code_search(feature_summary: str, commit_message: str, diff_text: str | None = None,
                repo_name: str | None = None, top_k: int = 5) -> List[Dict[str, Any]]:
    """High-level search tool for the agent.

    Combines the feature summary, commit message and optional diff, then uses
    `search_code_with_context` to retrieve the most relevant code chunks from the
    Supabase-backed embedding store.
    """

    indexer = _get_indexer()

    results = indexer.search_code_with_context(
        feature_summary=feature_summary,
        commit_message=commit_message,
        diff_content=diff_text,
        repo_name=repo_name,
        limit=top_k,
        similarity_threshold=0.4,
    )
    return results

def video_generation(feature_context, code_chunks):
    """Deprecated placeholder – use `demo_generation` instead."""
    return "/path/to/generated/video.mp4"

def demo_generation(
    *,
    feature_summary: str,
    commit_message: str,
    diff_text: str | None,
    repo_name: str | None,
    app_url: str,
    top_k: int = 5,
) -> dict[str, str]:
    """Generate and run an end-to-end browser demo for the feature.

    Returns a dict with the path to the MP4 recording and the exact task prompt
    fed to the browser-use Agent so downstream nodes can inspect / reuse it.
    """

    # ------------------------------------------------------------------
    # 0.   Preconditions
    # ------------------------------------------------------------------
    if BrowserAgent is None:
        raise RuntimeError(
            "browser-use is not installed.  `pip install browser-use && playwright install chromium --with-deps`"
        )

    if not app_url:
        raise ValueError("app_url must be provided (e.g. http://localhost:3000)")

    # ------------------------------------------------------------------
    # 1.   Retrieve relevant code chunks for extra context (re-use search tool)
    # ------------------------------------------------------------------
    chunks = code_search(
        feature_summary=feature_summary,
        commit_message=commit_message,
        diff_text=diff_text,
        repo_name=repo_name,
        top_k=top_k,
    )

    # Compress chunks so the prompt stays small (snippet + file path)
    chunk_blurbs: list[str] = []
    for ch in chunks:
        txt = ch.get("content", "")
        trimmed = (txt[:300] + "…") if len(txt) > 300 else txt
        chunk_blurbs.append(
            f"{ch.get('file_path')} lines {ch.get('start_line')}-{ch.get('end_line')}:\n{trimmed}"
        )

    code_context = "\n\n".join(chunk_blurbs)

    # ------------------------------------------------------------------
    # 2.   Ask the LLM to produce a TASK list consumable by browser-use
    # ------------------------------------------------------------------
    sys_prompt = (
        "You write step-by-step instructions for the open-source `browser-use` AI browser agent. "
        "Follow the required format exactly: start with the line 'TASK:' and list numbered steps. "
        "The agent understands basic actions like 'open URL', 'click selector', 'type … into selector', 'wait for text …'. "
        "If the workflow involves logging in or entering credentials, always use mock values that *look valid*, e.g. the email `suj@suj.com` and the password `sujsujsuj`. "
        "Do NOT use placeholders like 'your username' or 'your password' – the instructions must be executable as-is. "
        "When the feature requires importing a GitHub project, always use the repository URL `https://github.com/gcohen1928/datingwrapped` as the example value instead of a generic placeholder. "
        "Finish after the last step – do not add any extra commentary."
    )

    user_prompt = (
        f"We need to demonstrate the following new feature in the app that will be running at {app_url}.\n\n"
        f"Feature summary:\n{feature_summary}\n\n"
        f"Commit message:\n{commit_message}\n\n"
    )

    if code_context:
        user_prompt += f"Relevant code snippets:\n{code_context}\n\n"

    user_prompt += "Write the TASK now."

    client = OpenAI()
    chat_resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    task_text = chat_resp.choices[0].message.content.strip()

    if not task_text.lower().startswith("task"):
        # Basic guardrail – prepend if model forgot
        task_text = "TASK:\n" + task_text

    # ------------------------------------------------------------------
    # 3.   Run the browser-use Agent and record a video
    # ------------------------------------------------------------------
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    video_path = f"/tmp/browser_demos/demo-{timestamp}.mp4"

    browser = Browser(config=BrowserConfig())
    ctx = BrowserContext(
        browser=browser,
        config=BrowserContextConfig(save_recording_path=video_path),
    )
    controller = Controller()

    langchain_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)

    b_agent = BrowserAgent(
        browser_context=ctx,
        controller=controller,
        task=task_text,
        llm=langchain_llm,
    )

    # The API is async, so we run it to completion.
    asyncio.run(b_agent.run())
    asyncio.run(browser.close())

    return {"video_path": video_path, "task_prompt": task_text}

# Backwards compatibility: previous code expected `post_creation` symbol.
post_creation = demo_generation

# ----------------------------------------------------------------------
# Backwards-compatibility aliases
# ----------------------------------------------------------------------

# Old name used elsewhere
create_demo = demo_generation

class GenerateXPostInput(BaseModel):
    feature_summary: str = Field(description="Summary of the new feature or change.")
    commit_message: str = Field(description="The commit message for the changes.")
    diff_text: str = Field(description="The diff of the code changes.")
    repo_name: str = Field(description="The name of the repository.")
    retrieved_code_chunks: List[str] = Field(description="Relevant code chunks related to the feature.")
    # Optional: extend with user_tone or additional post parameters in future

class GenerateXPostTool(BaseTool):
    name: str = "generate_x_post"
    description: str = "Generates a concise and engaging X (formerly Twitter) post to announce a new feature or update, suitable for building in public. Takes feature summary, commit message, diff text, repository name, and relevant code chunks as input."
    args_schema: Type[BaseModel] = GenerateXPostInput
    # api_key: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))
    # client: OpenAI = Field(default_factory=lambda: OpenAI(api_key=os.getenv("OPENAI_API_KEY")))

    def _run(
        self,
        feature_summary: str,
        commit_message: str,
        diff_text: str,
        repo_name: str,
        retrieved_code_chunks: List[str],
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Generates an X post using the provided context."""
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        if not client.api_key:
            return "Error: OPENAI_API_KEY not configured. Cannot generate X post."

        code_context = "\n".join(retrieved_code_chunks)

        prompt = f"""
        You are an AI assistant helping a software developer build in public on X (formerly Twitter).
        Generate a concise, engaging, and informative X post (max 280 characters) about a new feature or update.

        Context for the post:
        Repository: {repo_name}
        Feature Summary: {feature_summary}
        Commit Message: {commit_message}

        Relevant Code Diff (for context, do not include directly in the post unless it's a tiny, illustrative snippet):
        {diff_text}

        Relevant Code Chunks (for context, do not include directly in the post):
        {code_context}

        Instructions for the post:
        1. Be enthusiastic and positive.
        2. Clearly state what was built or updated.
        3. Highlight the benefit or purpose of the change.
        4. Include relevant hashtags (e.g., #buildinpublic, #{repo_name.replace('-', '').replace('_', '')}, #devupdate, #newfeature).
        5. Keep it under 280 characters.
        6. If possible, add a relevant emoji.
        7. Do NOT include the commit message or diff directly unless it's a very small, key part and fits naturally.
        8. Focus on the "what" and "why" for the audience.

        X Post:
        """

        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo", # Or "gpt-4" if preferred and available
                messages=[
                    {"role": "system", "content": "You are an expert X post writer for software developers building in public."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100, # Adjusted for typical X post length (approx 280 chars / 4 chars/token ~ 70 tokens, giving some buffer)
                temperature=0.7,
            )
            # x_post = response.choices[0].message.content.strip()
            # return x_post
            if response.choices and response.choices[0].message:
                x_post = response.choices[0].message.content.strip()
                # Simple truncation if it's too long, though the prompt aims for brevity
                # A more sophisticated approach might involve re-prompting or summarizing
                if len(x_post) > 280:
                    logger.warning(f"Generated X post exceeded 280 characters (length: {len(x_post)}), truncating.")
                    # Find the last space before 280 to avoid cutting words
                    last_space = x_post.rfind(' ', 0, 277) # 277 to leave space for "..."
                    if last_space != -1:
                        x_post = x_post[:last_space] + "..."
                    else:
                        x_post = x_post[:277] + "..." 
                return x_post
            else:
                logger.error("No content in OpenAI response for X post generation.")
                return "Error: Could not generate X post due to empty response from AI."

        except Exception as e:
            logger.error(f"Error generating X post: {e}")
            return f"Error generating X post: {e}"

    async def _arun(
        self,
        feature_summary: str,
        commit_message: str,
        diff_text: str,
        repo_name: str,
        retrieved_code_chunks: List[str],
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Generates an X post using the provided context asynchronously."""
        # This is a simple synchronous wrapper for the async version.
        # For true async, you'd use an async OpenAI client.
        return self._run(feature_summary, commit_message, diff_text, repo_name, retrieved_code_chunks, run_manager)


# If you have a list of all tools, add the new tool here:
# available_tools = [..., GenerateXPostTool()] 