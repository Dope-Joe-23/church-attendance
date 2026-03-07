#!/usr/bin/env python
"""
Development server runner that ensures SQLite is used locally
"""
import os
import sys
import django

# Clear the problematic DATABASE_URL to force SQLite usage
if 'DATABASE_URL' in os.environ:
    supabase_url = os.environ.get('DATABASE_URL', '')
    if 'supabase' in supabase_url.lower():
        # It's a remote database, clear it for local development
        del os.environ['DATABASE_URL']
        print("ℹ️  Cleared remote DATABASE_URL, using SQLite for local development")

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

# Import after Django setup
from django.core.management import execute_from_command_line

if __name__ == '__main__':
    # Run the server
    sys.argv = ['manage.py', 'runserver', '0.0.0.0:8000']
    execute_from_command_line(sys.argv)
