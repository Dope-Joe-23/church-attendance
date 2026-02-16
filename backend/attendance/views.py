from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Attendance
from .serializers import AttendanceSerializer, AttendanceCheckInSerializer
from services.models import Service
from members.models import Member
from members.utils import update_member_absence_tracking


class AttendanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Attendance management
    
    Endpoints:
    - GET /attendance/ - List all attendance records
    - POST /attendance/ - Create attendance record
    - GET /attendance/{id}/ - Get attendance details
    - POST /attendance/checkin/ - Check-in member via QR code
    - GET /attendance/by-service/{service_id}/ - Get attendance for a service
    """
    
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    
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
            
            # Check if already checked in
            attendance, created = Attendance.objects.get_or_create(
                member=member,
                service=service,
                defaults={'status': 'present'}
            )
            
            if created:
                # Update member's absence tracking
                update_member_absence_tracking(member, 'present')
                
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
            
            attendances = Attendance.objects.filter(service=service)
            serializer = AttendanceSerializer(attendances, many=True)
            return Response({
                'service': {
                    'id': service.id,
                    'name': service.name,
                    'date': service.date,
                    'start_time': service.start_time
                },
                'attendances': serializer.data,
                'total_present': attendances.filter(status='present').count(),
                'total_absent': attendances.filter(status='absent').count(),
                'total_late': attendances.filter(status='late').count(),
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
            
            # Get all members who are NOT visitors
            all_members = Member.objects.filter(is_visitor=False)
            
            # Find members who haven't checked in
            absent_count = 0
            marked_members = []
            
            for member in all_members:
                attendance, created = Attendance.objects.get_or_create(
                    member=member,
                    service=service,
                    defaults={'status': 'absent'}
                )
                if created:
                    # Update member's absence tracking
                    update_member_absence_tracking(member, 'absent')
                    
                    absent_count += 1
                    marked_members.append(member.full_name)
            
            return Response({
                'success': True,
                'message': f'Marked {absent_count} members as absent',
                'marked_members': marked_members
            }, status=status.HTTP_200_OK)
        
        except Service.DoesNotExist:
            return Response({
                'error': f'Service with ID {service_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
