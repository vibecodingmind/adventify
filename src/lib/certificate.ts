import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { db } from './db';
import type { BaptismRecord, Church, Conference, Union, Division, Person } from '@prisma/client';

// Template configuration interface
export interface TemplateConfig {
  layout: 'classic' | 'modern' | 'elegant' | 'minimal' | 'sda';
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
  sda: {
    layout: 'sda',
    primaryColor: '#1a365d',
    secondaryColor: '#2d5a87',
    accentColor: '#b8860b',
    fontFamily: 'times',
    fontSize: { title: 32, subtitle: 13, body: 13, small: 9 },
    borderWidth: 2.5,
    borderRadius: 0,
    showLogo: true,
    showQRCode: true,
  },
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

// ============================================================
// SDA BAPTISM CERTIFICATE - Premium Design (matches uploaded ref)
// ============================================================

function drawOrnateCorners(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  color: string
): void {
  const cornerLen = 18;
  const innerOff = 3;

  doc.setDrawColor(color);
  doc.setLineWidth(1.2);

  // === TOP-LEFT corner ===
  // Vertical flourish
  doc.line(14, 14, 14, 14 + cornerLen);
  doc.line(14, 14, 14 + cornerLen, 14);
  // Inner decorative curve
  doc.setLineWidth(0.5);
  doc.line(14 + innerOff, 14 + innerOff, 14 + cornerLen * 0.6, 14 + innerOff);
  doc.line(14 + innerOff, 14 + innerOff, 14 + innerOff, 14 + cornerLen * 0.6);
  // Circle ornament
  doc.setLineWidth(0.6);
  doc.circle(14 + 4, 14 + 4, 2.5, 'S');

  // === TOP-RIGHT corner ===
  const trX = pageWidth - 14;
  doc.setLineWidth(1.2);
  doc.line(trX, 14, trX, 14 + cornerLen);
  doc.line(trX, 14, trX - cornerLen, 14);
  doc.setLineWidth(0.5);
  doc.line(trX - innerOff, 14 + innerOff, trX - cornerLen * 0.6, 14 + innerOff);
  doc.line(trX - innerOff, 14 + innerOff, trX - innerOff, 14 + cornerLen * 0.6);
  doc.setLineWidth(0.6);
  doc.circle(trX - 4, 14 + 4, 2.5, 'S');

  // === BOTTOM-LEFT corner ===
  const blY = pageHeight - 14;
  doc.setLineWidth(1.2);
  doc.line(14, blY, 14, blY - cornerLen);
  doc.line(14, blY, 14 + cornerLen, blY);
  doc.setLineWidth(0.5);
  doc.line(14 + innerOff, blY - innerOff, 14 + cornerLen * 0.6, blY - innerOff);
  doc.line(14 + innerOff, blY - innerOff, 14 + innerOff, blY - cornerLen * 0.6);
  doc.setLineWidth(0.6);
  doc.circle(14 + 4, blY - 4, 2.5, 'S');

  // === BOTTOM-RIGHT corner ===
  const brX = pageWidth - 14;
  const brY = pageHeight - 14;
  doc.setLineWidth(1.2);
  doc.line(brX, brY, brX, brY - cornerLen);
  doc.line(brX, brY, brX - cornerLen, brY);
  doc.setLineWidth(0.5);
  doc.line(brX - innerOff, brY - innerOff, brX - cornerLen * 0.6, brY - innerOff);
  doc.line(brX - innerOff, brY - innerOff, brX - innerOff, brY - cornerLen * 0.6);
  doc.setLineWidth(0.6);
  doc.circle(brX - 4, brY - 4, 2.5, 'S');
}

function drawCross(doc: jsPDF, cx: number, cy: number, size: number, color: string): void {
  doc.setDrawColor(color);
  doc.setFillColor(color);
  const armW = size * 0.22;
  const armH = size * 0.35;
  const crossH = size * 0.7;

  // Vertical bar
  doc.roundedRect(cx - armW / 2, cy - crossH / 2, armW, crossH, 1, 1, 'F');
  // Horizontal bar
  doc.roundedRect(cx - size / 2, cy - armH / 2, size, armH, 1, 1, 'F');
}

function drawDove(doc: jsPDF, cx: number, cy: number, size: number, color: string, flip: boolean = false): void {
  doc.setDrawColor(color);
  doc.setFillColor(color);
  const s = flip ? -1 : 1;

  // Body (ellipse approximation)
  doc.ellipse(cx, cy, size * 0.5 * s, size * 0.25, 0, 'F');

  // Wing
  doc.ellipse(cx - size * 0.15 * s, cy - size * 0.15, size * 0.35 * s, size * 0.12, flip ? -15 : 15, 'F');

  // Head
  doc.circle(cx + size * 0.4 * s, cy - size * 0.08, size * 0.12, 'F');

  // Beak
  const beakX = cx + size * 0.52 * s;
  const beakY = cy - size * 0.08;
  doc.triangle(beakX, beakY, beakX + size * 0.15 * s, beakY + size * 0.04, beakX + size * 0.15 * s, beakY - size * 0.04, 'F');

  // Tail feathers
  doc.ellipse(cx - size * 0.55 * s, cy + size * 0.05, size * 0.2 * s, size * 0.08, flip ? 20 : -20, 'F');
}

function drawDiamondLine(doc: jsPDF, y: number, centerX: number, halfWidth: number, color: string): void {
  doc.setDrawColor(color);
  doc.setFillColor(color);
  doc.setLineWidth(0.4);

  // Main line
  doc.line(centerX - halfWidth, y, centerX + halfWidth, y);

  // Left diamond
  const dSize = 2;
  doc.triangle(
    centerX - halfWidth - dSize, y,
    centerX - halfWidth, y - dSize,
    centerX - halfWidth, y + dSize,
    'F'
  );
  doc.triangle(
    centerX - halfWidth + dSize, y,
    centerX - halfWidth, y - dSize,
    centerX - halfWidth, y + dSize,
    'F'
  );

  // Right diamond
  doc.triangle(
    centerX + halfWidth + dSize, y,
    centerX + halfWidth, y - dSize,
    centerX + halfWidth, y + dSize,
    'F'
  );
  doc.triangle(
    centerX + halfWidth - dSize, y,
    centerX + halfWidth, y - dSize,
    centerX + halfWidth, y + dSize,
    'F'
  );

  // Center diamond
  const cd = 2.5;
  doc.triangle(centerX - cd, y, centerX, y - cd, centerX + cd, y, 'F');
  doc.triangle(centerX - cd, y, centerX, y + cd, centerX + cd, y, 'F');
}

function drawOrnateDivider(doc: jsPDF, y: number, centerX: number, halfWidth: number, color: string): void {
  doc.setDrawColor(color);
  doc.setFillColor(color);

  // Center ornament (small diamond cluster)
  const cd = 2;
  doc.triangle(centerX - cd, y, centerX, y - cd, centerX + cd, y, 'F');
  doc.triangle(centerX - cd, y, centerX, y + cd, centerX + cd, y, 'F');

  // Lines extending from center
  doc.setLineWidth(0.4);
  doc.line(centerX - cd - 2, y, centerX - halfWidth, y);
  doc.line(centerX + cd + 2, y, centerX + halfWidth, y);

  // Small dots along the line
  const dotSpacing = 15;
  const numDots = Math.floor(halfWidth / dotSpacing);
  for (let i = 1; i <= numDots; i++) {
    const x1 = centerX - cd - 2 - (i * dotSpacing);
    const x2 = centerX + cd + 2 + (i * dotSpacing);
    if (x1 > centerX - halfWidth) {
      doc.circle(x1, y, 0.6, 'F');
    }
    if (x2 < centerX + halfWidth) {
      doc.circle(x2, y, 0.6, 'F');
    }
  }
}

function generateSDACertificate(doc: jsPDF, data: CertificatePDFData, config: TemplateConfig): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cx = pageWidth / 2;

