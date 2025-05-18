import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Determine the path to the root .env file
# __file__ is api/app/core/supabase_client.py
# os.path.dirname(__file__) is api/app/core
# os.path.dirname(os.path.dirname(__file__)) is api/app
# os.path.dirname(os.path.dirname(os.path.dirname(__file__))) is api/
# So, for the root .env, it should be one more level up from api/
# Correct path from api/app/core/supabase_client.py to buildie/.env
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL: str = os.environ.get("SUPABASE_URL")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY") # Using ANON_KEY for client-like operations from backend
# SUPABASE_SERVICE_KEY: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # For admin operations

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable not found.")
if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY environment variable not found.")

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# If you need a client with service_role privileges for specific admin tasks:
# supabase_admin_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) 