import os, json, textwrap, sys

# Ensure correct module path
from pathlib import Path
API_DIR = Path(__file__).resolve().parents[2]
if str(API_DIR) not in sys.path:
    sys.path.append(str(API_DIR))

# Try absolute import first; fall back if running inside package
try:
    from app.agents.tools import demo_generation  # type: ignore
except ModuleNotFoundError:
    from agents.tools import demo_generation  # type: ignore


if __name__ == "__main__":
    # ----- Same inputs as test_search_case.py -----
    feature_summary = (
        "We've rolled out a new sign-in flow to enhance security and user experience. "
        "Additionally, you can now import your existing projects directly from GitHub. "
        "When creating a new project, simply provide the GitHub repository link. "
        "The system will then index your codebase and load the commit history, "
        "making it easier to get started and providing valuable context from your project's past"
    )
    commit_message = (
        "Implemented login, and users can create a new project that links to their github repo. "
        "we now index the repo, process its commits and show the commit history on the dashboard page"
    )

    diff_text = textwrap.dedent(
        """diff --git a/web/src/app/commit-spark-demo/page.tsx b/web/src/app/commit-spark-demo/page.tsx
new file mode 100644
index 0000000..958f4cc
--- /dev/null
+++ b/web/src/app/commit-spark-demo/page.tsx
@@ -0,0 +1,77 @@
"use client";

import { useState } from 'react';

export default function CommitSparkDemoPage() {
  const [commitMessage, setCommitMessage] = useState(
    "feat: Implement initial draft of Commit Spark feature (UI Mock)"
  );
  const [generatedTweet, setGeneratedTweet] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateTweet = () => {
    setIsLoading(true);
    // Simulate AI generation time
    setTimeout(() => {
      setGeneratedTweet(
        "🚀 Just launched 'Commit Spark' from our Build-in-Public Autopilot! Turns your latest commit into an instant tweet draft. Check out how we're making #buildinpublic a breeze! #devtool #AI #Innovation"
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

    repo_name = "buildie"

    # URL where the React app is running locally (adjust if different)
    app_url = os.getenv("APP_URL", "http://localhost:3000")

    print("Running demo_generation … this will open a headless browser and record a video ✔️")

    out = demo_generation(
        feature_summary=feature_summary,
        commit_message=commit_message,
        diff_text=diff_text,
        repo_name=repo_name,
        app_url=app_url,
        top_k=5,
    )

    print("\nResult:\n" + json.dumps(out, indent=2)) 