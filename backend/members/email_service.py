"""
Email service for sending member QR codes
"""
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.core.files.base import ContentFile
import os


def send_qr_code_email(member):
    """
    Send member's QR code via email
    
    Args:
        member: Member instance
    
    Returns:
        False if member is a visitor (no email sent)
        False if member has no email
        True if email sent successfully
    """
    # Don't send QR code to visitors
    if member.is_visitor:
        return False
    
    if not member.email:
        return False
    
    try:
        subject = f"Your Church Attendance QR Code - {member.full_name}"
        
        # Email context
        context = {
            'member_name': member.full_name,
            'member_id': member.member_id,
            'church_name': settings.CHURCH_NAME if hasattr(settings, 'CHURCH_NAME') else 'Our Church',
            'qr_code_url': member.qr_code_image.url if member.qr_code_image else None,
        }
        
        # HTML email template
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">Welcome to {context['church_name']}!</h2>
                    
                    <p>Hi <strong>{context['member_name']}</strong>,</p>
                    
                    <p>Your unique QR code for attendance tracking has been generated. Please find it below:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <p><strong>Your Member ID:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px;">{context['member_id']}</code></p>
                        {f'<img src="{context["qr_code_url"]}" alt="QR Code" style="max-width: 300px; height: auto; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">' if context['qr_code_url'] else '<p>QR code will be available shortly</p>'}
                    </div>
                    
                    <h3 style="color: #2c3e50;">How to Use Your QR Code:</h3>
                    <ol>
                        <li>Keep this QR code safe - you'll need it for attendance check-in</li>
                        <li>You can print it out and carry it with you</li>
                        <li>Or take a screenshot and show it on your phone during check-in</li>
                        <li>Simply present it to be scanned at our services</li>
                    </ol>
                    
                    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 0.9em;">
                        If you have any questions or need a new QR code, please contact us.
                    </p>
                    
                    <p style="color: #666; font-size: 0.9em;">
                        Best regards,<br>
                        <strong>{context['church_name']} Administration</strong>
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Plain text alternative
        text_content = f"""
        Welcome to {context['church_name']}!
        
        Hi {context['member_name']},
        
        Your unique QR code for attendance tracking has been generated.
        
        Your Member ID: {context['member_id']}
        
        How to Use Your QR Code:
        1. Keep this QR code safe - you'll need it for attendance check-in
        2. You can print it out and carry it with you
        3. Or take a screenshot and show it on your phone during check-in
        4. Simply present it to be scanned at our services
        
        If you have any questions or need a new QR code, please contact us.
        
        Best regards,
        {context['church_name']} Administration
        """
        
        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[member.email],
        )
        
        # Attach HTML version
        email.attach_alternative(html_content, "text/html")
        
        # Attach QR code image if it exists
        if member.qr_code_image:
            try:
                with open(member.qr_code_image.path, 'rb') as f:
                    email.attach(
                        f'qr_code_{member.member_id}.png',
                        f.read(),
                        'image/png'
                    )
            except Exception as file_error:
                print(f"Warning: Could not attach QR code image: {str(file_error)}")
        
        # Send email
        email.send(fail_silently=False)
        return True
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending email to {member.email}: {str(e)}")
        print(f"Error sending email to {member.email}: {str(e)}")
        return False
