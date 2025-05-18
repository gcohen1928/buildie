import os
from indexer import RepoIndexer

# Sample feature change information
feature_summary = "after form submission, user can now see a thank you message appear right after"
git_commit_msg = "displaying thank you message upon form submission"
diff_snippet = """
diff --git a/src/RegistrationForm.js b/src/RegistrationForm.js
index 9ede7820..9e49bfd5 100644
--- a/src/RegistrationForm.js
+++ b/src/RegistrationForm.js
@@ -1,12 +1,12 @@
-// RegistrationForm.js
 import React, { useState } from 'react';
 import './RegistrationForm.css'; // Import the CSS file for styling
 import { db } from "./firebase";
-import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
+import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
 
 const RegistrationForm = () => {
   const [phoneNumber, setPhoneNumber] = useState('');
   const [selectedOrg, setSelectedOrg] = useState('');
+  const [submitted, setSubmitted] = useState(false); // State to track submission
"""

# Full diff content for better context extraction
full_diff = """
diff --git a/src/RegistrationForm.js b/src/RegistrationForm.js
index 9ede7820..9e49bfd5 100644
--- a/src/RegistrationForm.js
+++ b/src/RegistrationForm.js
@@ -1,12 +1,12 @@
-// RegistrationForm.js
 import React, { useState } from 'react';
 import './RegistrationForm.css'; // Import the CSS file for styling
 import { db } from "./firebase";
-import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
+import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
 
 const RegistrationForm = () => {
   const [phoneNumber, setPhoneNumber] = useState('');
   const [selectedOrg, setSelectedOrg] = useState('');
+  const [submitted, setSubmitted] = useState(false); // State to track submission
 
   const organizations = [
     'Cardiovascular Health Education Campaign'
@@ -21,55 +21,64 @@ const RegistrationForm = () => {
     setSelectedOrg(event.target.value);
   };
 
-  const handleSubmit = async(event) => {
+  const handleSubmit = async (event) => {
     event.preventDefault();
     if (RegistrationForm) {
-      await addDoc(collection(db, "input-group"),{
+      await addDoc(collection(db, "input-group"), {
         phone_number: phoneNumber,
         organization: selectedOrg,
         timestamp: serverTimestamp(),
-      })
+      });
       setPhoneNumber("");
       setSelectedOrg("");
+      setSubmitted(true); // Set submitted to true after form submission
     }
   };
 
   return (
     <div className="form-container">
-    <h1 className="title">Heart2Heart</h1>
-    <div className="description-container">
-      <p className="description-text">
-        A text message-based social network designed to encourage cardiovascular disease prevention
-      </p>
-    </div>
-      <form onSubmit={handleSubmit} className="registration-form">
-        <div className="input-group">
-          <input
-            type="tel"
-            id="phone"
-            value={phoneNumber}
-            onChange={handlePhoneNumberChange}
-            placeholder="Enter your phone number"
-            required
-          />
-        </div>
-        <div className="input-group">
-          <select
-            id="organizations"
-            value={selectedOrg}
-            onChange={handleOrgChange}
-            required
-          >
-            <option value="">Choose your organization</option>
-            {organizations.map((org, index) => (
-              <option key={index} value={org}>
-                {org}
-              </option>
-            ))}
-          </select>
+      {submitted ? (
+        <div className="thank-you-message">
+          <p>You are now enrolled in Heart2Heart!</p>
         </div>
-        <button type="submit">Register</button>
-      </form>
+      ) : (
+        <>
+          <h1 className="title">Heart2Heart</h1>
+          <div className="description-container">
+            <p className="description-text">
+              A text message-based social network designed to encourage cardiovascular disease prevention
+            </p>
+          </div>
+          <form onSubmit={handleSubmit} className="registration-form">
+            <div className="input-group">
+              <input
+                type="tel"
+                id="phone"
+                value={phoneNumber}
+                onChange={handlePhoneNumberChange}
+                placeholder="Enter your phone number"
+                required
+              />
+            </div>
+            <div className="input-group">
+              <select
+                id="organizations"
+                value={selectedOrg}
+                onChange={handleOrgChange}
+                required
+              >
+                <option value="">Choose your organization</option>
+                {organizations.map((org, index) => (
+                  <option key={index} value={org}>
+                    {org}
+                  </option>
+                ))}
+              </select>
+            </div>
+            <button type="submit">Register</button>
+          </form>
+        </>
+      )}
     </div>
   );
 };
"""

def get_test_credentials():
    """Get credentials from environment or prompt the user"""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("dotenv package not found, skipping .env file loading")

    # Try to get from environment
    openai_key = os.environ.get("OPENAI_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")

    # If any are missing, prompt for input
    if not all([openai_key, supabase_url, supabase_key]):
        print("Missing credentials. Please provide the following:")
        
        if not openai_key:
            openai_key = input("Enter your OpenAI API key: ").strip()
        
        if not supabase_url:
            supabase_url = input("Enter your Supabase URL: ").strip()
        
        if not supabase_key:
            supabase_key = input("Enter your Supabase API key: ").strip()
    
    return {
        "openai_api_key": openai_key,
        "supabase_url": supabase_url,
        "supabase_key": supabase_key
    }

def test_search():
    # Get credentials
    credentials = get_test_credentials()
    
    # Initialize the RepoIndexer with explicit credentials
    indexer = RepoIndexer(
        openai_api_key=credentials["openai_api_key"],
        supabase_url=credentials["supabase_url"],
        supabase_key=credentials["supabase_key"]
    )
    
    # Target repository name
    repo_name = "Heart2HeartSignUp"
    
    print("------ Testing basic search with combined query ------")
    # Create a basic combined query (original approach)
    combined_query = f"{feature_summary} {git_commit_msg} RegistrationForm form submission thank you message"
    
    # Search with the basic combined query
    basic_results = indexer.search_code(
        query=combined_query,
        project_id=None,  # Search all projects
        limit=5,
        similarity_threshold=0.4
    )
    
    # Print the basic results
    print(f"\nBasic search found {len(basic_results)} code chunks")
    for i, result in enumerate(basic_results, 1):
        print(f"Result {i} (Similarity: {result.get('similarity', 0):.4f}):")
        print(f"File: {result.get('file_path')}")
        print(f"Lines: {result.get('start_line')}-{result.get('end_line')}")
        print("-------------------\n")
    
    print("\n------ Testing enhanced search with context ------")
    # Use the enhanced search with context
    enhanced_results = indexer.search_code_with_context(
        feature_summary=feature_summary,
        commit_message=git_commit_msg,
        diff_content=full_diff,
        repo_name=repo_name,
        limit=5,
        similarity_threshold=0.4
    )
    
    # Print the enhanced results
    print(f"\nEnhanced search found {len(enhanced_results)} code chunks:\n")
    
    for i, result in enumerate(enhanced_results, 1):
        print(f"Result {i} (Similarity: {result.get('similarity', 0):.4f}):")
        print(f"File: {result.get('file_path')}")
        print(f"Lines: {result.get('start_line')}-{result.get('end_line')}")
        print(f"Type: {result.get('symbol_type')}")
        if result.get('symbol_name'):
            print(f"Symbol: {result.get('symbol_name')}")
        print("\nContent:")
        print("-------------------")
        print(result.get('content'))
        print("-------------------\n")

if __name__ == "__main__":
    test_search() 