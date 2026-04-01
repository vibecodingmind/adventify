import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { db } from './db';
import type { BaptismRecord, Church, Conference, Union, Division, Person } from '@prisma/client';

// Generate unique Baptism Certificate Number
// Format: [DIV]-[UNI]-[CON]-[CH]-[YEAR]-[SERIAL]
export async function generateBCN(
  churchId: string,
  baptismDate: Date
): Promise<string> {
  // Get church with hierarchy info
  const church = await db.church.findUnique({
    where: { id: churchId },
    include: {
      conference: {
        include: {
          union: {
            include: {
              division: true,
            },
          },
        },
      },
    },
  });
  
  if (!church) {
    throw new Error('Church not found');
  }
  
  const year = baptismDate.getFullYear();
  const divisionCode = church.conference.union.division.code;
  const unionCode = church.conference.union.code;
  const conferenceCode = church.conference.code;
  const churchCode = church.code.padStart(3, '0');
  
  // Get the count of certificates for this church in this year
  const certificateCount = await db.certificate.count({
    where: {
      baptismRecord: {
        churchId: churchId,
        baptismDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    },
  });
  
  const serial = (certificateCount + 1).toString().padStart(6, '0');
  
  return `${divisionCode}-${unionCode}-${conferenceCode}-${churchCode}-${year}-${serial}`;
}

// Generate QR code as base64
export async function generateQRCode(verificationUrl: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1a365d',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

// Generate PDF certificate
export async function generateCertificatePDF(data: {
  personName: string;
  baptismDate: Date;
  churchName: string;
  churchAddress?: string | null;
  churchCity?: string | null;
  churchCountry?: string | null;
  pastorName: string;
  pastorTitle?: string | null;
  bcn: string;
  qrCodeData: string;
  verificationUrl: string;
}): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors
  const primaryColor = '#1a365d'; // Dark blue
  const accentColor = '#2d5a87'; // Medium blue
  const goldColor = '#b8860b'; // Dark goldenrod
  
  // Border
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(1);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);
  
  // Header decorative line
  doc.setDrawColor(goldColor);
  doc.setLineWidth(0.5);
  doc.line(30, 35, pageWidth - 30, 35);
  
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(primaryColor);
  doc.text('CERTIFICATE OF BAPTISM', pageWidth / 2, 50, { align: 'center' });
  
  // Decorative line under title
  doc.setDrawColor(goldColor);
  doc.line(50, 55, pageWidth - 50, 55);
  
  // Subtitle
  doc.setFontSize(12);
  doc.setTextColor(accentColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Seventh-day Adventist Church', pageWidth / 2, 65, { align: 'center' });
  
  // Main content
  doc.setFontSize(14);
  doc.setTextColor('#333333');
  doc.setFont('helvetica', 'normal');
  
  const baptismDateStr = data.baptismDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Certificate text
  const contentStartY = 90;
  
  doc.text('This is to certify that', pageWidth / 2, contentStartY, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text(data.personName, pageWidth / 2, contentStartY + 15, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor('#333333');
  doc.text('was baptized by immersion on', pageWidth / 2, contentStartY + 30, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor);
  doc.text(baptismDateStr, pageWidth / 2, contentStartY + 45, { align: 'center' });
  
  // Location info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor('#333333');
  
  let locationText = data.churchName;
  if (data.churchCity) locationText += `, ${data.churchCity}`;
  if (data.churchCountry) locationText += `, ${data.churchCountry}`;
  
  doc.text(`at ${locationText}`, pageWidth / 2, contentStartY + 60, { align: 'center' });
  
  // Officiating minister
  const pastorText = data.pastorTitle 
    ? `${data.pastorTitle} ${data.pastorName}` 
    : data.pastorName;
  
  doc.text('Officiating Minister:', pageWidth / 2, contentStartY + 80, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(pastorText, pageWidth / 2, contentStartY + 90, { align: 'center' });
  
  // Certificate number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(accentColor);
  doc.text(`Certificate Number: ${data.bcn}`, pageWidth / 2, contentStartY + 110, { align: 'center' });
  
  // QR Code section
  const qrSize = 35;
  const qrX = pageWidth - 50;
  const qrY = pageHeight - 75;
  
  // Add QR code image
  try {
    const qrImage = data.qrCodeData.split(',')[1]; // Remove data:image/png;base64, prefix
    doc.addImage(qrImage, 'PNG', qrX - qrSize / 2, qrY, qrSize, qrSize);
  } catch (error) {
    console.error('Error adding QR code to PDF:', error);
  }
  
  // QR code label
  doc.setFontSize(8);
  doc.setTextColor('#666666');
  doc.text('Scan to verify', qrX, qrY + qrSize + 5, { align: 'center' });
  
  // Signature lines
  const signatureY = pageHeight - 60;
  
  doc.setDrawColor('#333333');
  doc.setLineWidth(0.3);
  doc.line(40, signatureY, 100, signatureY);
  doc.line(pageWidth - 100, signatureY, pageWidth - 40, signatureY);
  
  doc.setFontSize(9);
  doc.setTextColor('#666666');
  doc.text('Church Clerk / Secretary', 70, signatureY + 7, { align: 'center' });
  doc.text('Officiating Minister', pageWidth - 70, signatureY + 7, { align: 'center' });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor('#999999');
  doc.text(
    `Verify this certificate at: ${data.verificationUrl}`,
    pageWidth / 2,
    pageHeight - 25,
    { align: 'center' }
  );
  
  // Generated timestamp
  doc.text(
    `Generated on: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`,
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );
  
  // Return as base64
  return doc.output('datauristring');
}

// Full certificate generation flow
export async function createCertificate(baptismRecordId: string, baseUrl: string): Promise<{
  id: string;
  bcn: string;
  verificationUrl: string;
  pdfData: string;
  qrCodeData: string;
}> {
  // Get baptism record with all related data
  const baptismRecord = await db.baptismRecord.findUnique({
    where: { id: baptismRecordId },
    include: {
      person: true,
      church: {
        include: {
          conference: {
            include: {
              union: {
                include: {
                  division: true,
                },
              },
            },
          },
        },
      },
    },
  });
  
  if (!baptismRecord) {
    throw new Error('Baptism record not found');
  }
  
  if (baptismRecord.status !== 'APPROVED') {
    throw new Error('Baptism record must be approved before generating certificate');
  }
  
  // Check if certificate already exists
  const existingCertificate = await db.certificate.findUnique({
    where: { baptismRecordId },
  });
  
  if (existingCertificate) {
    // Return existing certificate
    return {
      id: existingCertificate.id,
      bcn: existingCertificate.bcn,
      verificationUrl: existingCertificate.verificationUrl,
      pdfData: existingCertificate.pdfData || '',
      qrCodeData: existingCertificate.qrCodeData || '',
    };
  }
  
  // Generate BCN
  const bcn = await generateBCN(baptismRecord.churchId, baptismRecord.baptismDate);
  
  // Generate verification URL
  const verificationUrl = `${baseUrl}/verify/${bcn}`;
  
  // Generate QR code
  const qrCodeData = await generateQRCode(verificationUrl);
  
  // Generate PDF
  const pdfData = await generateCertificatePDF({
    personName: baptismRecord.person.fullName,
    baptismDate: baptismRecord.baptismDate,
    churchName: baptismRecord.church.name,
    churchAddress: baptismRecord.church.address,
    churchCity: baptismRecord.church.city,
    churchCountry: baptismRecord.church.country,
    pastorName: baptismRecord.pastorName,
    pastorTitle: baptismRecord.pastorTitle,
    bcn,
    qrCodeData,
    verificationUrl,
  });
  
  // Save certificate to database
  const certificate = await db.certificate.create({
    data: {
      bcn,
      baptismRecordId,
      verificationUrl,
      pdfData,
      qrCodeData,
    },
  });
  
  return {
    id: certificate.id,
    bcn: certificate.bcn,
    verificationUrl: certificate.verificationUrl,
    pdfData,
    qrCodeData,
  };
}

// Verify certificate by BCN
export async function verifyCertificate(bcn: string): Promise<{
  verified: boolean;
  data?: {
    bcn: string;
    personName: string;
    baptismDate: Date;
    churchName: string;
    churchLocation: string;
    pastorName: string;
    status: string;
    certificateDate: Date;
  };
}> {
  const certificate = await db.certificate.findUnique({
    where: { bcn },
    include: {
      baptismRecord: {
        include: {
          person: true,
          church: {
            include: {
              conference: {
                include: {
                  union: {
                    include: {
                      division: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  
  if (!certificate) {
    return { verified: false };
  }
  
  const baptism = certificate.baptismRecord;
  const church = baptism.church;
  
  let location = church.city || '';
  if (church.country) {
    location += location ? `, ${church.country}` : church.country;
  }
  
  return {
    verified: true,
    data: {
      bcn: certificate.bcn,
      personName: baptism.person.fullName,
      baptismDate: baptism.baptismDate,
      churchName: church.name,
      churchLocation: location,
      pastorName: baptism.pastorName,
      status: baptism.status,
      certificateDate: certificate.certificateDate,
    },
  };
}
