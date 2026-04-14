"""
QR Code Card Generator - Creates styled QR code cards with member details

This module generates professional-looking QR code cards in PNG or PDF format
identical to the QRCodeModal design shown in the frontend.
"""

from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import base64
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_qr_code_card(member, format='png'):
    """
    Generate a styled QR code card with member details.
    
    Args:
        member: Member instance with qr_code_data
        format: 'png' or 'pdf' - output format
    
    Returns:
        bytes: PNG or PDF data
    """
    
    if format.lower() == 'pdf':
        return _generate_pdf_card(member)
    else:
        return _generate_png_card(member)


def _generate_png_card(member):
    """
    Generate a PNG card with QR code and member details.
    
    Returns:
        bytes: PNG image data
    """
    try:
        # Card dimensions
        card_width = 600
        card_height = 900
        
        # Create new image with white background
        img = Image.new('RGB', (card_width, card_height), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to load fonts, fall back to default if not available
        try:
            # Use default system fonts
            from PIL import ImageFont
            title_font = ImageFont.truetype("arial.ttf", 24)
            label_font = ImageFont.truetype("arial.ttf", 20)
            value_font = ImageFont.truetype("arial.ttf", 18)
        except (IOError, OSError):
            # Fall back to default font
            title_font = ImageFont.load_default()
            label_font = ImageFont.load_default()
            value_font = ImageFont.load_default()
        
        # ============ Header (Blue background) ============
        header_color = (37, 99, 235)  # #2563eb
        draw.rectangle([(0, 0), (card_width, 60)], fill=header_color)
        
        # Church name in header
        header_text = 'Membership Card - WIS'
        draw.text(
            (card_width // 2, 30),
            header_text,
            fill='white',
            font=title_font,
            anchor='mm'
        )
        
        # ============ Member Information ============
        left_margin = 40
        y_pos = 100
        line_height = 45
        
        # Member Name
        draw.text((left_margin, y_pos), 'Name:', fill='#333333', font=label_font)
        draw.text(
            (left_margin + 120, y_pos),
            member.full_name.upper(),
            fill='#333333',
            font=value_font
        )
        y_pos += line_height
        
        # Member ID
        draw.text((left_margin, y_pos), 'ID:', fill='#333333', font=label_font)
        draw.text(
            (left_margin + 120, y_pos),
            str(member.member_id),
            fill=header_color,
            font=value_font
        )
        y_pos += line_height
        
        # Department (if exists)
        if member.department:
            department_label = {
                'technical': 'Technical',
                'media': 'Media',
                'echoes_of_grace': 'Echoes of Grace',
                'celestial_harmony_choir': 'Celestial Harmony Choir',
                'heavenly_vibes': 'Heavenly Vibes',
                'prayer_evangelism': 'Prayer and Evangelism',
                'visitor_care': 'Visitor Care',
                'protocol_ushering': 'Protocol & Ushering',
            }.get(member.department, member.department.upper())
            
            draw.text((left_margin, y_pos), 'Department:', fill='#333333', font=label_font)
            draw.text(
                (left_margin + 120, y_pos),
                department_label,
                fill='#555555',
                font=value_font
            )
            y_pos += line_height
        
        # Class (if exists)
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
            
            draw.text((left_margin, y_pos), 'Class:', fill='#333333', font=label_font)
            draw.text(
                (left_margin + 120, y_pos),
                class_label,
                fill='#555555',
                font=value_font
            )
            y_pos += line_height
        
        # ============ QR Code ============
        if member.qr_code_data:
            try:
                # Decode base64 QR code
                qr_data = base64.b64decode(member.qr_code_data)
                qr_img = Image.open(BytesIO(qr_data))
                
                # Resize QR code to fit card
                qr_size = 500
                qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
                
                # Center QR code
                qr_x = (card_width - qr_size) // 2
                qr_y = y_pos + 40
                
                # Paste QR code
                img.paste(qr_img, (qr_x, qr_y))
                
            except Exception as e:
                logger.error(f"Error embedding QR code: {str(e)}")
        
        # Convert to bytes
        img_io = BytesIO()
        img.save(img_io, format='PNG')
        img_io.seek(0)
        return img_io.getvalue()
        
    except Exception as e:
        logger.error(f"Error generating PNG card: {str(e)}")
        raise


def _generate_pdf_card(member):
    """
    Generate a PDF card with QR code and member details.
    
    Note: Requires weasyprint package for HTML to PDF conversion.
    Falls back to PNG if weasyprint not available.
    
    Returns:
        bytes: PDF data
    """
    try:
        from weasyprint import HTML, CSS
        from io import StringIO
        
        # Build HTML
        church_name = getattr(settings, 'CHURCH_NAME', 'Our Church')
        
        dept_label = member.get_department_display() if hasattr(member, 'get_department_display') else member.department
        class_label = member.get_class_name_display() if hasattr(member, 'get_class_name_display') else member.class_name
        
        qr_data_uri = f"data:image/png;base64,{member.qr_code_data}" if member.qr_code_data else ""
        
        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: white;
                }}
                .card {{
                    width: 600px;
                    padding: 0;
                    background: white;
                    border: 1px solid #ddd;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .header {{
                    background: #2563eb;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                }}
                .content {{
                    padding: 30px 40px;
                }}
                .field {{
                    display: flex;
                    margin-bottom: 30px;
                    font-size: 18px;
                }}
                .field-label {{
                    font-weight: bold;
                    width: 120px;
                    color: #333;
                }}
                .field-value {{
                    color: #555;
                    flex: 1;
                }}
                .member-id {{
                    color: #2563eb;
                }}
                .qr-section {{
                    text-align: center;
                    margin-top: 40px;
                }}
                .qr-section img {{
                    max-width: 400px;
                    border: 2px solid #ddd;
                    padding: 10px;
                }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">Membership Card - WIS</div>
                <div class="content">
                    <div class="field">
                        <div class="field-label">Name:</div>
                        <div class="field-value">{member.full_name.upper()}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">ID:</div>
                        <div class="field-value member-id">{member.member_id}</div>
                    </div>
                    {'<div class="field"><div class="field-label">Department:</div><div class="field-value">' + (dept_label or '') + '</div></div>' if member.department else ''}
                    {'<div class="field"><div class="field-label">Class:</div><div class="field-value">' + (class_label or '') + '</div></div>' if member.class_name else ''}
                    <div class="qr-section">
                        <img src="{qr_data_uri}" alt="QR Code">
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Convert HTML to PDF
        pdf_bytes = HTML(string=html_template).write_pdf()
        return pdf_bytes
        
    except Exception as e:
        logger.warning(f"PDF generation failed, falling back to PNG: {str(e)}")
        # Fall back to PNG if PDF generation fails
        return _generate_png_card(member)


def get_card_as_base64(member, format='png'):
    """
    Get styled QR code card as base64 encoded string.
    
    Args:
        member: Member instance
        format: 'png' or 'pdf'
    
    Returns:
        str: Base64 encoded card data
    """
    card_data = generate_qr_code_card(member, format)
    return base64.b64encode(card_data).decode('utf-8')


def get_card_as_data_uri(member, format='png'):
    """
    Get styled QR code card as data URI (for embedding in HTML).
    
    Args:
        member: Member instance
        format: 'png' or 'pdf'
    
    Returns:
        str: Data URI string
    """
    mime_type = 'image/png' if format.lower() == 'png' else 'application/pdf'
    base64_data = get_card_as_base64(member, format)
    return f"data:{mime_type};base64,{base64_data}"
