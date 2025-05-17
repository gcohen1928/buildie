import asyncio
import os
import subprocess
from pathlib import Path
import tempfile
import shutil

# from supabase import create_client, Client # If uploading from here

# Base URL for Playwright tests, should come from env
# PLAYWRIGHT_BASE_URL = os.getenv("PLAYWRIGHT_BASE_URL", "http://localhost:3000")
# Path to the playwright-runner directory, relative to this file or absolute
# This needs to be robust. Assuming api and playwright-runner are siblings in autopilot/
PLAYWRIGHT_RUNNER_DIR = Path(__file__).resolve().parent.parent.parent.parent / "playwright-runner"

async def record_video_segment(project_id: str, commit_sha: str, supabase_client: any = None, duration_seconds: int = 20) -> str | None:
    """Records a video using the Playwright runner, trims it, and uploads to Supabase Storage.
    
    Args:
        project_id: Identifier for the project (e.g., repo name).
        commit_sha: Commit SHA for context, might be used in test or naming.
        supabase_client: Initialized Supabase client for uploads.
        duration_seconds: Desired duration of the video.

    Returns:
        The public URL of the uploaded video in Supabase Storage, or None on failure.
    """
    print(f"Attempting to record video for project {project_id}, commit {commit_sha}.")

    if not shutil.which("ffmpeg"):
        print("Error: ffmpeg is not installed or not in PATH. Video trimming will fail.")
        # Depending on requirements, you might still proceed with recording and skip trimming,
        # or fail here. For now, we'll let it try and fail at the ffmpeg step.

    # Create a temporary directory for Playwright output (videos, traces)
    with tempfile.TemporaryDirectory(prefix="playwright_record_") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        video_raw_path = temp_dir / f"{project_id.replace('/', '_')}_{commit_sha}_raw.mp4"
        video_trimmed_path = temp_dir / f"{project_id.replace('/', '_')}_{commit_sha}_trimmed.mp4"

        # Command to run the Playwright script via the shell script
        # The shell script should handle running the specific test and outputting the video
        # It might need environment variables like BASE_URL or specific test file.
        # The record.sh script is expected to place the video at a known location or print its path.
        # For now, assume record.sh saves it as 'output/video.mp4' relative to playwright-runner dir.
        
        record_script_path = PLAYWRIGHT_RUNNER_DIR / "record.sh"
        if not record_script_path.exists():
            print(f"Error: Playwright runner script not found at {record_script_path}")
            return None

        # Environment variables for the Playwright script
        playwright_env = os.environ.copy()
        playwright_env["PLAYWRIGHT_OUTPUT_DIR"] = str(temp_dir) # Tell Playwright where to save
        playwright_env["VIDEO_FILENAME_RAW"] = str(video_raw_path.name)
        playwright_env["BASE_URL"] = os.getenv("PLAYWRIGHT_BASE_URL", "http://localhost:3000")
        # Add other necessary env vars like storageState path if record.sh expects it
        # playwright_env["STORAGE_STATE_PATH"] = str(PLAYWRIGHT_RUNNER_DIR / "storageState.json")

        print(f"Running Playwright script: {record_script_path} in {PLAYWRIGHT_RUNNER_DIR}")
        process = await asyncio.create_subprocess_shell(
            f'bash {record_script_path.name}', # Make sure record.sh is executable and uses its dir for context
            cwd=str(PLAYWRIGHT_RUNNER_DIR), # Execute record.sh from its own directory
            env=playwright_env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            print(f"Error running Playwright script (return code {process.returncode}):")
            if stdout:
                print(f"[Playwright STDOUT]:\n{stdout.decode()}")
            if stderr:
                print(f"[Playwright STDERR]:\n{stderr.decode()}")
            return None
        
        print(f"Playwright script finished. Raw video expected at: {video_raw_path}")
        if stdout:
            print(f"[Playwright STDOUT]:\n{stdout.decode().strip()}")
        if stderr:
             print(f"[Playwright STDERR]:\n{stderr.decode().strip()}")

        if not video_raw_path.exists():
            print(f"Error: Raw video file not found at {video_raw_path} after Playwright script execution.")
            return None

        # Trim the video using ffmpeg
        print(f"Trimming video to {duration_seconds}s: {video_raw_path} -> {video_trimmed_path}")
        ffmpeg_command = [
            "ffmpeg", "-y",
            "-i", str(video_raw_path),
            "-t", str(duration_seconds),
            "-c:v", "libx264", # Re-encode to ensure compatibility and clean cut
            "-preset", "medium",
            "-crf", "23",
            "-c:a", "aac",
            "-strict", "experimental", # For AAC
            str(video_trimmed_path)
        ]
        try:
            trim_process = await asyncio.create_subprocess_exec(
                *ffmpeg_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            trim_stdout, trim_stderr = await trim_process.communicate()
            if trim_process.returncode != 0:
                print(f"Error trimming video (ffmpeg return code {trim_process.returncode}):")
                print(f"[FFMPEG STDOUT]:\n{trim_stdout.decode()}")
                print(f"[FFMPEG STDERR]:\n{trim_stderr.decode()}")
                # Fallback: use raw video if trimming fails? Or just fail.
                if video_raw_path.exists() and not video_trimmed_path.exists(): # If trim failed to produce output
                    print("Trimming failed, attempting to use raw video path.")
                    final_video_path = video_raw_path
                elif not video_trimmed_path.exists():
                     print("Trimming failed and no trimmed video produced, and raw is also gone?")
                     return None
                else:
                    final_video_path = video_trimmed_path # It might have created it but still errored
            else:
                print(f"Video trimmed successfully: {video_trimmed_path}")
                final_video_path = video_trimmed_path

        except FileNotFoundError: # ffmpeg not found
            print("Error: ffmpeg command not found. Skipping trimming. Using raw video.")
            if not video_raw_path.exists():
                print("Raw video also not found. Cannot proceed.")
                return None
            final_video_path = video_raw_path
        except Exception as e:
            print(f"An unexpected error occurred during ffmpeg trimming: {e}")
            return None
        
        if not final_video_path.exists():
            print(f"Error: Final video file {final_video_path} does not exist before upload attempt.")
            return None

        # Upload to Supabase Storage
        if supabase_client:
            # TODO: Implement Supabase upload logic
            # storage_path = f"videos/{project_id.replace('/', '_')}/{commit_sha}/{final_video_path.name}"
            # print(f"Uploading {final_video_path} to Supabase Storage at {storage_path}...")
            # with open(final_video_path, 'rb') as f:
            #     try:
            #         # res = await supabase_client.storage.from_("videos").upload(storage_path, f)
            #         # if res.status_code == 200:
            #         #     # public_url_response = await supabase_client.storage.from_("videos").get_public_url(storage_path)
            #         #     # video_url = public_url_response.data.get('publicURL') # Adjust based on actual response
            #         #     print(f"Video uploaded successfully. Public URL (placeholder): {video_url}")
            #         #     return video_url 
            #         print(f"(Placeholder) Video uploaded to Supabase. Path: {storage_path}")
            #         return f"https://fake.supabase.co/storage/v1/object/public/videos/{storage_path}" # Placeholder URL

            #     except Exception as e:
            #         print(f"Error uploading video to Supabase: {e}")
            #         return None
            print(f"(Placeholder) Supabase client provided, would upload {final_video_path}.")
            return f"https://placeholder.supabase.com/videos/{final_video_path.name}" # Placeholder URL
        else:
            print("Supabase client not provided. Skipping upload. Video available at: ", str(final_video_path))
            # In a real scenario, if not uploading, what should be returned? Path, or handle differently.
            return str(final_video_path) # Return local path if no Supabase client

    return None # Should ideally not be reached if logic is correct

# Example usage:
# async def main():
#     # Mock Supabase client
#     class MockSupabaseClient:
#         pass # Add mock storage methods if needed for deeper testing

#     video_location = await record_video_segment(
#         project_id="test/project", 
#         commit_sha="abcdef123", 
#         supabase_client=None # Pass MockSupabaseClient() to test upload path
#     )
#     if video_location:
#         print(f"Video recording process finished. Final location: {video_location}")
#     else:
#         print("Video recording process failed.")

# if __name__ == '__main__':
#     asyncio.run(main()) 