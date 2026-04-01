import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { db } from './db';
import type { BaptismRecord, Church, Conference, Union, Division, Person } from '@prisma/client';

// Template configuration interface
export interface TemplateConfig {
  layout: 'classic' | 'modern' | 'elegant' | 'minimal';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: {
    title: number;
    subtitle: number;
    body: number;
    small: number;
  };
  borderWidth: number;
  borderRadius: number;
  showLogo: boolean;
  showQRCode: boolean;
  backgroundPattern?: string;
}

// Built-in template configurations
export const BUILT_IN_TEMPLATES: Record<string, TemplateConfig> = {
  classic: {
    layout: 'classic',
    primaryColor: '#1a365d',
    secondaryColor: '#2d5a87',
    accentColor: '#b8860b',
    fontFamily: 'helvetica',
    fontSize: { title: 28, subtitle: 12, body: 14, small: 10 },
    borderWidth: 3,
    borderRadius: 0,
    showLogo: true,
    showQRCode: true,
  },
  modern: {
    layout: 'modern',
    primaryColor: '#1a1a2e',
    secondaryColor: '#16213e',
    accentColor: '#0f3460',
    fontFamily: 'helvetica',
    fontSize: { title: 32, subtitle: 14, body: 13, small: 10 },
    borderWidth: 1,
    borderRadius: 8,
    showLogo: true,
    showQRCode: true,
  },
  elegant: {
    layout: 'elegant',
    primaryColor: '#2c3e50',
    secondaryColor: '#4a6274',
    accentColor: '#c9a961',
    fontFamily: 'times',
    fontSize: { title: 30, subtitle: 13, body: 14, small: 10 },
    borderWidth: 2,
    borderRadius: 0,
    showLogo: true,
    showQRCode: true,
    backgroundPattern: 'ornate',
  },
};

// Certificate PDF data interface
export interface CertificatePDFData {
  personName: string;
  baptismDate: Date;
  churchName: string;
  churchAddress?: string | null;
  churchCity?: string | null;
  churchCountry?: string | null;
  churchLogo?: string | null;
  pastorName: string;
  pastorTitle?: string | null;
  bcn: string;
  qrCodeData: string;
  verificationUrl: string;
}

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
export async function generateQRCode(verificationUrl: string, darkColor: string = '#1a365d'): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: darkColor,
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

// Generate Classic-style certificate PDF
function generateClassicCertificate(doc: jsPDF, data: CertificatePDFData, config: TemplateConfig): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Double border
  doc.setDrawColor(config.primaryColor);
  doc.setLineWidth(config.borderWidth);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(1);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  // Header decorative line
  doc.setDrawColor(config.accentColor);
  doc.setLineWidth(0.5);
  doc.line(30, 35, pageWidth - 30, 35);

  // Title
  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title);
  doc.setTextColor(config.primaryColor);
  doc.text('CERTIFICATE OF BAPTISM', pageWidth / 2, 50, { align: 'center' });

  // Decorative line under title
  doc.setDrawColor(config.accentColor);
  doc.line(50, 55, pageWidth - 50, 55);

  // Subtitle
  doc.setFontSize(config.fontSize.subtitle);
  doc.setTextColor(config.secondaryColor);
  doc.setFont(config.fontFamily, 'normal');
  doc.text('Seventh-day Adventist Church', pageWidth / 2, 65, { align: 'center' });

  renderCertificateBody(doc, data, config, pageWidth, pageHeight);
}

// Generate Modern-style certificate PDF
function generateModernCertificate(doc: jsPDF, data: CertificatePDFData, config: TemplateConfig): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Thin border with accent color
  doc.setDrawColor(config.secondaryColor);
  doc.setLineWidth(config.borderWidth);
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, config.borderRadius, config.borderRadius);

  // Top accent bar
  doc.setFillColor(config.primaryColor);
  doc.roundedRect(8, 8, pageWidth - 16, 4, 0, 0, 'F');

  // Bottom accent bar
  doc.setFillColor(config.primaryColor);
  doc.roundedRect(8, pageHeight - 12, pageWidth - 16, 4, 0, 0, 'F');

  // Title
  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title);
  doc.setTextColor(config.primaryColor);
  doc.text('CERTIFICATE OF BAPTISM', pageWidth / 2, 45, { align: 'center' });

  // Subtitle
  doc.setFontSize(config.fontSize.subtitle);
  doc.setTextColor(config.secondaryColor);
  doc.setFont(config.fontFamily, 'normal');
  doc.text('Seventh-day Adventist Church', pageWidth / 2, 55, { align: 'center' });

  // Clean separator line
  doc.setDrawColor(config.accentColor);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 40, 60, pageWidth / 2 + 40, 60);

  renderCertificateBody(doc, data, config, pageWidth, pageHeight);
}