  // ── OUTER BORDER ──
  doc.setDrawColor(config.primaryColor);
  doc.setLineWidth(config.borderWidth);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // ── INNER BORDER ──
  doc.setDrawColor(config.secondaryColor);
  doc.setLineWidth(0.8);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // ── ORNATE CORNERS ──
  drawOrnateCorners(doc, pageWidth, pageHeight, config.primaryColor);

  // ── CHURCH LOGO (top-left, inside border) ──
  if (config.showLogo && data.churchLogo) {
    try {
      const logoData = data.churchLogo.startsWith('data:')
        ? data.churchLogo.split(',')[1]
        : data.churchLogo;
      doc.addImage(logoData, 'PNG', 22, 18, 18, 18);
    } catch (error) {
      console.error('Error adding church logo to PDF:', error);
    }
  }

  // ── TITLE: "Certificate of Baptism" ──
  doc.setFont('times', 'bold');
  doc.setFontSize(config.fontSize.title);
  doc.setTextColor('#2c2c2c');
  doc.text('Certificate of Baptism', cx, 50, { align: 'center' });

  // ── SUBTITLE LINE (decorative) ──
  drawOrnateDivider(doc, 55, cx, 55, config.accentColor);

  // ── CROSS ──
  drawCross(doc, cx, 72, 14, config.secondaryColor);

