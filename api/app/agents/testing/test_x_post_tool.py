import asyncio
import os
import sys
import textwrap # Added for dedent
from pathlib import Path
from dotenv import load_dotenv

# Ensure correct module path
# Assuming this script is in api/app/agents/
# and tools.py is in the same directory.
APP_DIR = Path(__file__).resolve().parent
if str(APP_DIR) not in sys.path:
    sys.path.append(str(APP_DIR))
AGENT_DIR = Path(__file__).resolve().parents[0]
if str(AGENT_DIR) not in sys.path:
    sys.path.append(str(AGENT_DIR))
API_DIR = Path(__file__).resolve().parents[2] # api/
if str(API_DIR) not in sys.path:
    sys.path.append(str(API_DIR))


# Try to import the tool
try:
    from tools import GenerateXPostTool
except ModuleNotFoundError:
    # This fallback might be needed if the script is run in a way that Python doesn't recognize the parent folders correctly
    # Or if the PYTHONPATH isn't set up as expected.
    print("Could not import GenerateXPostTool directly, attempting relative import path for tools.")
    try:
        from .tools import GenerateXPostTool # For when running as part of a package
    except ImportError:
        print(f"Failed to import GenerateXPostTool. Current sys.path: {sys.path}")
        print(f"Attempting to load from: {AGENT_DIR / 'tools.py'}")
        raise

# Load environment variables (e.g., for OPENAI_API_KEY)
# Ensure you have a .env file in the root of your project (e.g., alongside 'api' and 'web' directories)
# or that OPENAI_API_KEY is set in your environment.
dotenv_path = API_DIR.parent / '.env' # Assuming .env is in the project root, one level above API_DIR
print(f"Attempting to load .env from: {dotenv_path}")
if load_dotenv(dotenv_path=dotenv_path):
    print(".env file loaded successfully.")
else:
    print("No .env file found or it is empty. Ensure OPENAI_API_KEY is set in your environment if issues persist.")


