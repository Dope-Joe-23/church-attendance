from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from .models import Attendance
from .serializers import AttendanceSerializer, AttendanceCheckInSerializer
from services.models import Service
from members.models import Member
from members.utils import update_absenteeism_alerts


class AttendanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Attendance management
    
    Endpoints:
    - GET /attendance/ - List all attendance records
    - GET /attendance/?member=<id> - Filter by member ID
    - GET /attendance/?service=<id> - Filter by service ID
    - POST /attendance/ - Create attendance record
    - GET /attendance/{id}/ - Get attendance details
    - POST /attendance/checkin/ - Check-in member via QR code
    - GET /attendance/by-service/{service_id}/ - Get attendance for a service
    """
    
    queryset = Attendance.objects.all().select_related('member', 'service').order_by('-created_at')
    serializer_class = AttendanceSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['member', 'service', 'status']
    ordering_fields = ['created_at', 'member', 'service']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['post'])
    def checkin(self, request):
        """
        Check-in member using QR code
        
        Request body:
        {
            "member_id": "ABC123",
            "service_id": 1
        }
        """
        serializer = AttendanceCheckInSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        member_id = serializer.validated_data['member_id']
        service_id = serializer.validated_data['service_id']
        
        try:
            member = Member.objects.get(member_id=member_id)
            service = Service.objects.get(id=service_id)
            
            # Prevent attendance on parent recurring services (template/label only)
            # Parent recurring services have: is_recurring=True, parent_service=None, date=None
            if service.is_recurring and service.parent_service is None and service.date is None:
                return Response({
                    'success': False,
                    'message': f'"{service.name}" is a recurring service template. Please select a specific session/date to check in.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if member is a visitor - visitors cannot check in for attendance
            if member.is_visitor:
                return Response({
                    'success': False,
                    'message': f'{member.full_name} is listed as a visitor and is not tracked in attendance.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if attendance for this service has already been marked (manually or automatically)
            # This prevents check-ins after attendance marking has been finalized
            manual_attendance_exists = Attendance.objects.filter(
                service=service,
                marked_by__in=['manual', 'auto']
            ).exists()
            
            if manual_attendance_exists:
                return Response({
                    'success': False,
                    'message': 'Attendance for this service has been taken',
                    'attendance': None
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if already checked in
            attendance, created = Attendance.objects.get_or_create(
                member=member,
                service=service,
                defaults={
                    'status': 'present',
                    'marked_by': 'check_in',
                }
            )
            
            if created:
                # Update member's absenteeism metrics and alerts
                update_absenteeism_alerts(member)
                
                return Response({
                    'success': True,
                    'message': f'{member.full_name} checked in successfully',
                    'attendance': AttendanceSerializer(attendance).data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'message': f'{member.full_name} is already checked in for this service',
                    'attendance': AttendanceSerializer(attendance).data
                }, status=status.HTTP_200_OK)
        
        except Member.DoesNotExist:
            return Response({
                'success': False,
                'message': f'Member with ID {member_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Service.DoesNotExist:
            return Response({
                'success': False,
                'message': f'Service with ID {service_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def by_service(self, request):
        """
        Get attendance records for a specific service/session
        Usage: /attendance/by_service/?service_id=1
        Only works for sessions (specific dates), not parent recurring services
        Returns comprehensive statistics including attendance by class
        """
        service_id = request.query_params.get('service_id')
        if not service_id:
            return Response({
                'error': 'service_id query parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = Service.objects.get(id=service_id)
            
            # Prevent attendance reports for parent recurring services (template/label only)
            if service.is_recurring and service.parent_service is None and service.date is None:
                return Response({
                    'error': f'"{service.name}" is a recurring service template. Please select a specific session/date to view attendance.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            attendances = Attendance.objects.filter(service=service).select_related('member')
            serializer = AttendanceSerializer(attendances, many=True)
            
            # Calculate statistics
            total_present = attendances.filter(status='present').count()
            total_absent = attendances.filter(status='absent').count()
            total_late = attendances.filter(status='late').count()
            
            # Calculate sex-based statistics for present members
            male_present = attendances.filter(
                status='present',
                member__sex='male'
            ).count()
            female_present = attendances.filter(
                status='present',
                member__sex='female'
            ).count()
            
            # Get attendance by class
            from django.db.models import Q, Count
            class_stats = {}
            
            # Get all unique classes from members who have attendance records
            classes = Member.objects.filter(
                attendances__service=service
            ).values('class_name').distinct()
            
            for class_obj in classes:
                class_name = class_obj['class_name']
                if class_name:
                    class_present = attendances.filter(
                        member__class_name=class_name,
                        status='present'
                    ).count()
                    class_absent = attendances.filter(
                        member__class_name=class_name,
                        status='absent'
                    ).count()
                    class_stats[class_name] = {
                        'present': class_present,
                        'absent': class_absent,
                        'total': class_present + class_absent
                    }
            
            # Sort class stats by name
            class_stats = dict(sorted(class_stats.items()))
            
            return Response({
                'service': {
                    'id': service.id,
                    'name': service.name,
                    'date': service.date,
                    'start_time': service.start_time
                },
                'attendances': serializer.data,
                'total_present': total_present,
                'total_absent': total_absent,
                'total_late': total_late,
                'male_present': male_present,
                'female_present': female_present,
                'class_statistics': class_stats,
            })
        except Service.DoesNotExist:
            return Response({
                'error': f'Service with ID {service_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def mark_absent(self, request):
        """
        Mark all members who haven't checked in as absent for a service/session.
        This is typically called at the end of a service/session.
        Only works for sessions (specific dates), not parent recurring services.
        
        Request body:
        {
            "service_id": 1
        }
        """
        service_id = request.data.get('service_id')
        if not service_id:
            return Response({
                'error': 'service_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = Service.objects.get(id=service_id)
            
            # Prevent marking absent for parent recurring services (template/label only)
            if service.is_recurring and service.parent_service is None and service.date is None:
                return Response({
                    'error': f'"{service.name}" is a recurring service template. Please select a specific session/date to mark attendance.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if any check-ins exist for this service
            checkin_count = Attendance.objects.filter(
                service=service,
                marked_by='check_in'
            ).count()
            
            # Get all members who are NOT visitors
            all_members = Member.objects.filter(is_visitor=False)
            
            # Get members already marked for this service
            already_marked = set(
                Attendance.objects.filter(service=service).values_list('member_id', flat=True)
            )
            
            # Create attendance records for members not yet marked
            absent_count = 0
            marked_members = []
            new_attendances = []
            
            for member in all_members:
                if member.id not in already_marked:
                    new_attendances.append(
                        Attendance(
                            member=member,
                            service=service,
                            status='absent',
                            marked_by='manual'
                        )
                    )
                    absent_count += 1
                    marked_members.append(member.full_name)
            
            # Bulk create all attendance records at once (much faster)
            if new_attendances:
                Attendance.objects.bulk_create(new_attendances, batch_size=100)
            
            return Response({
                'success': True,
                'message': f'Marked {absent_count} members as absent',
                'marked_members': marked_members,
                'checkin_count': checkin_count
            }, status=status.HTTP_200_OK)
        
        except Service.DoesNotExist:
            return Response({
                'error': f'Service with ID {service_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def unmark_attendance(self, request):
        """
        Unmark/remove all attendance records for a service/session.
        This resets attendance marking back to neutral state.
        Only works for sessions (specific dates), not parent recurring services.
        
        Request body:
        {
            "service_id": 1
        }
        """
        service_id = request.data.get('service_id')
        if not service_id:
            return Response({
                'error': 'service_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = Service.objects.get(id=service_id)
            
            # Prevent unmarking for parent recurring services (template/label only)
            if service.is_recurring and service.parent_service is None and service.date is None:
                return Response({
                    'error': f'"{service.name}" is a recurring service template. Please select a specific session/date to unmark attendance.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get all attendance records for this service
            attendances = Attendance.objects.filter(service=service)
            deleted_count = attendances.count()
            
            # Delete all attendance records
            attendances.delete()
            
            return Response({
                'success': True,
                'message': f'Unmarked {deleted_count} attendance records',
                'deleted_count': deleted_count
            }, status=status.HTTP_200_OK)
        
        except Service.DoesNotExist:
            return Response({
                'error': f'Service with ID {service_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