// Generate Elegant-style certificate PDF
function generateElegantCertificate(doc: jsPDF, data: CertificatePDFData, config: TemplateConfig): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Double border with accent color
  doc.setDrawColor(config.accentColor);
  doc.setLineWidth(config.borderWidth);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, pageWidth - 22, pageHeight - 22);

  // Corner ornaments (decorative lines)
  const cornerSize = 15;
  doc.setDrawColor(config.accentColor);
  doc.setLineWidth(0.5);
  // Top-left
  doc.line(14, 14, 14 + cornerSize, 14);
  doc.line(14, 14, 14, 14 + cornerSize);
  // Top-right
  doc.line(pageWidth - 14, 14, pageWidth - 14 - cornerSize, 14);
  doc.line(pageWidth - 14, 14, pageWidth - 14, 14 + cornerSize);
  // Bottom-left
  doc.line(14, pageHeight - 14, 14 + cornerSize, pageHeight - 14);
  doc.line(14, pageHeight - 14, 14, pageHeight - 14 - cornerSize);
  // Bottom-right
  doc.line(pageWidth - 14, pageHeight - 14, pageWidth - 14 - cornerSize, pageHeight - 14);
  doc.line(pageWidth - 14, pageHeight - 14, pageWidth - 14, pageHeight - 14 - cornerSize);

  // Title with serif font
  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title);
  doc.setTextColor(config.primaryColor);
  doc.text('CERTIFICATE OF BAPTISM', pageWidth / 2, 48, { align: 'center' });

  // Ornate line under title
  doc.setDrawColor(config.accentColor);
  doc.setLineWidth(0.5);
  doc.line(40, 54, pageWidth - 40, 54);
  doc.setLineWidth(0.3);
  doc.line(55, 57, pageWidth - 55, 57);

  // Subtitle
  doc.setFontSize(config.fontSize.subtitle);
  doc.setTextColor(config.secondaryColor);
  doc.setFont(config.fontFamily, 'italic');
  doc.text('Seventh-day Adventist Church', pageWidth / 2, 66, { align: 'center' });

  renderCertificateBody(doc, data, config, pageWidth, pageHeight);
}

// Generate Minimal-style certificate PDF
function generateMinimalCertificate(doc: jsPDF, data: CertificatePDFData, config: TemplateConfig): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Simple top and bottom lines
  doc.setDrawColor(config.primaryColor);
  doc.setLineWidth(config.borderWidth);
  doc.line(20, 30, pageWidth - 20, 30);
  doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);

  // Title
  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title);
  doc.setTextColor(config.primaryColor);
  doc.text('CERTIFICATE OF BAPTISM', pageWidth / 2, 50, { align: 'center' });

  // Subtitle
  doc.setFontSize(config.fontSize.subtitle);
  doc.setTextColor(config.secondaryColor);
  doc.setFont(config.fontFamily, 'normal');
  doc.text('Seventh-day Adventist Church', pageWidth / 2, 60, { align: 'center' });

  renderCertificateBody(doc, data, config, pageWidth, pageHeight);
}

// Shared body rendering for all templates
function renderCertificateBody(
  doc: jsPDF,
  data: CertificatePDFData,
  config: TemplateConfig,
  pageWidth: number,
  pageHeight: number
): void {
  const baptismDateStr = data.baptismDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const contentStartY = 85;

  // "This is to certify that"
  doc.setFontSize(config.fontSize.body);
  doc.setTextColor('#333333');
  doc.setFont(config.fontFamily, 'normal');
  doc.text('This is to certify that', pageWidth / 2, contentStartY, { align: 'center' });

  // Person name
  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title - 4);
  doc.setTextColor(config.primaryColor);
  doc.text(data.personName, pageWidth / 2, contentStartY + 15, { align: 'center' });

  // "was baptized by immersion on"
  doc.setFont(config.fontFamily, 'normal');
  doc.setFontSize(config.fontSize.body);
  doc.setTextColor('#333333');
  doc.text('was baptized by immersion on', pageWidth / 2, contentStartY + 30, { align: 'center' });

  // Date
  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title - 8);
  doc.setTextColor(config.primaryColor);
  doc.text(baptismDateStr, pageWidth / 2, contentStartY + 45, { align: 'center' });

  // Location
  doc.setFont(config.fontFamily, 'normal');
  doc.setFontSize(config.fontSize.subtitle);
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
  doc.setFont(config.fontFamily, 'bold');
  doc.text(pastorText, pageWidth / 2, contentStartY + 90, { align: 'center' });

  // Certificate number
  doc.setFont(config.fontFamily, 'normal');
  doc.setFontSize(config.fontSize.small);
  doc.setTextColor(config.secondaryColor);
  doc.text(`Certificate Number: ${data.bcn}`, pageWidth / 2, contentStartY + 110, { align: 'center' });

  // QR Code section
  if (config.showQRCode) {
    const qrSize = 35;
    const qrX = pageWidth - 50;
    const qrY = pageHeight - 75;

    try {
      const qrImage = data.qrCodeData.split(',')[1];
      doc.addImage(qrImage, 'PNG', qrX - qrSize / 2, qrY, qrSize, qrSize);
    } catch (error) {
      console.error('Error adding QR code to PDF:', error);
    }

    doc.setFontSize(8);
    doc.setTextColor('#666666');
    doc.text('Scan to verify', qrX, qrY + qrSize + 5, { align: 'center' });
  }

  // Church logo
  if (config.showLogo && data.churchLogo) {
    try {
      const logoData = data.churchLogo.startsWith('data:')
        ? data.churchLogo.split(',')[1]
        : data.churchLogo;
      doc.addImage(logoData, 'PNG', 30, 15, 25, 25);
    } catch (error) {
      console.error('Error adding church logo to PDF:', error);
    }
  }

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
}

