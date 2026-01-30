from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Member
from .serializers import MemberSerializer, MemberDetailSerializer


class MemberViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Member management
    
    Endpoints:
    - GET /members/ - List all members
    - POST /members/ - Create new member
    - GET /members/{id}/ - Get member details
    - PUT /members/{id}/ - Update member
    - DELETE /members/{id}/ - Delete member
    """
    
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MemberDetailSerializer
        return MemberSerializer
    
    @action(detail=False, methods=['get'])
    def by_member_id(self, request):
        """
        Get member by member_id
        Usage: /members/by_member_id/?member_id=ABC123
        """
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response(
                {'error': 'member_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            member = Member.objects.get(member_id=member_id)
            serializer = MemberDetailSerializer(member)
            return Response(serializer.data)
        except Member.DoesNotExist:
            return Response(
                {'error': f'Member with ID {member_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        """Get QR code image for a member"""
        member = self.get_object()
        if member.qr_code_image:
            return Response({
                'qr_code_url': member.qr_code_image.url,
                'member_id': member.member_id
            })
        return Response(
            {'error': 'QR code not available'},
            status=status.HTTP_404_NOT_FOUND
        )
