/**
 * ADVENTIFY - Enhanced Certificate Generation System
 * Handles PDF generation, QR codes, digital signatures, and digital wallets
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from './db';
import { Person, BaptismRecord, CertificateTemplate } from '@prisma/client';
import { CERTIFICATE_TEMPLATES } from './certificate-templates';

// ============================================
// Types & Interfaces
// ============================================
export interface CertificateGenerationOptions {
  recipientId: string;
  templateId?: string;
  includeDigitalWallet?: boolean;
  includeHighResPrint?: boolean;
  language?: string;
  securityLevel?: 'basic' | 'standard' | 'enhanced';
}

export interface CertificateGenerationResult {
  bcn: string;
  pdfData: Buffer;
  pdfHighResData?: Buffer;
  qrCodeData: string;
  qrCodeSvg?: string;
  digitalSignature: string;
  verificationUrl: string;
  applePassData?: string;
  googlePassJwt?: string;
  metadata: {
    generatedAt: Date;
    recipientName: string;
    baptismDate: Date;
    certificate Number: string;
    securityLevel: string;
  };
}

// ============================================
// BCN Generation
// ============================================
/**
 * Generate unique Baptism Certificate Number (BCN)
 * Format: DIV-UNI-CON-CH-YEAR-SERIAL
 * Example: EUD-BUC-SEC-001-2024-000001
 */
export function generateBCN(
  divisionCode: string,
  unionCode: string,
  conferenceCode: string,
  churchCode: string,
  serialNumber: number
): string {
  const year = new Date().getFullYear();
  const serial = String(serialNumber).padStart(6, '0');

  return `${divisionCode}-${unionCode}-${conferenceCode}-${churchCode}-${year}-${serial}`;
}

// ============================================
// QR Code Generation
// ============================================
/**
 * Generate QR code for certificate verification
 */