// Generate certificate PDF with template configuration
export async function generateCertificateWithTemplate(
  data: CertificatePDFData,
  templateConfig: TemplateConfig
): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Generate QR code with template's primary color
  let qrCodeData = data.qrCodeData;
  if (templateConfig.showQRCode) {
    qrCodeData = await generateQRCode(data.verificationUrl, templateConfig.primaryColor);
    data.qrCodeData = qrCodeData;
  }

  // Dispatch to layout-specific generator
  switch (templateConfig.layout) {
    case 'classic':
      generateClassicCertificate(doc, data, templateConfig);
      break;
    case 'modern':
      generateModernCertificate(doc, data, templateConfig);
      break;
    case 'elegant':
      generateElegantCertificate(doc, data, templateConfig);
      break;
    case 'minimal':
      generateMinimalCertificate(doc, data, templateConfig);
      break;
    default:
      generateClassicCertificate(doc, data, templateConfig);
  }

  return doc.output('datauristring');
}

// Generate PDF certificate (original/Classic template as fallback)
export async function generateCertificatePDF(data: CertificatePDFData): Promise<string> {
  const classicConfig = BUILT_IN_TEMPLATES.classic;
  return generateCertificateWithTemplate(data, classicConfig);
}

// Full certificate generation flow
export async function createCertificate(
  baptismRecordId: string,
  baseUrl: string,
  templateId?: string
): Promise<{
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

  // Determine which template to use
  let templateConfig: TemplateConfig = BUILT_IN_TEMPLATES.classic;
  let resolvedTemplateId: string | undefined = templateId;

  if (!resolvedTemplateId) {
    // Check if the church has a default template
    const defaultTemplate = await db.certificateTemplate.findFirst({
      where: {
        OR: [
          { churchId: baptismRecord.churchId, isDefault: true },
          { churchId: null, isDefault: true, isSystem: true },
        ],
      },
      orderBy: [{ churchId: 'desc' }, { isDefault: 'desc' }],
    });
    if (defaultTemplate) {
      resolvedTemplateId = defaultTemplate.id;
    }
  }

  if (resolvedTemplateId) {
    const template = await db.certificateTemplate.findUnique({
      where: { id: resolvedTemplateId },
    });
    if (template) {
      try {
        templateConfig = JSON.parse(template.config) as TemplateConfig;
      } catch {
        // Fall back to classic
        templateConfig = BUILT_IN_TEMPLATES.classic;
      }
    }
  }

  // Generate QR code
  const qrCodeData = await generateQRCode(verificationUrl, templateConfig.primaryColor);

  // Certificate data
  const certData: CertificatePDFData = {
    personName: baptismRecord.person.fullName,
    baptismDate: baptismRecord.baptismDate,
    churchName: baptismRecord.church.name,
    churchAddress: baptismRecord.church.address,
    churchCity: baptismRecord.church.city,
    churchCountry: baptismRecord.church.country,
    churchLogo: baptismRecord.church.logo,
    pastorName: baptismRecord.pastorName,
    pastorTitle: baptismRecord.pastorTitle,
    bcn,
    qrCodeData,
    verificationUrl,
  };

  // Generate PDF with template
  const pdfData = await generateCertificateWithTemplate(certData, templateConfig);

  // Save certificate to database
  const certificate = await db.certificate.create({
    data: {
      bcn,
      baptismRecordId,
      verificationUrl,
      pdfData,
      qrCodeData,
      templateId: resolvedTemplateId,
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
