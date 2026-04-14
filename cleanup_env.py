#!/usr/bin/env python
"""Cleanup script to remove backend/.env after consolidation to root."""
import os
import sys

backend_env = os.path.join(os.path.dirname(__file__), 'backend', '.env')

if os.path.exists(backend_env):
    try:
        os.remove(backend_env)
        print(f"✓ Deleted {backend_env}")
        sys.exit(0)
    except Exception as e:
        print(f"✗ Failed to delete {backend_env}: {e}")
        sys.exit(1)
else:
    print(f"✓ {backend_env} does not exist (already cleaned up)")
    sys.exit(0)