async def main():
    # Sample data for testing the X post generation tool
    # Using the same context as test_demo_generation.py
    sample_feature_summary = (
        "We've rolled out a new sign-in flow to enhance security and user experience. "
        "Additionally, you can now import your existing projects directly from GitHub. "
        "When creating a new project, simply provide the GitHub repository link. "
        "The system will then index your codebase and load the commit history, "
        "making it easier to get started and providing valuable context from your project's past"
    )
    sample_commit_message = (
        "Implemented login, and users can create a new project that links to their github repo. "
        "we now index the repo, process its commits and show the commit history on the dashboard page"
    )
    sample_diff_text = textwrap.dedent(
        """diff --git a/web/src/app/commit-spark-demo/page.tsx b/web/src/app/commit-spark-demo/page.tsx
new file mode 100644
index 0000000..958f4cc
--- /dev/null
+++ b/web/src/app/commit-spark-demo/page.tsx
@@ -0,0 +1,77 @@
\"use client\";

import { useState } from 'react';

export default function CommitSparkDemoPage() {
  const [commitMessage, setCommitMessage] = useState(
    \"feat: Implement initial draft of Commit Spark feature (UI Mock)\"
  );
  const [generatedTweet, setGeneratedTweet] = useState(\"\");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateTweet = () => {
    setIsLoading(true);
    // Simulate AI generation time
    setTimeout(() => {
      setGeneratedTweet(
        \"🚀 Just launched 'Commit Spark' from our Build-in-Public Autopilot! Turns your latest commit into an instant tweet draft. Check out how we're making #buildinpublic a breeze! #devtool #AI #Innovation\"
      );
      setIsLoading(false);
    }, 1500); // 1.5 seconds delay
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: 'auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Build-in-Public Autopilot 🚀</h1>
        <h2>Commit Spark Demo ✨</h2>
      </header>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3 style={{ marginTop: '0', color: '#333' }}>Latest Commit:</h3>
        <p style={{ whiteSpace: 'pre-wrap', color: '#555' }}>{commitMessage}</p>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <button
          onClick={handleGenerateTweet}
          disabled={isLoading || !!generatedTweet}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            color: 'white',
            backgroundColor: isLoading || !!generatedTweet ? '#ccc' : '#0070f3',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading || !!generatedTweet ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isLoading ? 'Generating...' : !!generatedTweet ? 'Tweet Generated!' : '✨ Generate Tweet Spark'}
        </button>
      </div>

      {generatedTweet && (
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#e6f7ff' }}>
          <h3 style={{ marginTop: '0', color: '#005f80' }}>Suggested Tweet:</h3>
          <p style={{ whiteSpace: 'pre-wrap', color: '#00334d' }}>{generatedTweet}</p>
          <button
            onClick={() => navigator.clipboard.writeText(generatedTweet)}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              color: '#0070f3',
              backgroundColor: 'white',
              border: '1px solid #0070f3',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}
"""
    )
    sample_repo_name = "buildie"

    # Retrieved code chunks should ideally be relevant to *this* feature summary.
    sample_retrieved_code_chunks = [
        """File: web/src/app/dashboard/page.tsx  lines 1-15
\"use client\";

import { useEffect, useState, useCallback } from \"react\";
import { useSearchParams } from \"next/navigation\";
import ChatInput from '@/components/Dashboard/ChatInput';
import CommitHistoryTable, { Commit } from '@/components/Dashboard/CommitHistoryTable';
import { Skeleton } from \"@/components/ui/skeleton\"; // For loading state
import { Button } from \"@/components/ui/button\"; // For """,
        """File: web/src/app/commit-spark-demo/page.tsx  lines 1-15
\"use client\";

import { useState } from 'react';

export default function CommitSparkDemoPage() {
  const [commitMessage, setCommitMessage] = useState(
    \"feat: Implement initial draft of Commit Spark feature (UI Mock)\"
  );
  const [generatedTweet, setGeneratedTweet] = useState(\"\");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateTweet = () => {
    setIsLoading(true""",
        """File: web/src/components/Dashboard/CommitRow.tsx  lines 1-15
\"use client\";

import { useState } from 'react';
import { Copy, CheckCircle, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { Button } from \"@/components/ui/button\";
import { Badge } from \"@/components/ui/badge\";
import { Avatar, AvatarFallback, AvatarImage } from \"@/components/ui/avatar\";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from \"@/components/ui/card\"; //""",
        """File: web/src/app/dashboard/page.tsx  lines 37-51
  const projectId = searchParams.get(\"projectId\");

  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(true);
  const [commitsEr""",
        """File: web/src/components/projects/new-project-form.tsx  lines 49-63
  }).regex(/^https:\/\/github\.com\/[^\/]+\/[^\/]+$/, {
    message: \"Must be a valid GitHub repository URL (e.g., https://github.com/user/repo).\"
  }),
  description: z.string().max(500, {
    message: \"Description must not exceed 500 characters.\"
  }).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export function NewProjectForm() {
  const router = useRouter();
  c"""
    ]

    # Initialize the tool
    x_post_tool = GenerateXPostTool()

    print("\n--- Attempting to Generate X Post ---")
    print(f"Repository: {sample_repo_name}")
    print(f"Feature Summary: {sample_feature_summary}")

    try:
        tool_input = {
            "feature_summary": sample_feature_summary,
            "commit_message": sample_commit_message,
            "diff_text": sample_diff_text,
            "repo_name": sample_repo_name,
            "retrieved_code_chunks": sample_retrieved_code_chunks
        }
        generated_post = x_post_tool.run(tool_input)

        print("\nSuccessfully generated X post:")
        print("-----------------------------------------------------")
        print(generated_post)
        print("-----------------------------------------------------")
        print(f"Post length: {len(generated_post)} characters.")
        if len(generated_post) > 280:
            print("Warning: Post exceeds 280 characters!")
        elif not generated_post.strip() or "Error:" in generated_post :
             print("Warning: Post generation may have failed or produced an error message.")

    except Exception as e:
        print("\n--- Error during X Post Generation ---")
        print(f"An error occurred: {e}")
        print("Please ensure your OPENAI_API_KEY is correctly set in your environment or .env file.")
        print(f"Current OPENAI_API_KEY: {'Set' if os.getenv('OPENAI_API_KEY') else 'Not Set'}")

if __name__ == "__main__":
    asyncio.run(main()) 