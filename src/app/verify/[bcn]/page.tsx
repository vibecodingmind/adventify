'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Share2, Download, Loader2 } from 'lucide-react';

interface VerificationData {
  valid: boolean;
  certificate?: {
    bcn: string;
    recipientName: string;
    baptismDate: string;
    church: string;
    pastor: string;
    certificateDate: string;
  };
  verification?: {
    isValid: boolean;
    isRevoked: boolean;
    digitalSignatureValid: boolean;
    blockchainVerified: boolean;
    lastVerified: string;
  };
  securityFeatures?: Array<{
    icon: string;
    label: string;
    status: string;
  }>;
}

export default function VerificationPage() {
  const params = useParams();
  const bcn = params.bcn as string;

  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/verify/${bcn}`);
        if (!response.ok) throw new Error('Certificate not found');
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error verifying certificate');
      } finally {
        setLoading(false);
      }
    };

    if (bcn) {
      fetchCertificate();
    }
  }, [bcn]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.valid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full p-6 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-900 text-center mb-2">
            Invalid Certificate
          </h1>
          <p className="text-red-700 text-center">
            {error || 'This certificate could not be verified or has been revoked.'}
          </p>
        </div>
      </div>
    );
  }

  if (data?.verification?.isRevoked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full p-6 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-orange-900 text-center mb-2">
            Certificate Revoked
          </h1>
          <p className="text-orange-700 text-center">
            This certificate has been revoked and is no longer valid.
          </p>
        </div>
      </div>
    );
  }

  const cert = data?.certificate;
  const verification = data?.verification;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Certificate Verified
          </h1>
          <p className="text-gray-600">This baptism certificate is authentic and valid</p>
        </div>

        {/* Main Certificate Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          {/* Certificate Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-1">RECIPIENT</p>
              <p className="text-2xl font-bold text-gray-900 mb-4">{cert?.recipientName}</p>

              <p className="text-gray-600 text-sm font-semibold mb-1">BAPTIZED</p>
              <p className="text-lg text-gray-800 mb-4">
                {cert?.baptismDate && new Date(cert.baptismDate).toLocaleDateString()}
              </p>

              <p className="text-gray-600 text-sm font-semibold mb-1">LOCATION</p>
              <p className="text-lg text-gray-800 mb-4">{cert?.church}</p>
            </div>

            <div>
              <p className="text-gray-600 text-sm font-semibold mb-1">CERTIFICATE ID</p>
              <p className="text-lg font-mono text-gray-900 mb-4 bg-gray-100 p-3 rounded">
                {cert?.bcn}
              </p>

              <p className="text-gray-600 text-sm font-semibold mb-1">PASTOR</p>
              <p className="text-lg text-gray-800 mb-4">{cert?.pastor}</p>

              <p className="text-gray-600 text-sm font-semibold mb-1">ISSUED</p>
              <p className="text-lg text-gray-800">
                {cert?.certificateDate && new Date(cert.certificateDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Security Features */}
          {data?.securityFeatures && (
            <div className="border-t pt-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Security Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.securityFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                    <span className="text-2xl">{feature.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{feature.label}</p>
                      <p className="text-sm text-green-600 font-medium">✓ {feature.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Verification Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Last verified: {verification?.lastVerified && new Date(verification.lastVerified).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            This certificate can be shared with confidence. You can verify it anytime at this link.
          </p>
        </div>
      </div>
    </div>
  );
}