  // ── DOVES flanking the cross ──
  drawDove(doc, cx - 22, 70, 10, config.secondaryColor, true);
  drawDove(doc, cx + 22, 70, 10, config.secondaryColor, false);

  // ── SECONDARY DECORATIVE LINE ──
  drawOrnateDivider(doc, 84, cx, 55, config.accentColor);

  // ── "This certifies that" ──
  doc.setFont('times', 'normal');
  doc.setFontSize(config.fontSize.body);
  doc.setTextColor('#444444');
  doc.text('This certifies that', cx, 98, { align: 'center' });

  // ── RECIPIENT NAME (large, italic — cursive approximation) ──
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(26);
  doc.setTextColor(config.primaryColor);
  doc.text(data.personName, cx, 114, { align: 'center' });

  // ── DECORATIVE DIAMOND LINE under name ──
  drawDiamondLine(doc, 120, cx, 65, config.accentColor);

  // ── BAPTISMAL FORMULA ──
  doc.setFont('times', 'normal');
  doc.setFontSize(config.fontSize.body);
  doc.setTextColor('#444444');

  const baptismDateStr = data.baptismDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.text('was baptized by immersion in the name of the Father,', cx, 132, { align: 'center' });
  doc.text('the Son, and the Holy Spirit', cx, 139, { align: 'center' });

  // ── DATE ──
  doc.setFont('times', 'bold');
  doc.setFontSize(config.fontSize.subtitle + 1);
  doc.setTextColor(config.primaryColor);
  doc.text(baptismDateStr, cx, 150, { align: 'center' });

  // ── LOCATION ──
  doc.setFont('times', 'normal');
  doc.setFontSize(config.fontSize.subtitle);
  doc.setTextColor('#444444');

  let locationText = `at ${data.churchName}`;
  if (data.churchCity) locationText += `, ${data.churchCity}`;
  if (data.churchCountry) locationText += `, ${data.churchCountry}`;

  doc.text(locationText, cx, 160, { align: 'center' });

  // ── ORNAMENTAL DIVIDER before signatures ──
  drawOrnateDivider(doc, 175, cx, 50, config.accentColor);

  // ── SIGNATURE SECTION ──
  const sigY = 195;

  doc.setFont('times', 'normal');
  doc.setFontSize(config.fontSize.small);

  // Left: Church Clerk
  doc.setDrawColor('#555555');
  doc.setLineWidth(0.3);
  doc.line(35, sigY, 85, sigY);
  doc.setTextColor('#444444');
  doc.setFontSize(config.fontSize.small);
  doc.text('Church Clerk / Secretary', 60, sigY + 6, { align: 'center' });

