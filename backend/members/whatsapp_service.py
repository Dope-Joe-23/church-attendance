"""
WhatsApp Service for sending QR codes to members

This module provides functionality to send member QR codes via WhatsApp
using the Twilio WhatsApp API or similar service.
"""

import logging
import os
from django.conf import settings
from io import BytesIO
import base64

logger = logging.getLogger(__name__)


class WhatsAppService:
    """WhatsApp integration service using Twilio"""
    
    def __init__(self):
        """Initialize WhatsApp service with Twilio credentials"""
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        whatsapp_from = os.getenv('TWILIO_WHATSAPP_FROM', 'whatsapp:+1234567890')
        
        # Ensure whatsapp: prefix is present
        if whatsapp_from and not whatsapp_from.startswith('whatsapp:'):
            whatsapp_from = f'whatsapp:{whatsapp_from}'
        self.whatsapp_from = whatsapp_from
        
        self.enabled = self.account_sid and self.auth_token
        
        if self.enabled:
            try:
                from twilio.rest import Client
                self.client = Client(self.account_sid, self.auth_token)
            except ImportError:
                logger.warning("Twilio client not installed. WhatsApp service disabled.")
                self.enabled = False
    
    def is_enabled(self):
        """Check if WhatsApp service is properly configured"""
        return self.enabled
    
    def send_qr_code(self, member, phone_number=None):
        """
        Send QR code to member via WhatsApp
        
        Args:
            member: Member instance
            phone_number: WhatsApp phone number (e.g., '+233XXXXXXXXX')
                         If not provided, uses member.phone
        
        Returns:
            dict: {
                'success': bool,
                'message_sid': str or None,
                'error': str or None
            }
        """
        if not self.enabled:
            return {
                'success': False,
                'error': 'WhatsApp service not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
                'message_sid': None
            }
        
        # Determine phone number
        if not phone_number:
            phone_number = member.phone
        
        if not phone_number:
            return {
                'success': False,
                'error': f'Member {member.full_name} does not have a phone number',
                'message_sid': None
            }
        
        try:
            # Format phone number for WhatsApp
            whatsapp_to = self._format_phone_number(phone_number)
            
            # Generate QR code card
            from .qr_card_generator import generate_qr_code_card
            card_data = generate_qr_code_card(member, format='png')
            
            # Create message body
            message_body = self._create_message_body(member)
            
            # Send message via Twilio
            message = self.client.messages.create(
                from_=self.whatsapp_from,
                to=whatsapp_to,
                body=message_body,
            )
            
            # Optionally, you can send the image separately (if Twilio supports it)
            # This would require additional API calls or media handling
            
            logger.info(f"WhatsApp message sent to {whatsapp_to}, SID: {message.sid}")
            
            return {
                'success': True,
                'message_sid': message.sid,
                'error': None,
                'phone_number': whatsapp_to
            }
            
        except Exception as e:
            error_msg = f"Failed to send WhatsApp message: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg,
                'message_sid': None
            }
    
    def send_qr_code_bulk(self, members, phone_numbers=None):
        """
        Send QR codes to multiple members via WhatsApp
        
        Args:
            members: List of Member instances
            phone_numbers: Optional dict mapping member_id to phone_number
        
        Returns:
            dict: {
                'success_count': int,
                'failure_count': int,
                'results': list of result dicts
            }
        """
        results = []
        success_count = 0
        failure_count = 0
        
        for member in members:
            phone = None
            if phone_numbers and member.id in phone_numbers:
                phone = phone_numbers[member.id]
            
            result = self.send_qr_code(member, phone)
            results.append({
                'member_id': member.member_id,
                'member_name': member.full_name,
                **result
            })
            
            if result['success']:
                success_count += 1
            else:
                failure_count += 1
        
        return {
            'success_count': success_count,
            'failure_count': failure_count,
            'total': len(members),
            'results': results
        }
    
    @staticmethod
    def _format_phone_number(phone_number):
        """
        Format phone number for WhatsApp API
        
        Converts formats like:
        - 0501234567 -> +233501234567
        - 501234567 -> +233501234567
        - +233501234567 -> +233501234567
        
        Assumes Ghana country code (+233)
        """
        # Remove any spaces or dashes
        phone = phone_number.replace(' ', '').replace('-', '').strip()
        
        # If starts with +, already formatted
        if phone.startswith('+'):
            return f"whatsapp:{phone}"
        
        # If starts with 0, remove it and add country code
        if phone.startswith('0'):
            phone = '+233' + phone[1:]
        # If no country code, assume Ghana
        elif not phone.startswith('+'):
            phone = '+233' + phone
        
        return f"whatsapp:{phone}"
    
    @staticmethod
    def _create_message_body(member):
        """Create WhatsApp message body with member details"""
        church_name = getattr(settings, 'CHURCH_NAME', 'Our Church')
        
        message = f"""
Hello {member.full_name}! 👋

Your church membership card is ready! 

📝 Member Details:
- Name: {member.full_name}
- Member ID: {member.member_id}
"""
        
        if member.department:
            dept_label = {
                'technical': 'Technical',
                'media': 'Media',
                'echoes_of_grace': 'Echoes of Grace',
                'celestial_harmony_choir': 'Celestial Harmony Choir',
                'heavenly_vibes': 'Heavenly Vibes',
                'prayer_evangelism': 'Prayer and Evangelism',
                'visitor_care': 'Visitor Care',
                'protocol_ushering': 'Protocol & Ushering',
            }.get(member.department, member.department)
            message += f"- Department: {dept_label}\n"
        
        if member.class_name:
            class_label = {
                'airport': 'Airport',
                'abesim': 'Abesim',
                'old_abesim': 'Old Abesim',
                'asufufu_adomako': 'Asufufu / Adomako',
                'baakoniaba': 'Baakoniaba',
                'berlin_top_class_1': 'Berlin Top class 1',
                'berlin_top_class_2': 'Berlin Top class 2',
                'penkwase_class_1': 'Penkwase class 1',
                'penkwase_class_2': 'Penkwase class 2',
                'mayfair': 'Mayfair',
                'odumase': 'Odumase',
                'new_dormaa_kotokrom': 'New Dormaa / Kotokrom',
                'dumasua': 'Dumasua',
                'fiapre_class_1': 'Fiapre Class 1',
                'fiapre_class_2': 'Fiapre Class 2',
                'magazine': 'Magazine',
                'town_centre': 'Town Centre',
                'newton_estate': 'Newtown/Estate',
                'distance': 'Distance',
            }.get(member.class_name, member.class_name)
            message += f"- Class: {class_label}\n"
        
        message += f"""
📱 How to use your QR code:
1. Present this QR code during attendance check-in
2. Church staff will scan it to mark your attendance
3. Keep it handy or print it out for services

🙏 Your QR code has been sent via email as well.

Thank you for being part of {church_name}!
"""
        
        return message.strip()


def send_qr_code_whatsapp(member, phone_number=None):
    """
    Convenience function to send QR code via WhatsApp
    
    Args:
        member: Member instance
        phone_number: Optional WhatsApp phone number
    
    Returns:
        bool: True if successful, False otherwise
    """
    service = WhatsAppService()
    result = service.send_qr_code(member, phone_number)
    return result['success']


def send_qr_codes_bulk_whatsapp(members):
    """
    Convenience function to send QR codes to multiple members via WhatsApp
    
    Args:
        members: List of Member instances
    
    Returns:
        dict: Summary of results
    """
    service = WhatsAppService()
    return service.send_qr_code_bulk(members)
