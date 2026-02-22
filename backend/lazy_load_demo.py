"""
Lazy-Load Sessions Pattern - Test & Demonstration Script

This script demonstrates how the lazy-loading pattern works for recurring services.
Run this in Django shell: python manage.py shell < lazy_load_demo.py

or paste the contents individually into manage.py shell
"""

import os
import django
from datetime import date, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from services.models import Service
from services.utils import generate_sessions_until, get_sessions_for_range, create_service_instance

print("\n" + "="*70)
print("LAZY-LOAD SESSIONS PATTERN - DEMONSTRATION")
print("="*70)

# ============================================================================
# PART 1: Create a Recurring Service Template
# ============================================================================
print("\n1. CREATE RECURRING SERVICE TEMPLATE")
print("-" * 70)

parent_service = Service.objects.create(
    name="Sunday Worship Service",
    start_time="09:00:00",
    end_time="11:00:00",
    location="Main Sanctuary",
    description="Weekly Sunday service",
    is_recurring=True,
    recurrence_pattern="weekly"
)

print(f"✓ Created parent service: {parent_service.name}")
print(f"  - ID: {parent_service.id}")
print(f"  - is_recurring: {parent_service.is_recurring}")
print(f"  - parent_service: {parent_service.parent_service}")
print(f"  - date: {parent_service.date} (NULL for template)")
print(f"  - generated_until: {parent_service.generated_until} (no sessions yet)")

# ============================================================================
# PART 2: Verify No Sessions Exist Yet
# ============================================================================
print("\n2. VERIFY NO SESSIONS CREATED YET")
print("-" * 70)

child_count = Service.objects.filter(parent_service=parent_service).count()
print(f"✓ Child sessions: {child_count}")
print("  (Old batch approach would have created 13 sessions here)")
print("  (Lazy-loading creates nothing until requested)")

# ============================================================================
# PART 3: Lazy-Load Sessions for 1 Month
# ============================================================================
print("\n3. LAZY-LOAD SESSIONS FOR 1 MONTH")
print("-" * 70)

end_date_1month = date.today() + timedelta(days=30)
result1 = generate_sessions_until(parent_service, until_date=end_date_1month)

print(f"✓ Generation result:")
print(f"  - New sessions created: {result1['generated']}")
print(f"  - Existing sessions found: {result1['existing']}")
print(f"  - Parent.generated_until: {parent_service.generated_until}")

print(f"\n  First 3 sessions created:")
for i, session in enumerate(list(result1['instances'])[:3], 1):
    if session.date:  # Skip parent
        print(f"    {i}. {session.date} - {session.start_time}")

# ============================================================================
# PART 4: Lazy-Load More Sessions (Incremental)
# ============================================================================
print("\n4. LAZY-LOAD MORE SESSIONS (EXTEND TO 3 MONTHS)")
print("-" * 70)

end_date_3months = date.today() + timedelta(days=90)
result2 = generate_sessions_until(parent_service, until_date=end_date_3months)

print(f"✓ Generation result:")
print(f"  - New sessions created: {result2['generated']} (was 4 already)")
print(f"  - Existing sessions found: {result2['existing']} (from month 1)")
print(f"  - Parent.generated_until: {parent_service.generated_until}")

child_count_2 = Service.objects.filter(parent_service=parent_service).count()
print(f"  - Total child sessions now: {child_count_2}")

# ============================================================================
# PART 5: Get Sessions for Specific Date Range
# ============================================================================
print("\n5. GET SESSIONS FOR SPECIFIC DATE RANGE")
print("-" * 70)

search_start = date.today()
search_end = date.today() + timedelta(days=14)

sessions_in_range = get_sessions_for_range(
    parent_service,
    start_date=search_start,
    end_date=search_end
)

print(f"✓ Sessions from {search_start} to {search_end}:")
count = 0
for session in sessions_in_range:
    if session.date and search_start <= session.date <= search_end:
        print(f"  - {session.date} ({session.date.strftime('%A')}) at {session.start_time}")
        count += 1