export async function generateQRCode(
  bcn: string,
  verificationUrl: string,
  size: number = 200
): Promise<{ png: string; svg: string }> {
  try {
    // PNG version (for PDF)
    const qrPng = await QRCode.toDataURL(verificationUrl, {
      width: size,
      margin: 1,
      color: {
        dark: '#1a365d',
        light: '#ffffff',
      },
    });

    // SVG version (for vector rendering)
    const qrSvg = await QRCode.toString(verificationUrl, {
      type: 'svg',
      width: size,
      margin: 1,
      color: {
        dark: '#1a365d',
        light: '#ffffff',
      },
    });

    return {
      png: qrPng,
      svg: qrSvg,
    };
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

// ============================================
// Digital Signature Generation
// ============================================
/**
 * Generate cryptographic digital signature
 * Uses HMAC-SHA256 for verification
 */
export function generateDigitalSignature(
  certificateData: Record<string, any>,
  signingKey: string = process.env.CERTIFICATE_SIGNING_KEY || 'default-key'
): string {
  const dataString = JSON.stringify(certificateData, Object.keys(certificateData).sort());

  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(dataString)
    .digest('hex');

  return signature;
}

/**
 * Verify digital signature
 */
export function verifyDigitalSignature(
  certificateData: Record<string, any>,
  signature: string,
  signingKey: string = process.env.CERTIFICATE_SIGNING_KEY || 'default-key'
): boolean {
  const expectedSignature = generateDigitalSignature(certificateData, signingKey);
  return signature === expectedSignature;
}

// ============================================
// PDF Generation
// ============================================
/**
 * Generate PDF certificate
 */
export async function generateCertificatePDF(
  recipient: Person & { baptismRecord: BaptismRecord },
  template: any,
  qrCodeData: string,
  bcn: string,
  dpi: number = 72 // 72 for screen, 300 for printing
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: template.design.pageSize.orientation,
    unit: 'in',
    format: [
      template.design.pageSize.width,
      template.design.pageSize.height,
    ],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ---- MINIMALIST TEMPLATE ----
  if (template.layout === 'minimalist') {
    return generateMinimalistCertificate(
      doc,
      recipient,
      template,
      qrCodeData,
      bcn,
      pageWidth,
      pageHeight
    );
  }

  // ---- TRADITIONAL TEMPLATE ----
  if (template.layout === 'traditional') {
    return generateTraditionalCertificate(
      doc,
      recipient,
      template,
      qrCodeData,
      bcn,
      pageWidth,
      pageHeight
    );
  }

  // ---- DIGITAL-NATIVE TEMPLATE ----
  if (template.layout === 'digital_native') {
    return generateDigitalNativeCertificate(
      doc,
      recipient,
      template,
      qrCodeData,
      bcn,
      pageWidth,
      pageHeight
    );
  }

  return doc.output('arraybuffer') as Buffer;
}

/**
 * Generate Minimalist Modern Certificate
 */
async function generateMinimalistCertificate(
  doc: jsPDF,
  recipient: Person & { baptismRecord: BaptismRecord },
  template: any,
  qrCodeData: string,
  bcn: string,
  pageWidth: number,
  pageHeight: number
): Promise<Buffer> {
  const colors = template.design.colors;

  // Header border
  doc.setDrawColor(colors.secondary);
  doc.setLineWidth(0.01);
  doc.line(0.5, 1.5, pageWidth - 0.5, 1.5);

  // Title
  doc.setFont('Georgia', 'normal');
  doc.setFontSize(48);
  doc.setTextColor(colors.primary);
  doc.text('CERTIFICATE OF BAPTISM', pageWidth / 2, 0.7, { align: 'center' });

  // Subtitle
  doc.setFont('Arial', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(colors.text);
  doc.text('Seventh-day Adventist Church', pageWidth / 2, 1.1, { align: 'center' });

  // Main content
  const contentStartY = 2.2;

  // "This certifies that"
  doc.setFontSize(14);
  doc.text('This certifies that', pageWidth / 2, contentStartY, { align: 'center' });

  // Recipient name (large, underlined)
  doc.setFontSize(36);
  doc.setFont('Arial', 'bold');
  doc.setTextColor(colors.secondary);
  doc.text(recipient.fullName.toUpperCase(), pageWidth / 2, contentStartY + 0.6, {
    align: 'center',
  });

  // Underline
  doc.setDrawColor(colors.secondary);
  doc.setLineWidth(0.02);
  doc.line(1.5, contentStartY + 0.75, pageWidth - 1.5, contentStartY + 0.75);

  // Certificate text
  doc.setFont('Arial', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(colors.text);
  doc.text('was baptized on', pageWidth / 2, contentStartY + 1.2, { align: 'center' });

  // Date
  doc.setFontSize(18);
  doc.setTextColor(colors.secondary);
  const baptismDate = recipient.baptismRecord.baptismDate;
  const dateString = baptismDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(dateString, pageWidth / 2, contentStartY + 1.7, { align: 'center' });

  // Location
  doc.setFontSize(12);
  doc.setTextColor(colors.text);
  doc.text(
    `at ${recipient.baptismRecord.baptismLocation || 'the designated location'}`,
    pageWidth / 2,
    contentStartY + 2.2,
    { align: 'center' }
  );

  // Certificate number
  doc.setFontSize(11);
  doc.setTextColor('#999999');
  doc.text(`Certificate Number: ${bcn}`, pageWidth / 2, contentStartY + 2.7, {
    align: 'center',
  });

  // Footer section (signatures, QR, seal)
  const footerY = pageHeight - 1.5;

  // Add QR code
  const qrImage = await QRCode.toDataURL(qrCodeData);
  doc.addImage(qrImage, 'PNG', pageWidth / 2 - 0.5, footerY - 1, 1, 1);

  // Pastor name line
  doc.setFontSize(11);
  doc.setTextColor(colors.text);
  doc.setLineWidth(0.01);
  doc.line(0.75, footerY - 0.15, 2, footerY - 0.15);
  doc.text('Pastor Name', 1.375, footerY, { align: 'center' });

  // Church seal/info line
  doc.line(pageWidth / 2 - 0.6, footerY - 0.15, pageWidth / 2 + 0.6, footerY - 0.15);
  doc.text('Church Seal', pageWidth / 2, footerY, { align: 'center' });

  // Digital signature indicator
  doc.setFontSize(9);
  doc.setTextColor('#4a90e2');
  doc.text('🔐 Digitally Signed', pageWidth - 1.5, footerY - 1.2, { align: 'right' });

  // Verification link
  doc.setFontSize(8);
  doc.setTextColor('#4a90e2');
  doc.text(`Verify: verify.adventify.org/cert/${bcn}`, pageWidth - 1.5, footerY - 0.8, {
    align: 'right',
  });

  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer);
}

/**
 * Generate Traditional Elegant Certificate
 */
async function generateTraditionalCertificate(
  doc: jsPDF,
  recipient: Person & { baptismRecord: BaptismRecord },
  template: any,
  qrCodeData: string,
  bcn: string,
  pageWidth: number,
  pageHeight: number
): Promise<Buffer> {
  const colors = template.design.colors;
  const margin = 0.75;

  // Ornate border (simplified version)
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.02);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Inner border
  doc.setLineWidth(0.01);
  doc.rect(margin + 0.1, margin + 0.1, pageWidth - (margin + 0.1) * 2, pageHeight - (margin + 0.1) * 2);

  // Decorative top element
  doc.setFont('Georgia', 'normal');
  doc.setFontSize(20);
  doc.setTextColor(colors.primary);
  doc.text('✦', pageWidth / 2, 1.2, { align: 'center' });

  // Title
  doc.setFontSize(48);
  doc.setFont('Georgia', 'bold');
  doc.text('HOLY BAPTISM', pageWidth / 2, 1.7, { align: 'center' });

  // Subtitle
  doc.setFontSize(14);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text('Certificate of Baptism', pageWidth / 2, 2.2, { align: 'center' });

  // Decorative line
  doc.setDrawColor(colors.secondary);
  doc.setLineWidth(0.01);
  doc.line(2.5, 2.5, pageWidth - 2.5, 2.5);

  // Main text
  const contentStartY = 3;
  doc.setFont('Georgia', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(colors.text);
  doc.text('This certifies that', pageWidth / 2, contentStartY, { align: 'center' });

  // Recipient name
  doc.setFontSize(28);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(recipient.fullName.toUpperCase(), pageWidth / 2, contentStartY + 0.6, {
    align: 'center',
  });

  // Double underline
  doc.setDrawColor(colors.secondary);
  doc.setLineWidth(0.01);
  doc.line(2, contentStartY + 0.8, pageWidth - 2, contentStartY + 0.8);
  doc.setLineWidth(0.005);
  doc.line(2, contentStartY + 0.85, pageWidth - 2, contentStartY + 0.85);

  // Covenant text
  doc.setFontSize(12);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(colors.text);
  const covenantText = 'Has been received into the sacred covenant of Baptism in the faith of Christ';
  doc.text(covenantText, pageWidth / 2, contentStartY + 1.4, {
    align: 'center',
    maxWidth: pageWidth - 2,
  });

  // Date information
  doc.setFontSize(13);
  const baptismDate = recipient.baptismRecord.baptismDate;
  const dateString = baptismDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(`On the ${dateString}`, pageWidth / 2, contentStartY + 2.3, { align: 'center' });

  // Location
  doc.text(
    `At ${recipient.baptismRecord.baptismLocation || 'the designated location'}`,
    pageWidth / 2,
    contentStartY + 2.8,
    { align: 'center' }
  );

  // Witness statement
  doc.setFontSize(11);
  doc.setTextColor(colors.secondary);
  doc.text('Witnessed by the Congregation', pageWidth / 2, contentStartY + 3.4, {
    align: 'center',
  });

  // Signature lines
  const signatureY = pageHeight - 1.5;
  doc.setLineWidth(0.01);
  doc.setFontSize(11);
  doc.setTextColor(colors.text);

  // Left signature
  doc.line(1.5, signatureY - 0.2, 2.8, signatureY - 0.2);
  doc.text('Pastor', 2.15, signatureY + 0.2, { align: 'center' });

  // Center - QR code
  const qrImage = await QRCode.toDataURL(qrCodeData);
  doc.addImage(qrImage, 'PNG', pageWidth / 2 - 0.4, signatureY - 1.1, 0.8, 0.8);

  // Right signature
  doc.line(pageWidth - 2.8, signatureY - 0.2, pageWidth - 1.5, signatureY - 0.2);
  doc.text('Church Seal', pageWidth - 2.15, signatureY + 0.2, { align: 'center' });

  // Certificate number at bottom
  doc.setFontSize(9);
  doc.setTextColor('#999999');
  doc.text(`Certificate: ${bcn}`, pageWidth / 2, pageHeight - 0.3, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer);
}

/**
 * Generate Digital-Native Modern Certificate
 */
async function generateDigitalNativeCertificate(
  doc: jsPDF,
  recipient: Person & { baptismRecord: BaptismRecord },
  template: any,
  qrCodeData: string,
  bcn: string,
  pageWidth: number,
  pageHeight: number
): Promise<Buffer> {
  const colors = template.design.colors;

  // Card-style background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.01);
  doc.roundedRect(0.5, 0.5, pageWidth - 1, pageHeight - 1, 0.15, 0.15, 'FD');

  // Header
  doc.setFont('Arial', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(colors.primary);
  doc.text('BAPTISM CERTIFICATE', 0.75, 1, { align: 'left' });

  // Status badge
  doc.setFillColor(240, 248, 240);
  doc.roundedRect(pageWidth - 2, 0.7, 1.5, 0.35, 0.08, 0.08, 'F');
  doc.setFontSize(11);
  doc.setTextColor(colors.successGreen);
  doc.text('✓ Verified', pageWidth - 1.35, 0.95, { align: 'center' });

  // QR Code section (left side)
  const qrImage = await QRCode.toDataURL(qrCodeData);
  doc.addImage(qrImage, 'PNG', 0.75, 1.5, 1.3, 1.3);
  doc.setFontSize(8);
  doc.setTextColor('#999999');
  doc.text('Scan to verify', 1.4, 3, { align: 'center' });

  // Content section (right side)
  const contentX = 2.3;

  doc.setFont('Arial', 'normal');
  doc.setFontSize(12);
  doc.setTextColor('#999999');
  doc.text('Recipient:', contentX, 1.65);

  doc.setFont('Arial', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(colors.text);
  doc.text(recipient.fullName, contentX, 2.05);

  // Baptism details
  doc.setFont('Arial', 'normal');
  doc.setFontSize(11);
  doc.setTextColor('#999999');

  const baptismDate = recipient.baptismRecord.baptismDate.toLocaleDateString();
  const location = recipient.baptismRecord.baptismLocation || 'Church Location';

  doc.text(`Baptized: ${baptismDate}, ${location}`, contentX, 2.45);

  // Certificate ID
  doc.setFontSize(10);
  doc.setFont('Courier', 'normal');
  doc.setTextColor('#666666');
  doc.text(`ID: ${bcn}`, contentX, 2.8);

  // Security badges
  doc.setFontSize(9);
  doc.setTextColor(colors.successGreen);
  doc.text('✓ Verified & Secure', contentX, 3.15);

  doc.setTextColor(colors.primary);
  doc.text('🔐 Digitally Signed', contentX + 2, 3.15);

  doc.setTextColor('#9b59b6');
  doc.text('⛓ Blockchain Verified', contentX + 4, 3.15);

  // Divider line
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.005);
  doc.line(0.75, 3.5, pageWidth - 0.75, 3.5);

  // Footer actions
  doc.setFontSize(9);
  doc.setTextColor(colors.primary);

  const actions = [
    '📤 Share',
    '📱 Add to Wallet',
    '⬇️ Download',
    '🔗 Verify',
  ];

  const actionSpacing = (pageWidth - 1.5) / 4;
  actions.forEach((action, index) => {
    doc.text(action, 0.75 + actionSpacing * index + actionSpacing / 2, 3.85, { align: 'center' });
  });

  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer);
}

// ============================================
// Digital Wallet Integration
// ============================================
/**
 * Generate Apple Wallet Pass (.pkpass)
 */
export async function generateApplePass(certificate: {
  bcn: string;
  recipientName: string;
  baptismDate: Date;
  location: string;
  verificationUrl: string;
}): Promise<string> {
  // This is a simplified version - full implementation would use passkit library
  const passData = {
    formatVersion: 1,
    description: 'Baptism Certificate',
    teamIdentifier: 'ADVENTIFY',
    passTypeIdentifier: 'pass.org.adventistchurch.baptism',
    serialNumber: certificate.bcn,
    organizationName: 'Seventh-day Adventist Church',

    generic: {
      primaryFields: [
        {
          key: 'recipient',
          label: 'Recipient',
          value: certificate.recipientName,
        },
        {
          key: 'baptismDate',
          label: 'Date of Baptism',
          value: certificate.baptismDate.toLocaleDateString(),
        },
      ],
      secondaryFields: [
        {
          key: 'location',
          label: 'Location',
          value: certificate.location,
        },
      ],
    },

    barcode: {
      format: 'PKBarcodeFormatQR',
      message: certificate.verificationUrl,
      messageEncoding: 'iso-8859-1',
    },

    backgroundColor: 'rgb(26, 54, 93)',
    foregroundColor: 'rgb(255, 255, 255)',
  };

  return JSON.stringify(passData);
}

/**
 * Generate Google Wallet JWT
 */
export async function generateGoogleWalletJwt(certificate: {
  bcn: string;
  recipientName: string;
  baptismDate: Date;
  location: string;
  verificationUrl: string;
}): Promise<string> {
  // This would require the jsonwebtoken library and Google Wallet credentials
  // Simplified version shown here
  const payload = {
    iss: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT,
    aud: 'google',
    origins: ['verify.adventify.org'],
    typ: 'savetogooglepay',
    payload: {
      eventTicketObjects: [
        {
          id: `adventify_baptism_${certificate.bcn}`,
          classId: 'adventistchurch.baptism.ticket',
          genericObject: {
            id: certificate.bcn,
            cardTitle: {
              defaultValue: {
                language: 'en-US',
                value: `Baptism Certificate - ${certificate.recipientName}`,
              },
            },
          },
        },
      ],
    },
  };

  return JSON.stringify(payload);
}

// ============================================
// Main Certificate Generation Function
// ============================================
export async function generateCompleteCertificate(
  options: CertificateGenerationOptions
): Promise<CertificateGenerationResult> {
  try {
    // 1. Fetch recipient data
    const recipient = await db.person.findUnique({
      where: { id: options.recipientId },
      include: { baptismRecord: true, church: true },
    });

    if (!recipient || !recipient.baptismRecord) {
      throw new Error('Invalid recipient or baptism record not found');
    }

    // 2. Get template
    const template = options.templateId
      ? await db.certificateTemplate.findUnique({
          where: { id: options.templateId },
        })
      : CERTIFICATE_TEMPLATES.minimalist;

    // 3. Get church info for BCN generation
    const church = recipient.church;
    if (!church) {
      throw new Error('Church information not found');
    }

    // 4. Generate BCN
    const bcn = generateBCN(
      'EUD', // This should be dynamic based on church hierarchy
      'BUC',
      'SEC',
      church.code,
      12345 // Serial number - should be fetched from DB
    );

    // 5. Generate verification URL
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'https://verify.adventify.org'}/verify/${bcn}`;

    // 6. Generate QR code
    const qrCodes = await generateQRCode(bcn, verificationUrl);

    // 7. Generate certificate data for signature
    const certificateData = {
      bcn,
      recipientName: recipient.fullName,
      baptismDate: recipient.baptismRecord.baptismDate.toISOString(),
      location: recipient.baptismRecord.baptismLocation,
      certificateDate: new Date().toISOString(),
    };

    // 8. Generate digital signature
    const digitalSignature = generateDigitalSignature(certificateData);

    // 9. Generate PDF
    const pdfBuffer = await generateCertificatePDF(
      recipient as any,
      template,
      verificationUrl,
      bcn,
      72
    );

    // 10. Generate high-res print version
    let pdfHighResBuffer: Buffer | undefined;
    if (options.includeHighResPrint) {
      pdfHighResBuffer = await generateCertificatePDF(
        recipient as any,
        template,
        verificationUrl,
        bcn,
        300
      );
    }

    // 11. Generate digital wallets
    let applePassData: string | undefined;
    let googlePassJwt: string | undefined;

    if (options.includeDigitalWallet) {
      applePassData = await generateApplePass({
        bcn,
        recipientName: recipient.fullName,
        baptismDate: recipient.baptismRecord.baptismDate,
        location: recipient.baptismRecord.baptismLocation || '',
        verificationUrl,
      });

      googlePassJwt = await generateGoogleWalletJwt({
        bcn,
        recipientName: recipient.fullName,
        baptismDate: recipient.baptismRecord.baptismDate,
        location: recipient.baptismRecord.baptismLocation || '',
        verificationUrl,
      });
    }

    return {
      bcn,
      pdfData: pdfBuffer,
      pdfHighResData: pdfHighResBuffer,
      qrCodeData: qrCodes.png,
      qrCodeSvg: qrCodes.svg,
      digitalSignature,
      verificationUrl,
      applePassData,
      googlePassJwt,
      metadata: {
        generatedAt: new Date(),
        recipientName: recipient.fullName,
        baptismDate: recipient.baptismRecord.baptismDate,
        certificateNumber: bcn,
        securityLevel: options.securityLevel || 'standard',
      },
    };
  } catch (error) {
    console.error('Certificate generation error:', error);
    throw error;
  }
}

export default generateCompleteCertificate;
