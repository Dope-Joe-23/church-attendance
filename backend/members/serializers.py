from rest_framework import serializers
from .models import Member


class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = [
            'id',
            'member_id',
            'full_name',
            'phone',
            'email',
            'department',
            'qr_code_image',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'member_id', 'qr_code_image', 'created_at', 'updated_at']


class MemberDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = '__all__'
        read_only_fields = ['id', 'member_id', 'qr_code_image', 'created_at', 'updated_at']
