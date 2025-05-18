import os
import asyncio
import emails
from emails.template import JinjaTemplate
from typing import Optional # Added Optional just in case, though not strictly used in current signature

# Application Configuration relevant to emails
DESIGNATED_EMAIL_ADDRESS = os.getenv("FEATURE_COMPLETE_EMAIL_RECIPIENT", "your_email@example.com")
YOUR_APP_BASE_URL = os.getenv("APP_BASE_URL", "https://your-app-domain.com")

# SMTP Configuration from environment variables
EMAIL_SMTP_HOST = os.getenv("EMAIL_SMTP_HOST", "smtp.example.com")
EMAIL_SMTP_PORT = int(os.getenv("EMAIL_SMTP_PORT", "587"))
EMAIL_SMTP_USER = os.getenv("EMAIL_SMTP_USER", "user@example.com")
EMAIL_SMTP_PASSWORD = os.getenv("EMAIL_SMTP_PASSWORD", "password")
EMAIL_SENDER_EMAIL = os.getenv("EMAIL_SENDER_EMAIL", "noreply@buildie.io")
EMAIL_SENDER_NAME = os.getenv("EMAIL_SENDER_NAME", "Buildie Autopilot")
EMAIL_SMTP_USE_TLS = os.getenv("EMAIL_SMTP_USE_TLS", "true").lower() == "true"

async def send_feature_completion_email(project_name: str, feature_name: str, recipient_email: str):
    """
    Sends an email notification about feature completion using the 'emails' library.
    """
    subject = f"🎉 Feature '{feature_name}' Completed in {project_name}!"
    
    safe_feature_name = feature_name.replace(" ", "%20").replace("&", "%26").replace("?", "%3F")
    safe_project_name = project_name.replace(" ", "%20").replace("/", "%2F")
    post_generation_link = f"{YOUR_APP_BASE_URL}/generate-post?project={safe_project_name}&feature={safe_feature_name}"
    
    # Updated HTML content for a nicer email
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Feature Completed: {feature_name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
    margin: 0;
    padding: 0;
    background-color: #1A1A2E; /* Dark background to match app */
    color: #DCDCDC; /* Lighter default body text for better overall legibility */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }}
  .container {{
    max-width: 600px;
    margin: 40px auto;
    background-color: #2A2A3E; /* Slightly lighter panel background */
    padding: 0;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    overflow: hidden; /* Ensures border radius is respected by inner elements */
  }}
  .header {{
    background-color: #4A00E0; /* Vibrant purple accent */
    color: #ffffff;
    padding: 30px 20px;
    text-align: center;
  }}
  .header h1 {{
    margin: 0;
    font-size: 28px;
    font-weight: 700;
  }}
  .content {{
    padding: 30px 35px;
    line-height: 1.7;
    color: #F5F5F5; /* Significantly lighter text for main content area */
  }}
  .content p {{
    margin: 18px 0; /* Slightly increased margin for better readability */
    font-size: 16px;
    /* Color will be inherited from .content (#F5F5F5) */
  }}
  .content .feature-name {{
    font-size: 1.2em;
    font-weight: 600;
    color: #BB86FC; /* Lighter purple for emphasis */
    text-align: center;
    display: block;
    margin: 25px 0; /* Increased vertical margin */
    padding: 12px; /* Increased padding */
    background-color: rgba(255, 255, 255, 0.08); /* Slightly more opaque background for better pop */
    border-radius: 6px;
  }}
  .button-container {{
    text-align: center;
    margin-top: 35px;
    margin-bottom: 25px;
  }}
  .button {{
    background-color: #4A00E0; /* Consistent purple accent */
    color: white;
    padding: 14px 30px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    display: inline-block;
    transition: background-color 0.2s ease-in-out;
  }}
  .button:hover {{
    background-color: #5A10F0; /* Slightly lighter purple on hover */
  }}
  .footer {{
    text-align: center;
    padding: 25px;
    font-size: 0.9em;
    color: #BDBDBD; /* Lightened footer text */
    border-top: 1px solid #3A3A4E; /* Subtle separator line */
    margin-top: 20px;
  }}
  .footer a {{
    color: #BB86FC; /* Lighter purple for links */
    text-decoration: none;
  }}
  .footer a:hover {{
    text-decoration: underline;
  }}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Feature Complete!</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>Amazing news! We've detected that you've just completed a significant feature in your <strong>{project_name}</strong> project:</p>
      <div class="feature-name"><em>{feature_name}</em></div>
      <p>We're already drafting an initial post to help you showcase your hard work. Ready to take a look?</p>
      <div class="button-container">
        <a href="{post_generation_link}" class="button">Review Your Post</a>
      </div>
      <p>Feel free to review, tweak, and then publish it to share your awesome progress with the world.</p>
    </div>
    <div class="footer">
      <p>Keep up the great work,<br>The {EMAIL_SENDER_NAME} Team</p>
      <p><a href="{YOUR_APP_BASE_URL}">Visit Buildie</a></p>
    </div>
  </div>
</body>
</html>
"""
    html_body = JinjaTemplate(html_content)
    
    message = emails.Message(
        subject=subject,
        html=html_body,
        mail_from=(EMAIL_SENDER_NAME, EMAIL_SENDER_EMAIL)
    )
    
    smtp_config = {
        "host": EMAIL_SMTP_HOST,
        "port": EMAIL_SMTP_PORT,
        "user": EMAIL_SMTP_USER,
        "password": EMAIL_SMTP_PASSWORD,
        "tls": EMAIL_SMTP_USE_TLS,
    }

    print(f"--- Preparing Email Notification (from email_utils) ---")
    print(f"To: {recipient_email}")
    print(f"From: {EMAIL_SENDER_NAME} <{EMAIL_SENDER_EMAIL}>")
    print(f"Subject: {subject}")
    print(f"SMTP Host: {EMAIL_SMTP_HOST}")
    # Avoid printing passwords or sensitive details in production logs
    print(f"Body (HTML will be sent):\nHi there,\nWe noticed that you've been working on the {project_name} project and have just completed the feature: {feature_name}.\nWe're generating a post for you automatically!\nClick here to check out the post: {post_generation_link}\nThanks,\nThe {EMAIL_SENDER_NAME} Team")

    try:
        response = await asyncio.to_thread(message.send, to=recipient_email, smtp=smtp_config)
        if response and response.status_code in [250, 251, 252]: # Common SMTP success codes
             print(f"Email sent successfully to {recipient_email}! Response: {response.status_code}")
        else:
            print(f"Failed to send email. Response: {response.status_text if response else 'No response'} (Code: {response.status_code if response else 'N/A'})")
    except Exception as e:
        print(f"Error sending email to {recipient_email}: {e}") 