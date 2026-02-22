import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User

# Create a test client
client = Client()

# Make a GET request to /api/services/
response = client.get('/api/services/')

print(f"Status Code: {response.status_code}")
print(f"Content-Type: {response.get('Content-Type')}")
print(f"Response Body:\n{response.content.decode('utf-8')}")
