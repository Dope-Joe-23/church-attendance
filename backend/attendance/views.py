from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Attendance
from .serializers import AttendanceSerializer, AttendanceCheckInSerializer
from services.models import Service
from members.models import Member


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
            
            # Check if already checked in
            attendance, created = Attendance.objects.get_or_create(
                member=member,
                service=service,
                defaults={'status': 'present'}
            )
            
            if created:
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
        Get attendance records for a specific service
        Usage: /attendance/by_service/?service_id=1
        """
        service_id = request.query_params.get('service_id')
        if not service_id:
            return Response({
                'error': 'service_id query parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = Service.objects.get(id=service_id)
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