  // Center: Officiating Minister (with name)
  const pastorText = data.pastorTitle
    ? `${data.pastorTitle} ${data.pastorName}`
    : data.pastorName;
  doc.line(cx - 30, sigY, cx + 30, sigY);
  doc.text('Officiating Minister', cx, sigY + 6, { align: 'center' });
  doc.setFont('times', 'italic');
  doc.setFontSize(config.fontSize.small - 0.5);
  doc.text(pastorText, cx, sigY - 5, { align: 'center' });

  // Right: Conference Representative
  doc.setFont('times', 'normal');
  doc.setFontSize(config.fontSize.small);
  const rightX = pageWidth - 60;
  doc.line(pageWidth - 85, sigY, pageWidth - 35, sigY);
  doc.text('Conference Representative', rightX, sigY + 6, { align: 'center' });

  // ── QR CODE (bottom-right, inside border) ──
  if (config.showQRCode) {
    const qrSize = 28;
    const qrX = pageWidth - 48;
    const qrY = pageHeight - 55;

    try {
      const qrImage = data.qrCodeData.split(',')[1];
      doc.addImage(qrImage, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (error) {
      console.error('Error adding QR code to PDF:', error);
    }

    // QR border
    doc.setDrawColor(config.secondaryColor);
    doc.setLineWidth(0.3);
    doc.rect(qrX - 0.5, qrY - 0.5, qrSize + 1, qrSize + 1);

    doc.setFontSize(7);
    doc.setTextColor('#777777');
    doc.setFont('times', 'italic');
    doc.text('Scan to verify', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });
  }

  // ── FOOTER: Certificate ID ──
  doc.setFont('times', 'normal');
  doc.setFontSize(config.fontSize.small);
  doc.setTextColor(config.secondaryColor);
  doc.text(`Certificate No: ${data.bcn}`, cx, pageHeight - 30, { align: 'center' });

  // ── FOOTER: Verification URL ──
  doc.setFontSize(7);
  doc.setTextColor('#999999');
  doc.setFont('times', 'italic');
  doc.text(
    `Verify online: ${data.verificationUrl}`,
    cx,
    pageHeight - 22,
    { align: 'center' }
  );

  // ── FOOTER: Generation date ──
  doc.setFont('times', 'normal');
  doc.text(
    `Issued: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`,
    cx,
    pageHeight - 16,
    { align: 'center' }
  );
}


// ============================================================
// LEGACY TEMPLATES (kept for backward compatibility)
// ============================================================

// Generate Classic-style certificate PDF
function generateClassicCertificate(doc: jsPDF, data: CertificatePDFData, config: TemplateConfig): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(config.primaryColor);
  doc.setLineWidth(config.borderWidth);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(1);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  doc.setDrawColor(config.accentColor);
  doc.setLineWidth(0.5);
  doc.line(30, 35, pageWidth - 30, 35);

  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title);
  doc.setTextColor(config.primaryColor);
  doc.text('CERTIFICATE OF BAPTISM', pageWidth / 2, 50, { align: 'center' });

  doc.setDrawColor(config.accentColor);
  doc.line(50, 55, pageWidth - 50, 55);

  doc.setFontSize(config.fontSize.subtitle);
  doc.setTextColor(config.secondaryColor);
  doc.setFont(config.fontFamily, 'normal');
  doc.text('Seventh-day Adventist Church', pageWidth / 2, 65, { align: 'center' });

  renderLegacyCertificateBody(doc, data, config, pageWidth, pageHeight);
}

