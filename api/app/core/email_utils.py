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
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }}
  .container {{ max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
  .header {{ background-color: #007bff; color: #ffffff; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px; }}
  .header h1 {{ margin: 0; font-size: 24px; }}
  .content {{ padding: 20px; line-height: 1.6; }}
  .content p {{ margin: 10px 0; }}
  .content strong {{ color: #0056b3; }}
  .button-container {{ text-align: center; margin-top: 30px; margin-bottom: 20px; }}
  .button {{ background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }}
  .footer {{ text-align: center; padding: 15px; font-size: 0.9em; color: #777; border-top: 1px solid #eeeeee; margin-top: 20px; }}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Feature Complete!</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>Great news! We noticed you've been working on the <strong>{project_name}</strong> project and have just completed the feature:</p>
      <p style="text-align: center; font-size: 1.1em;"><em>{feature_name}</em></p>
      <p>We're excited to help you share your progress. An initial post is being drafted for you automatically!</p>
      <div class="button-container">
        <a href="{post_generation_link}" class="button">Review Your Post</a>
      </div>
      <p>You can review, edit, and then publish it to share your awesome work.</p>
    </div>
    <div class="footer">
      <p>Thanks,<br>The {EMAIL_SENDER_NAME} Team</p>
      <p><a href="{YOUR_APP_BASE_URL}" style="color: #777;">Visit Buildie</a></p>
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