from django.core.management.base import BaseCommand
from members.models import Member
from attendance.models import Attendance


class Command(BaseCommand):
    help = 'Recalculate consecutive absences for all members based on attendance records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--member-id',
            type=int,
            help='Recalculate for a specific member ID',
        )

    def handle(self, *args, **options):
        member_id = options.get('member_id')
        
        if member_id:
            # Recalculate for specific member
            try:
                member = Member.objects.get(id=member_id)
                self.recalculate_member(member)
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Recalculated consecutive absences for {member.full_name}')
                )
            except Member.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'✗ Member with ID {member_id} not found')
                )
        else:
            # Recalculate for all members
            members = Member.objects.all()
            self.stdout.write(f'Recalculating consecutive absences for {members.count()} members...')
            
            for member in members:
                self.recalculate_member(member)
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Successfully recalculated consecutive absences for {members.count()} members')
            )

    def recalculate_member(self, member):
        """Calculate consecutive absences from attendance records and update member"""
        # Get all attendance records for this member, ordered by service date (descending)
        attendances = Attendance.objects.filter(
            member_id=member.id
        ).select_related('service').order_by('-service__date', '-created_at')
        
        # Calculate consecutive absences from most recent services
        consecutive = 0
        for attendance in attendances:
            if attendance.status == 'absent':
                consecutive += 1
            else:
                break
        
        # Update the member's consecutive absences
        if member.consecutive_absences != consecutive:
            old_value = member.consecutive_absences
            member.consecutive_absences = consecutive
            member.save(update_fields=['consecutive_absences'])
            self.stdout.write(
                f'  {member.full_name}: {old_value} → {consecutive}'
            )
