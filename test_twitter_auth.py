import tweepy

# IMPORTANT: TEMPORARILY HARDCODE YOUR *NEWLY REGENERATED* CREDENTIALS HERE FOR TESTING.
# REMOVE OR COMMENT OUT THESE VALUES AFTER TESTING IS COMPLETE.

# Your API credentials (replace with newly generated values)
TWITTER_API_KEY = "PUz3ja91DqRvjfUdqdhHsBwwU"  # Your API Key
TWITTER_API_SECRET_KEY = "mW1xA2luUyqT4i4VA8rNljTHDIZ9ZlYXt9ZeDpDauRBuOLbsE4"

 # Your API Key Secret
TWITTER_ACCESS_TOKEN = "1634337121975640065-xCb2f6HzAZlfGvrZUMaJAHtf8rhC3n"  # Your Access Token
TWITTER_ACCESS_TOKEN_SECRET = "RFIvsbc13WWM4pIakTNkqrBW5FkWIyNozExPFUXguz03l"  # Your Access Token Secret

# Bearer token for OAuth 2.0 (uncomment and add your bearer token)
# TWITTER_BEARER_TOKEN = "YOUR_BEARER_TOKEN"

def test_twitter_auth_v1():
    """Test authentication using OAuth 1.0a (API v1.1)"""
    print("--- Testing Twitter API v1.1 with OAuth 1.0a ---")
    print(f"Using API Key: {TWITTER_API_KEY[:5]}...")
    print(f"Using Access Token: {TWITTER_ACCESS_TOKEN[:5]}...")

    try:
        auth = tweepy.OAuth1UserHandler(
            consumer_key=TWITTER_API_KEY,
            consumer_secret=TWITTER_API_SECRET_KEY,
            access_token=TWITTER_ACCESS_TOKEN,
            access_token_secret=TWITTER_ACCESS_TOKEN_SECRET
        )
        api = tweepy.API(auth)
        print("tweepy.API object initialized successfully.")
        
        print("Attempting to verify credentials (api.verify_credentials())...")
        user = api.verify_credentials()
        
        if user:
            print(f"\nSUCCESS! Authenticated as Twitter user: @{user.screen_name} (ID: {user.id_str})\n")
        else:
            print("\nFAILED: api.verify_credentials() did not return a user object.\n")
            
    except tweepy.TweepyException as e:
        print(f"\nFAILED with TweepyException:")
        print(f"  Error type: {type(e).__name__}")
        print(f"  Error message: {e}")
        if hasattr(e, 'api_codes'):
            print(f"  API Error Codes: {e.api_codes}")
        if hasattr(e, 'api_messages'):
            print(f"  API Error Messages: {e.api_messages}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"  HTTP Status Code: {e.response.status_code}")
            print(f"  Response Text: {e.response.text}")
        print("\n")
    except Exception as general_exception:
        print(f"\nFAILED with a non-Tweepy general exception: {type(general_exception).__name__} - {general_exception}\n")

def test_twitter_auth_v2():
    """Test authentication using OAuth 2.0 (API v2)"""
    print("--- Testing Twitter API v2 with OAuth 2.0 ---")
    
    # Check if bearer token is defined
    if 'TWITTER_BEARER_TOKEN' not in globals() or not TWITTER_BEARER_TOKEN:
        print("\nERROR: TWITTER_BEARER_TOKEN is not defined. Please uncomment and add your bearer token.\n")
        return
        
    print(f"Using Bearer Token: {TWITTER_BEARER_TOKEN[:5]}...")
    
    try:
        # Create client with bearer token
        client = tweepy.Client(bearer_token=TWITTER_BEARER_TOKEN)
        print("tweepy.Client object initialized successfully.")
        
        # Test the client by getting the authenticated user
        print("Attempting to get user info...")
        # Get your own user info - replace USER_NAME with your Twitter username
        user = client.get_user(username="USER_NAME")
        
        if user.data:
            print(f"\nSUCCESS! Got user info for: @{user.data.username} (ID: {user.data.id})\n")
        else:
            print("\nFAILED: Could not get user info.\n")
            
    except tweepy.TweepyException as e:
        print(f"\nFAILED with TweepyException:")
        print(f"  Error type: {type(e).__name__}")
        print(f"  Error message: {e}")
        print("\n")
    except Exception as general_exception:
        print(f"\nFAILED with a non-Tweepy general exception: {type(general_exception).__name__} - {general_exception}\n")

if __name__ == "__main__":
    print("Twitter API Authentication Test Script")
    print("=====================================")
    print("NOTE: Twitter has moved toward API v2 and OAuth 2.0.")
    print("If v1.1 authentication fails, try v2 authentication with a bearer token.\n")
    
    # Test OAuth 1.0a authentication (API v1.1)
    test_twitter_auth_v1()
    
    # Uncomment to test OAuth 2.0 authentication (API v2)
    # test_twitter_auth_v2() 