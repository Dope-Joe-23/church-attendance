import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from members.models import Member, MemberAlert
from services.models import Service
from attendance.models import Attendance

print('=' * 60)
print('TEST DATA SUMMARY')
print('=' * 60)

# Sessions
print('\nSessions Created:')
sessions = Service.objects.filter(parent_service__isnull=False, is_recurring=False).order_by('date')
for s in sessions:
    attendance_count = Attendance.objects.filter(service=s).count()
    absent_count = Attendance.objects.filter(service=s, status='absent').count()
    print(f'  • {s.name} ({s.date}): {absent_count} absent, {attendance_count-absent_count} present')

# Absences
print('\nTotal Attendance Records:')
total = Attendance.objects.count()
absent = Attendance.objects.filter(status='absent').count()
present = total - absent
print(f'  • Total: {total}')
print(f'  • Present: {present}')
print(f'  • Absent: {absent}')

# Alerts
print('\nAlerts Created:')
early = MemberAlert.objects.filter(alert_level='early_warning', is_resolved=False).count()
risk = MemberAlert.objects.filter(alert_level='at_risk', is_resolved=False).count()
critical = MemberAlert.objects.filter(alert_level='critical', is_resolved=False).count()
total_alerts = early + risk + critical
print(f'  • Total: {total_alerts}')
print(f'  • Early Warning: {early}')
print(f'  • At Risk: {risk}')
print(f'  • Critical: {critical}')

# Member details
print('\nMembers with Alerts:')
members_alerts = MemberAlert.objects.filter(is_resolved=False).values_list('member', flat=True).distinct()
for member_id in members_alerts:
    member = Member.objects.get(id=member_id)
    absences = Attendance.objects.filter(member=member, status='absent').count()
    alerts = MemberAlert.objects.filter(member=member, is_resolved=False)
    alert_levels = [a.alert_level for a in alerts]
    print(f'  • {member.full_name}: {absences} absences → {alert_levels}')

print('\n' + '=' * 60)
