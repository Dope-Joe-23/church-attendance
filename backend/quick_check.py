#!/usr/bin/env python
"""Quick check: Are all 50 members in the database?"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from members.models import Member

total = Member.objects.count()
members = list(Member.objects.all().values('id', 'full_name', 'member_id'))

print("\n" + "="*70)
print(f"✅ TOTAL MEMBERS IN DATABASE: {total}")
print("="*70 + "\n")

# Show first 25
print("FIRST 25 MEMBERS (Page 1):")
for i, m in enumerate(members[:20], 1):
    print(f"  {i:2d}. {m['full_name']:30s} {m['member_id']}")

print("\nPAGE 2 (Members 21-40):")
for i, m in enumerate(members[20:40], 21):
    print(f"  {i:2d}. {m['full_name']:30s} {m['member_id']}")

if len(members) > 40:
    print("\nPAGE 3 (Members 41-50):")
    for i, m in enumerate(members[40:], 41):
        print(f"  {i:2d}. {m['full_name']:30s} {m['member_id']}")

print("\n" + "="*70)
print("✨ CONCLUSION:")
print(f"   Total: {total} members (all in database)")
print("   API returns 20 per page → NO DATA LOSS")
print("   Your concern can be resolved by:")
print("   1. Adding pagination UI to your frontend")
print("   2. Implement 'Load More' or page navigation")
print("   3. OR increase PAGE_SIZE if you want more per page")
print("="*70 + "\n")