// Generate Modern-style certificate PDF
function generateModernCertificate(doc: jsPDF, data: CertificatePDFData, config: TemplateConfig): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(config.secondaryColor);
  doc.setLineWidth(config.borderWidth);
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, config.borderRadius, config.borderRadius);

  doc.setFillColor(config.primaryColor);
  doc.roundedRect(8, 8, pageWidth - 16, 4, 0, 0, 'F');
  doc.roundedRect(8, pageHeight - 12, pageWidth - 16, 4, 0, 0, 'F');

  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title);
  doc.setTextColor(config.primaryColor);
  doc.text('CERTIFICATE OF BAPTISM', pageWidth / 2, 45, { align: 'center' });

  doc.setFontSize(config.fontSize.subtitle);
  doc.setTextColor(config.secondaryColor);
  doc.setFont(config.fontFamily, 'normal');
  doc.text('Seventh-day Adventist Church', pageWidth / 2, 55, { align: 'center' });

  doc.setDrawColor(config.accentColor);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 40, 60, pageWidth / 2 + 40, 60);

  renderLegacyCertificateBody(doc, data, config, pageWidth, pageHeight);
}

// Generate Elegant-style certificate PDF
function generateElegantCertificate(doc: jsPDF, data: CertificatePDFData, config: TemplateConfig): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(config.accentColor);
  doc.setLineWidth(config.borderWidth);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, pageWidth - 22, pageHeight - 22);

  const cornerSize = 15;
  doc.setDrawColor(config.accentColor);
  doc.setLineWidth(0.5);
  doc.line(14, 14, 14 + cornerSize, 14);
  doc.line(14, 14, 14, 14 + cornerSize);
  doc.line(pageWidth - 14, 14, pageWidth - 14 - cornerSize, 14);
  doc.line(pageWidth - 14, 14, pageWidth - 14, 14 + cornerSize);
  doc.line(14, pageHeight - 14, 14 + cornerSize, pageHeight - 14);
  doc.line(14, pageHeight - 14, 14, pageHeight - 14 - cornerSize);
  doc.line(pageWidth - 14, pageHeight - 14, pageWidth - 14 - cornerSize, pageHeight - 14);
  doc.line(pageWidth - 14, pageHeight - 14, pageWidth - 14, pageHeight - 14 - cornerSize);

  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title);
  doc.setTextColor(config.primaryColor);
  doc.text('CERTIFICATE OF BAPTISM', pageWidth / 2, 48, { align: 'center' });

  doc.setDrawColor(config.accentColor);
  doc.setLineWidth(0.5);
  doc.line(40, 54, pageWidth - 40, 54);
  doc.setLineWidth(0.3);
  doc.line(55, 57, pageWidth - 55, 57);

  doc.setFontSize(config.fontSize.subtitle);
  doc.setTextColor(config.secondaryColor);
  doc.setFont(config.fontFamily, 'italic');
  doc.text('Seventh-day Adventist Church', pageWidth / 2, 66, { align: 'center' });

  renderLegacyCertificateBody(doc, data, config, pageWidth, pageHeight);
}

// Generate Minimal-style certificate PDF
function generateMinimalCertificate(doc: jsPDF, data: CertificatePDFData, config: TemplateConfig): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(config.primaryColor);
  doc.setLineWidth(config.borderWidth);
  doc.line(20, 30, pageWidth - 20, 30);
  doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);

  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title);
  doc.setTextColor(config.primaryColor);
  doc.text('CERTIFICATE OF BAPTISM', pageWidth / 2, 50, { align: 'center' });

  doc.setFontSize(config.fontSize.subtitle);
  doc.setTextColor(config.secondaryColor);
  doc.setFont(config.fontFamily, 'normal');
  doc.text('Seventh-day Adventist Church', pageWidth / 2, 60, { align: 'center' });

  renderLegacyCertificateBody(doc, data, config, pageWidth, pageHeight);
}

