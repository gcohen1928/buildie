import os
import tempfile
import shutil
import git
import uuid
from supabase import create_client, Client
from postgrest.exceptions import APIError
from typing import List, Dict, Any # For type hinting if needed later

COMMITS_TABLE_NAME = "commits"

class CommitHistorian:
    def __init__(self, supabase_url: str, supabase_key: str):
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL and Key must be provided for CommitHistorian.")
        self.supabase: Client = create_client(supabase_url, supabase_key)
        print("CommitHistorian initialized with Supabase client.")

    async def ingest_commit_history(self, project_id: uuid.UUID, repo_url: str):
        """
        Clones a repository, extracts its commit history, and stores it in the 'commits' table.
        Maps to existing 'commits' table schema, without adding new aggregate stats columns.
        """
        if not project_id:
            print(f"CommitHistorian Error: project_id is required for ingesting commit history. Project ID: {project_id}")
            return

        # Ensure repo_url is a string, as it might be passed as Pydantic's HttpUrl
        repo_url_str = str(repo_url)

        print(f"CommitHistorian: Starting commit history ingestion for project_id: {project_id}, repo_url: {repo_url_str} into table '{COMMITS_TABLE_NAME}'")
        temp_dir = tempfile.mkdtemp()
        print(f"CommitHistorian: Created temporary directory for commit history: {temp_dir}")

        try:
            print(f"CommitHistorian: Cloning repo {repo_url_str} for commit history...")
            repo = git.Repo.clone_from(repo_url_str, temp_dir)
            print("CommitHistorian: Repo cloned for commit history.")

            commits_to_insert = []
            commit_shas_processed = set() # To avoid issues with strange git histories
            total_commits_iterated = 0
            successfully_upserted_count = 0

            print(f"CommitHistorian: Iterating through commits for project {project_id}...")
            for commit in repo.iter_commits('--all'): # Default is all branches, newest first from HEAD
                total_commits_iterated += 1
                if commit.hexsha in commit_shas_processed:
                    print(f"CommitHistorian: Skipping already processed SHA: {commit.hexsha[:7]}")
                    continue
                commit_shas_processed.add(commit.hexsha)
                
                commit_data = {
                    "project_id": str(project_id), 
                    "commit_sha": commit.hexsha,
                    "message": commit.message.strip() if commit.message else None,
                    "commit_timestamp": commit.committed_datetime.isoformat(), 
                    "author_name": commit.author.name,
                    "author_email": commit.author.email,
                    "committer_name": commit.committer.name,
                    "committer_email": commit.committer.email,
                }
                commits_to_insert.append(commit_data)

                if total_commits_iterated % 100 == 0:
                    print(f"CommitHistorian: Iterated {total_commits_iterated} commits... Current batch size {len(commits_to_insert)}")
                
                if len(commits_to_insert) >= 50: 
                    print(f"CommitHistorian: Attempting to upsert batch of {len(commits_to_insert)} commits for project {project_id}...")
                    try:
                        response = self.supabase.table(COMMITS_TABLE_NAME)\
                            .upsert(commits_to_insert, on_conflict='project_id,commit_sha')\
                            .execute()
                        if hasattr(response, 'error') and response.error:
                            print(f"CommitHistorian: ERROR upserting commit batch: {response.error}")
                        else:
                            print(f"CommitHistorian: Successfully submitted batch of {len(commits_to_insert)} commits for upsert.")
                            successfully_upserted_count += len(commits_to_insert) 
                    except APIError as e_api:
                        print(f"CommitHistorian: APIError during Supabase commit batch upsert: {e_api.message}")
                        if hasattr(e_api, 'details'): print(f"  Details: {e_api.details}")
                        if hasattr(e_api, 'hint'): print(f"  Hint: {e_api.hint}")    
                    except Exception as e_insert:
                        print(f"CommitHistorian: Exception during Supabase commit batch upsert: {e_insert}")
                    commits_to_insert = [] # Reset batch after attempt
            
            print(f"CommitHistorian: Finished iterating commits. Total unique commits encountered: {len(commit_shas_processed)} (iterated {total_commits_iterated} times).")

            if commits_to_insert: # Upsert any remaining commits
                print(f"CommitHistorian: Attempting to upsert final batch of {len(commits_to_insert)} commits for project {project_id}...")
                try:
                    response = self.supabase.table(COMMITS_TABLE_NAME)\
                        .upsert(commits_to_insert, on_conflict='project_id,commit_sha')\
                        .execute()
                    if hasattr(response, 'error') and response.error:
                        print(f"CommitHistorian: ERROR upserting final commit batch: {response.error}")
                    else:
                        print(f"CommitHistorian: Successfully submitted final batch of {len(commits_to_insert)} commits for upsert.")
                        successfully_upserted_count += len(commits_to_insert)
                except APIError as e_api_final:
                    print(f"CommitHistorian: APIError during final Supabase commit batch upsert: {e_api_final.message}")
                except Exception as e_final_insert:
                    print(f"CommitHistorian: Exception during final Supabase commit batch upsert: {e_final_insert}")
            
            print(f"CommitHistorian: Commit history ingestion: A total of {successfully_upserted_count} commits were submitted for upsert for project {project_id}.")

        except git.exc.GitCommandError as e_git: # Ensure git is imported if using git.exc
            print(f"CommitHistorian: Git command error during commit history ingestion for project {project_id}: {e_git}")
        except Exception as e_main:
            print(f"CommitHistorian: An error occurred during commit history ingestion for project {project_id}: {e_main}")
            import traceback # Keep traceback import local to where it's used
            traceback.print_exc()
        finally:
            print(f"CommitHistorian: Finished ingest_commit_history task for project {project_id}. Cleaning up temporary directory: {temp_dir}")
            shutil.rmtree(temp_dir) 