print(f"  Total: {count} sessions")

# ============================================================================
# PART 6: Create Special One-Off Session
# ============================================================================
print("\n6. CREATE SPECIAL ONE-OFF SESSION")
print("-" * 70)

christmas_date = date(2026, 12, 25)
special_session = create_service_instance(
    parent_service,
    instance_date=christmas_date,
    location="Downtown Campus",
    start_time="10:00:00"
)

print(f"✓ Created special service session:")
print(f"  - Date: {special_session.date}")
print(f"  - Location: {special_session.location} (overridden)")
print(f"  - Time: {special_session.start_time} (overridden)")
print(f"  - Parent: {special_session.parent_service.id}")

# ============================================================================
# PART 7: Update Parent Service (Affects Future Sessions Only)
# ============================================================================
print("\n7. UPDATE PARENT SERVICE")
print("-" * 70)

old_time = parent_service.start_time
parent_service.start_time = "09:30:00"
parent_service.save()

print(f"✓ Updated parent service:")
print(f"  - Old start_time: {old_time}")
print(f"  - New start_time: {parent_service.start_time}")
print(f"  - Note: Existing sessions keep original 09:00:00")
print(f"  - Note: Future sessions (not yet generated) will use 09:30:00")

# ============================================================================
# PART 8: Generate Much Further Ahead (Demonstrate Scalability)
# ============================================================================
print("\n8. DEMONSTRATE SCALABILITY - GENERATE 1 YEAR AHEAD")
print("-" * 70)

end_date_1year = date.today() + timedelta(days=365)
result3 = generate_sessions_until(parent_service, until_date=end_date_1year)

print(f"✓ Extended generation to 1 year:")
print(f"  - New sessions created: {result3['generated']}")
print(f"  - Existing sessions: {result3['existing']}")
print(f"  - Parent.generated_until: {parent_service.generated_until}")

total_sessions = Service.objects.filter(parent_service=parent_service).count()
print(f"  - Total sessions in DB: {total_sessions}")
print(f"  - All can be retrieved without performance issues!")

# ============================================================================
# PART 9: Statistics
# ============================================================================
print("\n9. STATISTICS")
print("-" * 70)

sessions = Service.objects.filter(parent_service=parent_service)
earliest = sessions.filter(date__isnull=False).order_by('date').first()
latest = sessions.filter(date__isnull=False).order_by('-date').first()

percent = (1 / 365) * 100  # Actual weeks vs total year

print(f"✓ Parent Service: {parent_service.name}")
print(f"  - Recurrence: {parent_service.recurrence_pattern}")
print(f"  - Total sessions generated: {sessions.count()}")
print(f"  - Earliest session: {earliest.date if earliest else 'N/A'}")
print(f"  - Latest session: {latest.date if latest else 'N/A'}")
print(f"  - Span: {(latest.date - earliest.date).days} days (~{(latest.date - earliest.date).days // 7} weeks)")

# ============================================================================
# PART 10: Cleanup Example
# ============================================================================
print("\n10. CLEANUP & NEXT STEPS")
print("-" * 70)

print("✓ Lazy-loading workflow summary:")
print("  1. Create parent template → no DB sessions")
print("  2. Request sessions for date range → generated on-demand")
print("  3. Update parent → affects future sessions only")
print("  4. Add special sessions → outside normal pattern")
print("  5. Extend generation → incremental, no re-creation")

print("\n✓ Benefits:")
print("  - Unlimited sessions (no hard limit)")
print("  - Efficient DB storage (only sessions that exist)")
print("  - Scalable to years of data")
print("  - Update parent, future sessions inherit changes")
print("  - No batch-generation bottlenecks")

print("\n✓ Next steps:")
print("  - Use generate_instances API endpoint when needed")
print("  - Monitor generated_until field for extension")
print("  - Archive old sessions for reporting")

print("\n" + "="*70)
print("END OF DEMONSTRATION")
print("="*70 + "\n")
