import os
import re
import time  # Added time module for timestamp generation
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
import tweepy

# --- Twitter API Configuration ---
# Ensure these are set as environment variables in your backend environment
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET_KEY = os.getenv("TWITTER_API_SECRET_KEY")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_TOKEN_SECRET = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN") # Required for v2 client

router = APIRouter()

class TweetRequest(BaseModel):
    content: list[str] # Expecting a list of strings for a thread

def get_twitter_client_v2():
    print("--- Twitter Auth Test (Focus on OAuth 1.0a User Context) ---")
    print(f"TWITTER_API_KEY is set: {bool(TWITTER_API_KEY)} ({TWITTER_API_KEY[:5] if TWITTER_API_KEY else 'None'}...)")
    print(f"TWITTER_API_SECRET_KEY is set: {bool(TWITTER_API_SECRET_KEY)}")
    print(f"TWITTER_ACCESS_TOKEN is set: {bool(TWITTER_ACCESS_TOKEN)} ({TWITTER_ACCESS_TOKEN[:5] if TWITTER_ACCESS_TOKEN else 'None'}...)")
    print(f"TWITTER_ACCESS_TOKEN_SECRET is set: {bool(TWITTER_ACCESS_TOKEN_SECRET)}")
    # We are not primarily using Bearer Token for this specific client initialization for posting
    # but it's good to know if it's set, as other parts of Twitter API v2 might use it.
    print(f"TWITTER_BEARER_TOKEN is set: {bool(TWITTER_BEARER_TOKEN)} ({TWITTER_BEARER_TOKEN[:5] if TWITTER_BEARER_TOKEN else 'None'}...)")

    if not all([
        TWITTER_API_KEY,
        TWITTER_API_SECRET_KEY,
        TWITTER_ACCESS_TOKEN,
        TWITTER_ACCESS_TOKEN_SECRET,
    ]):
        print("Error: OAuth 1.0a credentials (API Key/Secret, Access Token/Secret) are not fully configured.")
        raise HTTPException(
            status_code=503,
            detail="OAuth 1.0a credentials for Twitter API are not fully configured.",
        )
    
    try:
        print("Attempting to initialize tweepy.API (v1.1) with OAuth 1.0a User Context (4 tokens)...")
        print(f"  Using API Key: {TWITTER_API_KEY[:5]}...")
        print(f"  Using Access Token: {TWITTER_ACCESS_TOKEN[:5]}...")

        auth = tweepy.OAuth1UserHandler(
            consumer_key=TWITTER_API_KEY,
            consumer_secret=TWITTER_API_SECRET_KEY,
            access_token=TWITTER_ACCESS_TOKEN,
            access_token_secret=TWITTER_ACCESS_TOKEN_SECRET
        )
        api_v1 = tweepy.API(auth)

        print("tweepy.API (v1.1) initialized. Attempting verify_credentials()...")
        # For v1.1, the equivalent of get_me() is verify_credentials()
        user_v1 = api_v1.verify_credentials()
        if not user_v1:
            print("verify_credentials() (v1.1) FAILED to return user data.")
            raise tweepy.TweepyException("Failed to authenticate with Twitter API v1.1 (OAuth 1.0a): Invalid credentials or permissions.")
        print(f"SUCCESS with tweepy.API (v1.1)! Authenticated as user: {user_v1.screen_name} (ID: {user_v1.id_str})")
        print("--- End Twitter Auth Test ---")
        return api_v1 # Return the v1.1 API object
    except tweepy.TweepyException as e:
        print(f"FAILED with tweepy.API (v1.1). TweepyException: {e}")
        print("--- End Twitter Auth Test ---")
        raise HTTPException(
            status_code=503,
            detail=f"Could not initialize Twitter API client (OAuth 1.0a): {e}",
        )
    except Exception as ex:
        print(f"FAILED with OAuth 1.0a. General Exception: {ex}")
        print("--- End Twitter Auth Test ---")
        raise HTTPException(
            status_code=503,
            detail=f"Could not initialize Twitter API client (OAuth 1.0a - general exception): {ex}",
        )

@router.post("/api/post_tweet", summary="Post a tweet or a thread to Twitter")
async def post_tweet_endpoint(
    request: TweetRequest = Body(...),
):
    """
    MOCK VERSION: Simulates posting content to Twitter without actually posting.
    Returns a successful response with fake tweet IDs and URLs for demo purposes.
    """
    if not request.content or not any(tweet.strip() for tweet in request.content):
        raise HTTPException(status_code=400, detail="Tweet content cannot be empty.")

    tweets_to_post = [tweet.strip() for tweet in request.content if tweet.strip()]
    if not tweets_to_post:
        raise HTTPException(status_code=400, detail="Tweet content resulted in no valid tweets after stripping whitespace.")

    try:
        # Use a real Twitter username for the URLs
        user_screen_name = "glenomenagabe"
        
        # Generate fake tweet data
        posted_tweet_data = []
        timestamp_base = int(time.time()) # Current timestamp as base
        
        for i, tweet_text in enumerate(tweets_to_post):
            # Generate a realistic-looking fake tweet ID (timestamp + random digits)
            fake_tweet_id = f"{timestamp_base}5{i}98{i}76543"
            
            posted_tweet_data.append({
                "id": fake_tweet_id,
                "text": tweet_text,
                "url": f"https://twitter.com/{user_screen_name}/status/{fake_tweet_id}"
            })
            
        # Print the content that would have been tweeted (for your reference during demo)
        print("\n--- MOCK TWEET CONTENT (FOR MANUAL POSTING) ---")
        for i, tweet in enumerate(tweets_to_post):
            print(f"Tweet {i+1}: {tweet}")
        print("--- END MOCK TWEET CONTENT ---\n")
        
        return {
            "message": "Tweet(s) posted successfully!",
            "posted_tweets": posted_tweet_data
        }

    except Exception as e:
        print(f"Unexpected error during mock tweet processing: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

# Remember to include this router in your main FastAPI app:
#
# from fastapi import FastAPI
# from .api import twitter_routes # Assuming twitter_routes.py is in an 'api' subdir
#
# app = FastAPI()
# app.include_router(twitter_routes.router, prefix="/twitter", tags=["Twitter"])
# # Or if you want /api/post_tweet directly under root:
# # app.include_router(twitter_routes.router)
#
# Make sure your .env file or environment has:
# TWITTER_API_KEY="your_key"
# TWITTER_API_SECRET_KEY="your_secret"
# TWITTER_ACCESS_TOKEN="your_token"
# TWITTER_ACCESS_TOKEN_SECRET="your_token_secret"
# TWITTER_BEARER_TOKEN="your_bearer_token" 