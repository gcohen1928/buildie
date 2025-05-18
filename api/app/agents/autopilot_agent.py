class AutopilotAgent:
    """
    Orchestrates the build-in-public autopilot workflow:
    1. Receives feature context (summary, diffs, commits)
    2. Uses tools: code search, video generation, post creation
    """
    def __init__(self, llm, tools):
        self.llm = llm
        self.tools = tools

    def run(self, feature_context):
        """
        Main entrypoint for the agent. Receives context, injects prompt, and calls tools.
        """
        # 1. Inject context into prompt
        prompt = self._build_prompt(feature_context)
        # 2. LLM decides which tools to call and in what order
        # (Placeholder: sequential for now)
        code_chunks = self.tools['code_search'](feature_context)
        video_path = self.tools['video_generation'](feature_context, code_chunks)
        post_text = self.tools['post_creation'](feature_context, video_path)
        return {
            'code_chunks': code_chunks,
            'video_path': video_path,
            'post_text': post_text
        }

    def _build_prompt(self, feature_context):
        """Simple prompt composer (legacy – retained for backward compatibility)."""
        return f"Autopilot context: {feature_context}" 