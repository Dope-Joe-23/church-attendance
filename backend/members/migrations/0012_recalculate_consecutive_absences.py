# Generated migration to recalculate consecutive absences from attendance records

from django.db import migrations
from django.utils import timezone


def recalculate_consecutive_absences(apps, schema_editor):
    """
    Recalculate consecutive absences for all members based on their attendance records.
    This ensures that all existing members have accurate consecutive_absences counts.
    """
    Member = apps.get_model('members', 'Member')
    Attendance = apps.get_model('attendance', 'Attendance')
    
    members_updated = []
    
    # Get all members
    all_members = Member.objects.all()
    
    for member in all_members:
        # Get all attendance records for this member, ordered by date (newest first)
        attendances = Attendance.objects.filter(
            member=member
        ).order_by('-service__date', '-created_at')
        
        # Count consecutive absences from the most recent attendance
        consecutive_count = 0
        for attendance in attendances:
            if attendance.status == 'absent':
                consecutive_count += 1
            else:
                # Stop counting when we hit a present or other status
                break
        
        # Update the member's consecutive_absences field if it changed
        old_value = member.consecutive_absences
        if old_value != consecutive_count:
            member.consecutive_absences = consecutive_count
            member.save(update_fields=['consecutive_absences'])
            members_updated.append({
                'member': member.full_name,
                'old': old_value,
                'new': consecutive_count
            })
    
    # Print summary
    if members_updated:
        print(f"\n✅ Updated {len(members_updated)} members:")
        for update in members_updated:
            print(f"  {update['member']}: {update['old']} → {update['new']}")
    else:
        print("\n✅ All members already have correct consecutive_absences counts")


def reverse_recalculate(apps, schema_editor):
    """
    Reverse operation - reset consecutive_absences to 0 for all members.
    This is a fallback in case the migration needs to be rolled back.
    """
    Member = apps.get_model('members', 'Member')
    Member.objects.all().update(consecutive_absences=0)
    print("⚠️ Reset all members' consecutive_absences to 0")


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0011_add_sex_field'),
    ]

    operations = [
        migrations.RunPython(recalculate_consecutive_absences, reverse_recalculate),
    ]
