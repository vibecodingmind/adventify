/**
 * ADVENTIFY - Certificate Template System
 * Professional Certificate Templates for Baptism Certificates
 * Three design approaches: Minimalist, Traditional, Digital-Native
 */

import { CertificateTemplate } from '@prisma/client';

// ============================================
// TEMPLATE 1: MINIMALIST MODERN
// ============================================
export const MINIMALIST_TEMPLATE = {
  id: 'template-minimalist-modern',
  name: 'Minimalist Modern',
  description: 'Clean, contemporary design with integrated QR code',
  layout: 'minimalist' as const,

  design: {
    // Paper size
    pageSize: {
      width: 11, // inches
      height: 8.5,
      orientation: 'landscape' as const,
    },

    // Color scheme
    colors: {
      primary: '#1a365d', // Deep blue
      secondary: '#2d5a87', // Medium blue
      accent: '#4a90e2', // Light blue
      background: '#ffffff', // White
      text: '#1a1a1a', // Dark gray
      light: '#f5f5f5', // Light gray
    },

    // Fonts
    fonts: {
      title: {
        family: 'Georgia, serif',
        size: 48,
        weight: 'normal',
        color: '#1a365d',
      },
      heading: {
        family: 'Arial, sans-serif',
        size: 24,
        weight: 'bold',
        color: '#2d5a87',
      },
      body: {
        family: 'Arial, sans-serif',
        size: 14,
        weight: 'normal',
        color: '#1a1a1a',
      },
      label: {
        family: 'Arial, sans-serif',
        size: 11,
        weight: 'normal',
        color: '#666666',
      },
    },

    // Layout sections
    sections: {
      header: {
        height: '20%',
        backgroundColor: '#ffffff',
        borderBottom: {
          style: 'solid',
          width: 2,
          color: '#2d5a87',
        },
        content: {
          title: 'CERTIFICATE OF BAPTISM',
          subtitle: 'Seventh-day Adventist Church',
          alignment: 'center',
        },
      },

      body: {
        height: '60%',
        padding: { top: 40, bottom: 40, left: 60, right: 60 },
        content: {
          recipientLabel: 'This certifies that',
          recipientLabelSize: 14,
          recipientNameSize: 36,
          recipientNameDecoration: {
            underline: true,
            color: '#2d5a87',
            thickness: 2,
          },

          certificateText: 'was baptized on',
          certificateTextSize: 14,

          dateSize: 18,
          dateDecoration: {
            underline: true,
            color: '#4a90e2',
          },

          locationSize: 14,

          certificateNumberSize: 12,
          certificateNumberLabel: 'Certificate Number:',
        },
      },

      footer: {
        height: '20%',
        padding: { top: 20, bottom: 20, left: 60, right: 60 },
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',

        sections: [
          {
            type: 'signature-block',
            width: '25%',
            content: {
              line: true,
              label: 'Pastor Name',
              title: 'Pastor',
            },
          },
          {
            type: 'qrcode',
            width: '25%',
            position: 'center',
            size: 100,
            content: {
              label: 'Scan to verify',
            },
          },
          {
            type: 'signature-block',
            width: '25%',
            content: {
              line: true,
              label: 'Church Seal',
              title: 'Official Seal',
            },
          },
        ],
      },
    },
  },

  // Features
  features: {
    qrCode: {
      enabled: true,
      position: 'footer-center',
      size: 100,
      includeVerificationUrl: true,
      label: 'Scan to verify certificate',
    },

    digitalSignature: {
      enabled: true,
      displayLocation: 'footer-right',
      label: '🔐 Digitally Signed',
    },

    watermark: {
      enabled: false,
      text: 'OFFICIAL CERTIFICATE',
      opacity: 0.05,
      rotation: -45,
    },

    securityBadges: [
      '✓ Digitally Signed',
      '✓ Verified & Authentic',
      '🔐 Blockchain Verified',
    ],
  },

  // Customization allowed
  customizable: {
    colors: true,
    fonts: true,
    logo: true,
    churchName: true,
    churchAddress: true,
    qrPosition: true,
  },
};

