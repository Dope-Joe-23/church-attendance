import React, { useRef } from 'react';
import '../styles/components.css';

const QRCodeModal = ({ isOpen, member, onClose }) => {
  const qrImageRef = useRef(null);

  if (!isOpen || !member) return null;

  const downloadQRCodeAsPNG = () => {
    if (!member.qr_code_image) return;

    // Create an image element to get the actual QR code image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Create a larger canvas for the card layout
      const cardWidth = 600;
      const cardHeight = 900;
      const canvas = document.createElement('canvas');
      canvas.width = cardWidth;
      canvas.height = cardHeight;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cardWidth, cardHeight);

      // Top border/header
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, cardWidth, 60);

      // Church name in header
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Church Attendance', cardWidth / 2, 42);

      // Member information section
      let yPos = 100;
      const leftMargin = 40;
      const lineHeight = 45;

      // Member Name
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Name:', leftMargin, yPos);
      ctx.font = '18px Arial';
      ctx.fillText(member.full_name, leftMargin + 120, yPos);
      yPos += lineHeight;

      // Member ID
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('ID:', leftMargin, yPos);
      ctx.font = '18px Arial';
      ctx.fillStyle = '#2563eb';
      ctx.fillText(member.member_id, leftMargin + 120, yPos);
      yPos += lineHeight;

      // Department (if exists)
      if (member.department) {
        const departmentLabel = {
          'worship': 'Worship',
          'outreach': 'Outreach',
          'youth': 'Youth',
          'administration': 'Administration',
        }[member.department] || member.department;

        ctx.fillStyle = '#333333';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Department:', leftMargin, yPos);
        ctx.font = '18px Arial';
        ctx.fillStyle = '#555555';
        ctx.fillText(departmentLabel, leftMargin + 120, yPos);
        yPos += lineHeight;
      }

      // Class (if exists)
      if (member.class_name) {
        const classLabel = {
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
          'newton_estate': 'Newton/Estate',
          'distance': 'Distance',
        }[member.class_name] || member.class_name;

        ctx.fillStyle = '#333333';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Class:', leftMargin, yPos);
        ctx.font = '18px Arial';
        ctx.fillStyle = '#555555';
        ctx.fillText(classLabel, leftMargin + 120, yPos);
        yPos += lineHeight;
      }

      // QR Code - centered
      const qrSize = 300;
      const qrX = (cardWidth - qrSize) / 2;
      const qrY = yPos + 40;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${member.member_id}_qr_card.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = member.qr_code_image;
  };

  const handlePDFDownload = () => {
    // Create a new window for printing
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>${member.member_id} - QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              font-family: Arial, sans-serif;
              background-color: white;
            }
            .container {
              text-align: center;
            }
            h2 {
              margin-bottom: 20px;
              color: #333;
            }
            img {
              max-width: 400px;
              border: 2px solid #ddd;
              padding: 10px;
            }
            .member-info {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${member.full_name}</h2>
            <p class="member-info">Member ID: <strong>${member.member_id}</strong></p>
            <img src="${member.qr_code_image}" alt="QR Code" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>QR Code - {member.full_name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="qr-display">
            <img
              ref={qrImageRef}
              src={member.qr_code_image}
              alt={`QR code for ${member.member_id}`}
              className="modal-qr-image"
            />
            <p className="member-id-display">Member ID: <strong>{member.member_id}</strong></p>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={downloadQRCodeAsPNG}
          >
            📥 PNG
          </button>
          <button
            className="btn btn-secondary"
            onClick={handlePDFDownload}
          >
            📥 PDF
          </button>
          <button
            className="px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all hover:shadow-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
