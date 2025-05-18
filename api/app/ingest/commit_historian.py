import os
import tempfile
import shutil
import git
import uuid
from supabase import create_client, Client
from typing import List, Dict, Any, Optional

# Remove analyze_changes_with_llm from import
from .diff_processor import get_commit_diff 
from ..services import supabase_service

COMMITS_TABLE_NAME = "commits"

class CommitHistorian:
    def __init__(self, supabase_url: str, supabase_key: str, openai_api_key: Optional[str] = None):
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL and Key must be provided for CommitHistorian.")
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Remove OpenAI API Key initialization/warning as it\'s no longer used by this class
        # if openai_api_key:
        #     os.environ['OPENAI_API_KEY'] = openai_api_key
        #     print("CommitHistorian: OpenAI API Key configured.")
        # elif not os.getenv("OPENAI_API_KEY"):
        #     print("CommitHistorian Warning: OpenAI API Key not provided and not in ENV. LLM functions may be skipped.")

        print("CommitHistorian initialized.")


    async def ingest_commit_history(self, project_id: uuid.UUID, repo_url: str, github_repo_id: Optional[int] = None, project_name: Optional[str] = None, project_full_name: Optional[str] = None, project_description: Optional[str] = None, project_private: Optional[bool] = False, project_owner_user_id: Optional[uuid.UUID] = None):
        """
        Clones a repository, extracts its commit history, fetches diffs,
        and stores comprehensive details in Supabase. LLM analysis removed.
        """
        if not project_id:
            print(f"CommitHistorian Error: project_id is required. Project ID: {project_id}")
            return

        repo_url_str = str(repo_url) # Ensure it's a string

        print(f"CommitHistorian: Starting full commit history ingestion for project_id: {project_id}, repo_url: {repo_url_str}")
        temp_dir = tempfile.mkdtemp()
        print(f"CommitHistorian: Created temporary directory: {temp_dir}")

        try:
            print(f"CommitHistorian: Cloning repo {repo_url_str}...")
            cloned_repo = git.Repo.clone_from(repo_url_str, temp_dir)
            print("CommitHistorian: Repo cloned.")

            commit_shas_processed = set()
            total_commits_iterated = 0
            successfully_processed_count = 0

            # Ensure project exists in Supabase. This is important because store_commit_details needs project_id.
            # The project_id is passed in, but let's verify/create the project entry if needed,
            # similar to how process_github_commit_data does.
            # This requires github_repo_id, name, full_name, html_url, etc.
            # We are adding these to the method signature.

            # Use a placeholder if github_repo_id is not provided.
            # A more robust way would be to fetch it if not available.
            effective_github_repo_id = github_repo_id if github_repo_id else hash(repo_url_str) % (10**9) # Simple placeholder

            project_details_for_creation = {
                "github_repo_id": effective_github_repo_id,
                "full_name": project_full_name or repo_url_str.split('/')[-2] + '/' + repo_url_str.split('/')[-1].replace('.git',''),
                "name": project_name or repo_url_str.split('/')[-1].replace('.git',''),
                "html_url": repo_url_str,
                "description": project_description,
                "private": project_private,
                "user_id": project_owner_user_id
            }
            
            # This call assumes `get_or_create_project` handles `project_id` consistency if it's already known.
            # If `project_id` is the definitive ID from our system, we might not need to call get_or_create_project
            # if we are sure it exists. However, `store_commit_details` uses it.
            # The `process_github_commit_data` example suggests `get_or_create_project` returns the project object
            # from which `project_id` is then taken.
            # For now, let's assume the passed `project_id` is valid and directly usable.
            # If `store_commit_details` requires more project context that `project_id` alone doesn't give,
            # this part might need adjustment.

            print(f"CommitHistorian: Iterating through commits for project {project_id}...")
            for commit in cloned_repo.iter_commits('--all'):
                total_commits_iterated += 1
                if commit.hexsha in commit_shas_processed:
                    print(f"CommitHistorian: Skipping already processed SHA: {commit.hexsha[:7]}")
                    continue
                commit_shas_processed.add(commit.hexsha)

                print(f"CommitHistorian: Processing commit {commit.hexsha[:7]} ({total_commits_iterated})...")

                # 1. Fetch Diff
                diff_text = await get_commit_diff(repo_html_url=repo_url_str, commit_sha=commit.hexsha)
                if diff_text is None:
                    print(f"Warning: Could not fetch diff for commit {commit.hexsha[:7]}. Some analyses might be skipped.")
                
                # 2. LLM Analysis - This section is removed.
                # llm_analysis_results = {"change_summary": "Diff not available for LLM.", "is_feature_shipped": None}
                # if diff_text:
                #     try:
                #         llm_analysis_results = await analyze_changes_with_llm(diff_text, commit.message.strip() if commit.message else "")
                #     except Exception as e_llm:
                #         print(f"Error during LLM analysis for commit {commit.hexsha[:7]}: {e_llm}")
                #         llm_analysis_results = {"change_summary": f"LLM analysis failed: {e_llm}", "is_feature_shipped": None}
                
                # 3. Changed Files
                changed_files_data = []
                try:
                    # Diff against parent (or EMPTY_TREE for initial commit)
                    parent_commit = commit.parents[0] if commit.parents else git.EMPTY_TREE
                    diff_index = commit.diff(parent_commit, create_patch=False)

                    for diff_item in diff_index: # Iterates over all change types
                        status = "modified" # Default
                        file_path = diff_item.b_path or diff_item.a_path # b_path for new/modified, a_path for deleted

                        if diff_item.new_file:
                            status = "added"
                            file_path = diff_item.b_path
                        elif diff_item.deleted_file:
                            status = "deleted"
                            file_path = diff_item.a_path
                        elif diff_item.renamed_file:
                            status = "renamed" # supabase_service.store_commit_details expects added, removed, modified
                                              # We can log renamed as modified b_path, or a delete of a_path and add of b_path.
                                              # For simplicity, let's mark as modified for now.
                            file_path = diff_item.b_path # The new path
                        elif diff_item.a_mode != diff_item.b_mode : # Check for type change (e.g. file to symlink)
                             status = "type_changed" # Or "modified"
                             file_path = diff_item.b_path

                        if file_path: # Ensure file_path is not None
                             changed_files_data.append({"file_path": file_path, "status": status})
                
                except Exception as e_diff_files:
                    print(f"Error extracting changed files for commit {commit.hexsha[:7]}: {e_diff_files}")
                    # Fallback to commit.stats.files if precise status is hard
                    if hasattr(commit, 'stats') and hasattr(commit.stats, 'files'):
                        for file_path in commit.stats.files.keys():
                            changed_files_data.append({"file_path": file_path, "status": "modified"}) # Generic status

                # 4. Prepare data and store
                # Construct a minimal raw_commit_payload, store_commit_details expects a dict.
                raw_commit_data_for_storage = {
                    "hexsha": commit.hexsha,
                    "authored_date": commit.authored_datetime.isoformat(),
                    "committed_date": commit.committed_datetime.isoformat(),
                    "summary": commit.summary,
                    "stats": {path: stats for path, stats in commit.stats.files.items()} if hasattr(commit, 'stats') and hasattr(commit.stats, 'files') else {}
                }

                try:
                    await supabase_service.store_commit_details(
                        project_id=str(project_id), # Ensure UUID is string
                        commit_sha=commit.hexsha,
                        message=commit.message.strip() if commit.message else None,
                        commit_timestamp=commit.committed_datetime.isoformat(),
                        compare_url=f"{repo_url_str}/commit/{commit.hexsha}", # Standard commit URL
                        
                        author_name=commit.author.name,
                        author_email=commit.author.email,
                        author_github_username=None, # Not available from git.Commit
                        
                        committer_name=commit.committer.name,
                        committer_email=commit.committer.email,
                        committer_github_username=None, # Not available from git.Commit

                        pusher_name=None, # Not applicable for historical ingestion
                        pusher_email=None, # Not applicable for historical ingestion
                        
                        diff_text=diff_text,
                        # change_summary=llm_analysis_results.get("change_summary"), # Removed
                        # is_feature_shipped=llm_analysis_results.get("is_feature_shipped"), # Removed
                        
                        raw_commit_payload=raw_commit_data_for_storage,
                        raw_push_event_payload=None, # Not applicable
                        changed_files=changed_files_data
                    )
                    successfully_processed_count += 1
                    if successfully_processed_count % 10 == 0 : # Log progress periodically
                         print(f"CommitHistorian: Successfully processed {successfully_processed_count} commits so far.")

                except Exception as e_store:
                    print(f"CommitHistorian: Error storing commit details for {commit.hexsha[:7]}: {e_store}")
                    # Optionally, add to a list of failed commits for retry or logging

            print(f"CommitHistorian: Finished iterating. Processed {len(commit_shas_processed)} unique commits ({total_commits_iterated} total iterated).")
            print(f"CommitHistorian: Successfully stored details for {successfully_processed_count} commits.")

        except git.exc.GitCommandError as e_git:
            print(f"CommitHistorian: Git command error during ingestion for project {project_id}: {e_git}")
        except Exception as e_main:
            print(f"CommitHistorian: An error occurred during ingestion for project {project_id}: {e_main}")
            import traceback
            traceback.print_exc()
        finally:
            print(f"CommitHistorian: Cleaning up temporary directory: {temp_dir}")
            shutil.rmtree(temp_dir) 