// ============================================
// TEMPLATE 2: TRADITIONAL ELEGANT
// ============================================
export const TRADITIONAL_TEMPLATE = {
  id: 'template-traditional-elegant',
  name: 'Traditional Elegant',
  description: 'Classic design with ornate borders and traditional layout',
  layout: 'traditional' as const,

  design: {
    pageSize: {
      width: 8.5,
      height: 11,
      orientation: 'portrait' as const,
    },

    colors: {
      primary: '#2c1810', // Deep brown
      secondary: '#704214', // Medium brown
      accent: '#d4af37', // Gold
      background: '#faf8f3', // Cream
      text: '#2c1810',
      border: '#704214',
    },

    fonts: {
      title: {
        family: 'Georgia, serif',
        size: 54,
        weight: 'bold',
        color: '#2c1810',
      },
      heading: {
        family: 'Georgia, serif',
        size: 20,
        weight: 'normal',
        color: '#704214',
      },
      body: {
        family: 'Georgia, serif',
        size: 16,
        weight: 'normal',
        color: '#2c1810',
        lineHeight: 1.8,
      },
      label: {
        family: 'Georgia, serif',
        size: 12,
        weight: 'normal',
        color: '#704214',
      },
    },

    sections: {
      // Ornate border
      border: {
        type: 'ornate',
        color: '#704214',
        width: 20,
        cornerRadius: 0,
        pattern: 'filigree', // decorative pattern
      },

      header: {
        height: '25%',
        alignment: 'center',
        content: {
          decorativeLine: true,
          title: '✦ HOLY BAPTISM ✦',
          subtitle: 'Certificate of Baptism',
          decorativeSymbol: '⊙',
        },
      },

      body: {
        height: '55%',
        padding: { top: 30, bottom: 30, left: 40, right: 40 },
        alignment: 'center',
        lineSpacing: 1.8,
        content: {
          declaration: 'This certifies that',
          recipientSize: 32,
          recipientDecoration: {
            underline: true,
            thickness: 2,
            style: 'double',
            color: '#704214',
          },
          mainText: 'Has been received into the sacred covenant of Baptism in the faith of Christ',
          datePhrase: 'On the',
          dateFormat: '[day] day of [month], [year]',
          locationPhrase: 'At',
          witnesses: 'Witnessed by the Congregation',
        },
      },

      footer: {
        height: '20%',
        padding: { top: 20, bottom: 20, left: 40, right: 40 },
        display: 'grid',
        gridColumns: '1fr 1fr 1fr',
        gap: 40,

        items: [
          {
            type: 'signature',
            label: 'Pastor',
            lineLength: 120,
          },
          {
            type: 'seal',
            label: 'Church Seal',
            width: 80,
            height: 80,
          },
          {
            type: 'signature',
            label: 'Minister',
            lineLength: 120,
          },
        ],
      },
    },
  },

  features: {
    qrCode: {
      enabled: true,
      position: 'bottom-center',
      size: 80,
      label: 'Scan QR Code to Verify',
      description: 'www.verify.adventify.org',
    },

    ornateDecorations: {
      enabled: true,
      cornerDesigns: true,
      borderPattern: 'filigree',
    },

    watermark: {
      enabled: true,
      text: 'OFFICIAL BAPTISM CERTIFICATE',
      opacity: 0.03,
      rotation: 0,
      position: 'center',
    },

    securityFeatures: {
      microprinting: true, // For print version
      securityThread: true, // For print version
      hologramPlacement: 'bottom-right',
    },
  },

  customizable: {
    colors: true,
    fonts: false, // Keep Georgia for traditional look
    logo: true,
    churchName: true,
    qrPosition: false,
  },
};

