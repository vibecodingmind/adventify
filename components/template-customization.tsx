/**
 * ADVENTIFY - Certificate Template Customization UI
 * Allows churches to customize their certificate templates
 */

'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  layout: 'minimalist' | 'traditional' | 'digital_native';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    title: string;
    heading: string;
    body: string;
  };
  logo?: string;
  churchName: string;
  churchAddress?: string;
  qrPosition: 'corner' | 'center' | 'integrated';
  features: {
    includeWatermark: boolean;
    includeDigitalSignature: boolean;
    includeBlockchainVerification: boolean;
  };
}

export default function TemplateCustomization() {
  const [template, setTemplate] = useState<TemplateConfig>({
    id: 'custom-template-1',
    name: 'My Church Certificate',
    description: 'Customized certificate for our church',
    layout: 'minimalist',
    colors: {
      primary: '#1a365d',
      secondary: '#2d5a87',
      accent: '#4a90e2',
      background: '#ffffff',
      text: '#1a1a1a',
    },
    fonts: {
      title: 'Georgia',
      heading: 'Arial',
      body: 'Arial',
    },
    logo: undefined,
    churchName: 'First Church of God',
    churchAddress: '123 Main Street, City, Country',
    qrPosition: 'footer-center',
    features: {
      includeWatermark: false,
      includeDigitalSignature: true,
      includeBlockchainVerification: true,
    },
  });

  const [preview, setPreview] = useState<'minimalist' | 'traditional' | 'digital_native'>(
    'minimalist'
  );

  const handleColorChange = (colorKey: keyof typeof template.colors, value: string) => {
    setTemplate({
      ...template,
      colors: {
        ...template.colors,
        [colorKey]: value,
      },
    });
  };

  const handleFontChange = (fontKey: keyof typeof template.fonts, value: string) => {
    setTemplate({
      ...template,
      fonts: {
        ...template.fonts,
        [fontKey]: value,
      },
    });
  };

  const handleFeatureToggle = (
    featureKey: keyof typeof template.features
  ) => {
    setTemplate({
      ...template,
      features: {
        ...template.features,
        [featureKey]: !template.features[featureKey],
      },
    });
  };

  const handleSaveTemplate = async () => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });

      if (!response.ok) throw new Error('Failed to save template');

      alert('Template saved successfully!');
    } catch (error) {
      alert(`Error saving template: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Certificate Template Customization</h1>
          <p className="text-gray-600 mt-2">
            Design your church's custom baptism certificate
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customization Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="churchName">Church Name</Label>
                  <Input
                    id="churchName"
                    value={template.churchName}
                    onChange={(e) => setTemplate({ ...template, churchName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="churchAddress">Church Address</Label>
                  <Input
                    id="churchAddress"
                    value={template.churchAddress || ''}
                    onChange={(e) => setTemplate({ ...template, churchAddress: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Color Customization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Colors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(template.colors).map(([key, value]) => (
                  <div key={key}>
                    <Label htmlFor={key} className="capitalize">
                      {key}
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        id={key}
                        value={value}
                        onChange={(e) =>
                          handleColorChange(key as keyof typeof template.colors, e.target.value)
                        }
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={value}
                        onChange={(e) =>
                          handleColorChange(key as keyof typeof template.colors, e.target.value)
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Font Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fonts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(template.fonts).map(([key, value]) => (
                  <div key={key}>
                    <Label htmlFor={`font-${key}`} className="capitalize">
                      {key}
                    </Label>
                    <select
                      id={`font-${key}`}
                      value={value}
                      onChange={(e) => handleFontChange(key as keyof typeof template.fonts, e.target.value)}
                      className="w-full mt-1 p-2 border rounded"
                    >
                      <option>Arial</option>
                      <option>Georgia</option>
                      <option>Times New Roman</option>
                      <option>Courier</option>
                      <option>Verdana</option>
                    </select>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(template.features).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => handleFeatureToggle(key as keyof typeof template.features)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveTemplate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Template
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  // Reset to defaults
                  window.location.reload();
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <div className="mt-4 flex gap-2">
                  {(['minimalist', 'traditional', 'digital_native'] as const).map((layout) => (
                    <Button
                      key={layout}
                      variant={preview === layout ? 'default' : 'outline'}
                      onClick={() => setPreview(layout)}
                      className="capitalize"
                    >
                      {layout.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {preview === 'minimalist' && (
                  <MinimalistPreview template={template} />
                )}
                {preview === 'traditional' && (
                  <TraditionalPreview template={template} />
                )}
                {preview === 'digital_native' && (
                  <DigitalNativePreview template={template} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PREVIEWS
// ============================================

function MinimalistPreview({ template }: { template: TemplateConfig }) {
  return (
    <div
      className="bg-white rounded-lg border-2 p-12 text-center"
      style={{
        backgroundColor: template.colors.background,
        borderColor: template.colors.secondary,
      }}
    >
      <div
        style={{
          borderBottom: `2px solid ${template.colors.secondary}`,
          paddingBottom: '1rem',
          marginBottom: '1rem',
        }}
      >
        <h1
          style={{
            fontSize: '36px',
            fontFamily: template.fonts.title,
            color: template.colors.primary,
          }}
        >
          CERTIFICATE OF BAPTISM
        </h1>
        <p style={{ color: template.colors.text, fontSize: '14px' }}>
          Seventh-day Adventist Church
        </p>
      </div>

      <div style={{ margin: '2rem 0' }}>
        <p style={{ color: template.colors.text }}>This certifies that</p>
        <h2
          style={{
            fontSize: '32px',
            fontFamily: template.fonts.heading,
            color: template.colors.secondary,
            borderBottom: `2px solid ${template.colors.secondary}`,
            paddingBottom: '0.5rem',
            margin: '1rem 0',
          }}
        >
          [Recipient Name]
        </h2>
        <p style={{ color: template.colors.text }}>was baptized on</p>
        <p
          style={{
            fontSize: '18px',
            color: template.colors.accent,
            margin: '0.5rem 0',
          }}
        >
          [Date]
        </p>
        <p style={{ color: template.colors.text, fontSize: '12px' }}>
          at [Location]
        </p>
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: `1px solid ${template.colors.secondary}` }}>
        <p style={{ color: '#999', fontSize: '11px' }}>
          Certificate Number: [BCN]
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: '1rem',
            fontSize: '12px',
          }}
        >
          <div>Pastor Name</div>
          <div>🔐 Digitally Signed</div>
          <div>Church Seal</div>
        </div>
      </div>
    </div>
  );
}

function TraditionalPreview({ template }: { template: TemplateConfig }) {
  return (
    <div
      className="bg-white rounded-lg border-4 p-12 text-center"
      style={{
        backgroundColor: template.colors.background,
        borderColor: template.colors.secondary,
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '24px' }}>✦</p>
        <h1
          style={{
            fontSize: '40px',
            fontFamily: template.fonts.title,
            color: template.colors.primary,
          }}
        >
          HOLY BAPTISM
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: template.colors.secondary,
            fontFamily: template.fonts.heading,
          }}
        >
          Certificate of Baptism
        </p>
        <div
          style={{
            borderBottom: `1px solid ${template.colors.secondary}`,
            margin: '1rem 0',
          }}
        />
      </div>

      <div style={{ margin: '2rem 0', lineHeight: '1.8' }}>
        <p style={{ color: template.colors.text }}>This certifies that</p>
        <h2
          style={{
            fontSize: '28px',
            fontFamily: template.fonts.heading,
            color: template.colors.primary,
            borderBottom: `2px double ${template.colors.secondary}`,
            paddingBottom: '0.5rem',
            margin: '1rem 0',
          }}
        >
          [Recipient Name]
        </h2>
        <p style={{ color: template.colors.text, fontSize: '12px', margin: '1rem 0' }}>
          Has been received into the sacred covenant of Baptism in the faith of Christ
        </p>
        <p style={{ color: template.colors.text }}>
          On the [Date]
        </p>
        <p style={{ color: template.colors.text }}>
          At [Location]
        </p>
        <p
          style={{
            color: template.colors.secondary,
            fontSize: '11px',
            marginTop: '1rem',
          }}
        >
          Witnessed by the Congregation
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: `1px solid ${template.colors.secondary}`,
          fontSize: '12px',
        }}
      >
        <div>Pastor</div>
        <div>🔐</div>
        <div>Church Seal</div>
      </div>
    </div>
  );
}

function DigitalNativePreview({ template }: { template: TemplateConfig }) {
  return (
    <div
      className="rounded-2xl border p-8 shadow-lg"
      style={{
        backgroundColor: template.colors.background,
        borderColor: template.colors.secondary,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontFamily: template.fonts.title,
            color: template.colors.primary,
          }}
        >
          BAPTISM CERTIFICATE
        </h1>
        <div
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f0f8f0',
            borderRadius: '0.5rem',
            color: '#00b050',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          ✓ Verified
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ flex: '0 0 120px', textAlign: 'center' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              backgroundColor: template.colors.secondary,
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
            }}
          >
            QR CODE
          </div>
          <p style={{ fontSize: '10px', marginTop: '0.5rem', color: '#999' }}>
            Scan to verify
          </p>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '0.25rem' }}>
              Recipient
            </p>
            <p
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: template.colors.text,
              }}
            >
              [Name]
            </p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '0.25rem' }}>
              Baptized
            </p>
            <p style={{ fontSize: '13px', color: template.colors.text }}>
              [Date], [Location]
            </p>
          </div>

          <div>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '0.25rem' }}>
              Certificate ID
            </p>
            <p
              style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#666',
              }}
            >
              [BCN Number]
            </p>
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid #e0e0e0` }}>
            <p style={{ fontSize: '9px', color: '#00b050' }}>✓ Verified & Secure</p>
            <p style={{ fontSize: '9px', color: template.colors.primary }}>
              🔐 Digitally Signed
            </p>
            <p style={{ fontSize: '9px', color: '#9b59b6' }}>⛓ Blockchain Verified</p>
          </div>
        </div>
      </div>
    </div>
  );
}