// Shared body rendering for legacy templates
function renderLegacyCertificateBody(
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

  doc.setFontSize(config.fontSize.body);
  doc.setTextColor('#333333');
  doc.setFont(config.fontFamily, 'normal');
  doc.text('This is to certify that', pageWidth / 2, contentStartY, { align: 'center' });

  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title - 4);
  doc.setTextColor(config.primaryColor);
  doc.text(data.personName, pageWidth / 2, contentStartY + 15, { align: 'center' });

  doc.setFont(config.fontFamily, 'normal');
  doc.setFontSize(config.fontSize.body);
  doc.setTextColor('#333333');
  doc.text('was baptized by immersion on', pageWidth / 2, contentStartY + 30, { align: 'center' });

  doc.setFont(config.fontFamily, 'bold');
  doc.setFontSize(config.fontSize.title - 8);
  doc.setTextColor(config.primaryColor);
  doc.text(baptismDateStr, pageWidth / 2, contentStartY + 45, { align: 'center' });

  doc.setFont(config.fontFamily, 'normal');
  doc.setFontSize(config.fontSize.subtitle);
  doc.setTextColor('#333333');

  let locationText = data.churchName;
  if (data.churchCity) locationText += `, ${data.churchCity}`;
  if (data.churchCountry) locationText += `, ${data.churchCountry}`;

  doc.text(`at ${locationText}`, pageWidth / 2, contentStartY + 60, { align: 'center' });

  const pastorText = data.pastorTitle
    ? `${data.pastorTitle} ${data.pastorName}`
    : data.pastorName;

  doc.text('Officiating Minister:', pageWidth / 2, contentStartY + 80, { align: 'center' });
  doc.setFont(config.fontFamily, 'bold');
  doc.text(pastorText, pageWidth / 2, contentStartY + 90, { align: 'center' });

  doc.setFont(config.fontFamily, 'normal');
  doc.setFontSize(config.fontSize.small);
  doc.setTextColor(config.secondaryColor);
  doc.text(`Certificate Number: ${data.bcn}`, pageWidth / 2, contentStartY + 110, { align: 'center' });

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

  const signatureY = pageHeight - 60;

  doc.setDrawColor('#333333');
  doc.setLineWidth(0.3);
  doc.line(40, signatureY, 100, signatureY);
  doc.line(pageWidth - 100, signatureY, pageWidth - 40, signatureY);

  doc.setFontSize(9);
  doc.setTextColor('#666666');
  doc.text('Church Clerk / Secretary', 70, signatureY + 7, { align: 'center' });
  doc.text('Officiating Minister', pageWidth - 70, signatureY + 7, { align: 'center' });

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

// ============================================================
// MAIN GENERATION FUNCTIONS
// ============================================================

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
    case 'sda':
      generateSDACertificate(doc, data, templateConfig);
      break;
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
      generateSDACertificate(doc, data, templateConfig);
  }

  return doc.output('datauristring');
}

// Generate PDF certificate (SDA template as default)
export async function generateCertificatePDF(data: CertificatePDFData): Promise<string> {
  const sdaConfig = BUILT_IN_TEMPLATES.sda;
  return generateCertificateWithTemplate(data, sdaConfig);
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

  const existingCertificate = await db.certificate.findUnique({
    where: { baptismRecordId },
  });

  if (existingCertificate) {
    return {
      id: existingCertificate.id,
      bcn: existingCertificate.bcn,
      verificationUrl: existingCertificate.verificationUrl,
      pdfData: existingCertificate.pdfData || '',
      qrCodeData: existingCertificate.qrCodeData || '',
    };
  }

  const bcn = await generateBCN(baptismRecord.churchId, baptismRecord.baptismDate);
  const verificationUrl = `${baseUrl}/verify/${bcn}`;

  // Determine which template to use (default to SDA)
  let templateConfig: TemplateConfig = BUILT_IN_TEMPLATES.sda;
  let resolvedTemplateId: string | undefined = templateId;

  if (!resolvedTemplateId) {
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
        templateConfig = BUILT_IN_TEMPLATES.sda;
      }
    }
  }

  const qrCodeData = await generateQRCode(verificationUrl, templateConfig.primaryColor);

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

  const pdfData = await generateCertificateWithTemplate(certData, templateConfig);

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
