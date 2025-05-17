import os
import httpx # For making mock API calls, or use `requests` if already a dependency

TWITTER_BEARER_FAKE = os.getenv("TWITTER_BEARER_FAKE", "faketwitterbearertoken")
LINKEDIN_TOKEN_FAKE = os.getenv("LINKEDIN_TOKEN_FAKE", "fakelinkedintoken")

# TODO: Replace these with actual API client libraries if/when moving beyond mocks
# For now, we'll just print and simulate an external call.

async def post_to_twitter(text: str, video_url: str | None = None) -> dict:
    """Mocks posting a tweet. In a real app, use Twitter API v2 (e.g., tweepy)."""
    print("--- Mock Twitter Post ---")
    print(f"Bearer Token: {TWITTER_BEARER_FAKE[:10]}...")
    print(f"Text: {text}")
    if video_url:
        print(f"Video URL: {video_url}")
    print("-------------------------")
    # Simulate API call
    # async with httpx.AsyncClient() as client:
    #     response = await client.post("https://api.twitter.com/2/tweets", json={"text": text})
    #     if response.status_code == 201: return {"status": "success", "id": response.json()["data"]["id"]}
    #     else: return {"status": "error", "detail": response.text}
    return {"status": "success_mock", "platform": "twitter", "id": "fake_tweet_id_123", "text_length": len(text)}

async def post_to_linkedin(text: str, video_url: str | None = None, author_urn: str = "urn:li:person:mockuser") -> dict:
    """Mocks posting to LinkedIn. In a real app, use LinkedIn API.
    Author URN is typically needed for LinkedIn posts.
    """
    print("--- Mock LinkedIn Post ---")
    print(f"Access Token: {LINKEDIN_TOKEN_FAKE[:10]}...")
    print(f"Author URN: {author_urn}")
    print(f"Text: {text}")
    if video_url:
        print(f"Video URL: {video_url}") # LinkedIn might require video upload first to get an asset URN
    print("--------------------------")
    # Simulate API call
    # payload = {
    #     "author": author_urn,
    #     "lifecycleState": "PUBLISHED",
    #     "specificContent": {
    #         "com.linkedin.ugc.ShareContent": {
    #             "shareCommentary": {"text": text},
    #             "shareMediaCategory": "NONE" # or "ARTICLE", "IMAGE", "VIDEO"
    #             # If video: add "media": [{"status": "READY", "media": "<video_asset_urn>"}]
    #         }
    #     },
    #     "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
    # }
    # async with httpx.AsyncClient() as client:
    #     response = await client.post("https://api.linkedin.com/v2/ugcPosts", json=payload)
    #     if response.status_code == 201: return {"status": "success", "id": response.headers.get("x-linkedin-id")}
    #     else: return {"status": "error", "detail": response.text}
    return {"status": "success_mock", "platform": "linkedin", "id": "fake_linkedin_post_id_456", "text_length": len(text)}

# Example Usage:
# async def main():
#     tweet_response = await post_to_twitter("Hello from Autopilot! #buildinpublic", video_url="http://example.com/video.mp4")
#     print(f"Tweet mock response: {tweet_response}")
#     linkedin_response = await post_to_linkedin("Excited to share an update on Autopilot! We are building in public.", video_url="http://example.com/video.mp4")
#     print(f"LinkedIn mock response: {linkedin_response}")

# if __name__ == '__main__':
#     import asyncio
#     asyncio.run(main()) 