// ============================================
// TEMPLATE 3: DIGITAL-NATIVE MODERN
// ============================================
export const DIGITAL_NATIVE_TEMPLATE = {
  id: 'template-digital-native-modern',
  name: 'Digital-Native Modern',
  description: 'Modern digital-first design optimized for screens and wallets',
  layout: 'digital_native' as const,

  design: {
    pageSize: {
      width: 9,
      height: 5.06,
      orientation: 'landscape' as const,
    },

    colors: {
      primary: '#0066cc', // Vibrant blue
      secondary: '#00ccff', // Cyan
      accent: '#00ff88', // Green
      background: '#ffffff',
      darkBg: '#f0f0f0',
      text: '#1a1a1a',
      successGreen: '#00b050',
    },

    fonts: {
      title: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        size: 32,
        weight: 700,
        color: '#0066cc',
      },
      heading: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        size: 18,
        weight: 600,
        color: '#1a1a1a',
      },
      body: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        size: 13,
        weight: 400,
        color: '#666666',
      },
      label: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        size: 11,
        weight: 500,
        color: '#999999',
      },
    },

    layout: 'card', // Card-based layout

    sections: {
      card: {
        backgroundColor: '#ffffff',
        border: {
          radius: 16,
          width: 1,
          color: '#e0e0e0',
        },
        shadow: {
          enabled: true,
          blur: 12,
          color: 'rgba(0, 102, 204, 0.1)',
        },
        padding: { top: 24, bottom: 24, left: 28, right: 28 },

        header: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,

          items: [
            {
              type: 'title',
              text: 'Baptism Certificate',
            },
            {
              type: 'badge',
              text: '✓ Verified',
              backgroundColor: '#f0f8f0',
              textColor: '#00b050',
              icon: '✓',
            },
          ],
        },

        qrSection: {
          position: 'left',
          width: '30%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          backgroundColor: '#f9f9f9',
          borderRadius: 8,

          qr: {
            size: 120,
            label: 'Scan to verify',
            fontSize: 10,
          },
        },

        contentSection: {
          position: 'right',
          width: '70%',
          paddingLeft: 20,

          fields: [
            {
              label: 'Recipient',
              value: '[Full Name]',
              fontSize: 18,
              fontWeight: 600,
            },
            {
              label: 'Baptized',
              value: '[Date], [Location]',
              fontSize: 13,
            },
            {
              label: 'Certificate ID',
              value: '[BCN Number]',
              fontSize: 12,
              fontFamily: 'monospace',
              color: '#666666',
            },
            {
              label: 'Status',
              badges: [
                { text: '✓ Verified & Secure', color: '#00b050' },
                { text: '🔐 Digitally Signed', color: '#0066cc' },
                { text: '⛓ Blockchain Verified', color: '#9b59b6' },
              ],
            },
          ],
        },
      },

      footer: {
        padding: { top: 16, bottom: 16, left: 28, right: 28 },
        borderTop: {
          width: 1,
          color: '#e0e0e0',
        },
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',

        items: [
          {
            type: 'text',
            text: 'Share Securely',
            icon: '📤',
          },
          {
            type: 'text',
            text: 'Add to Wallet',
            icon: '📱',
          },
          {
            type: 'text',
            text: 'Download PDF',
            icon: '⬇️',
          },
          {
            type: 'link',
            text: 'Verify Online',
            url: 'www.verify.adventify.org',
            icon: '🔗',
          },
        ],
      },
    },
  },

  features: {
    qrCode: {
      enabled: true,
      position: 'left-card',
      size: 120,
      displayVerificationUrl: true,
      interactive: true,
    },

    digitalWallet: {
      applePay: true,
      googleWallet: true,
      displayQR: true,
      description: 'Add to your digital wallet for easy access',
    },

    verificationBadges: {
      enabled: true,
      badges: [
        {
          icon: '✓',
          text: 'Verified & Secure',
          color: '#00b050',
        },
        {
          icon: '🔐',
          text: 'Digitally Signed',
          color: '#0066cc',
        },
        {
          icon: '⛓',
          text: 'Blockchain Verified',
          color: '#9b59b6',
        },
      ],
    },

    interactiveFeatures: {
      scanQR: true,
      shareButton: true,
      downloadButton: true,
      walletButton: true,
      verifyOnlineLink: true,
    },

    watermark: {
      enabled: false, // Digital only, no watermark needed
    },
  },

  customizable: {
    colors: true,
    fonts: true,
    logo: true,
    churchName: true,
    badges: true,
  },
};

// ============================================
// Template Registry
// ============================================
export const CERTIFICATE_TEMPLATES = {
  minimalist: MINIMALIST_TEMPLATE,
  traditional: TRADITIONAL_TEMPLATE,
  digital_native: DIGITAL_NATIVE_TEMPLATE,
};

// Helper function to get template by ID
export function getTemplateById(templateId: string) {
  return Object.values(CERTIFICATE_TEMPLATES).find(
    t => t.id === templateId
  ) || CERTIFICATE_TEMPLATES.minimalist;
}

// Helper function to list all available templates
export function getAllTemplates() {
  return Object.values(CERTIFICATE_TEMPLATES);
}

// Helper function to get default template for a region
export function getDefaultTemplateForRegion(region: string) {
  // Different regions might prefer different templates
  const regionPreferences: Record<string, string> = {
    'EUD': 'traditional', // Europe - traditional
    'AID': 'digital_native', // Africa-Indian Ocean - digital
    'SPD': 'minimalist', // South Pacific - minimalist
    'NAD': 'digital_native', // North America - digital
    'SAD': 'traditional', // South American - traditional
    'ESD': 'minimalist', // Euro-Asia - minimalist
  };

  const preference = regionPreferences[region];
  if (preference && CERTIFICATE_TEMPLATES[preference as keyof typeof CERTIFICATE_TEMPLATES]) {
    return CERTIFICATE_TEMPLATES[preference as keyof typeof CERTIFICATE_TEMPLATES];
  }

  return CERTIFICATE_TEMPLATES.minimalist; // Default
}

export default CERTIFICATE_TEMPLATES;
