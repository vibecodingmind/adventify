/**
 * ADVENTIFY - Public Certificate Verification Page
 * Beautiful, interactive verification page for public use
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface VerificationResult {
  valid: boolean;
  certificate: {
    bcn: string;
    recipientName: string;
    baptismDate: string;
    church: string;
    pastor: string;
    certificateDate: string;
  };
  verification: {
    isValid: boolean;
    isRevoked: boolean;
    digitalSignatureValid: boolean;
    blockchainVerified: boolean;
    lastVerified: string;
  };
  securityFeatures: Array<{
    icon: string;
    label: string;
    status: 'verified' | 'unverified';
  }>;
}

export default function VerificationPage() {
  const params = useParams();
  const bcn = params.bcn as string;

  const [data, setData] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const response = await fetch(`/api/verify/${bcn}`);
        if (!response.ok) {
          throw new Error('Certificate not found');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed');
      } finally {
        setLoading(false);
      }
    };

    if (bcn) {
      fetchVerification();
    }
  }, [bcn]);

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">Certificate Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please check the certificate number and try again.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // REVOKED CERTIFICATE STATE
  // ============================================
  if (!data.verification.isValid || data.verification.isRevoked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold text-orange-600 mb-2">Certificate Revoked</h1>
          <p className="text-gray-600 mb-4">
            This certificate has been revoked and is no longer valid.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Certificate Number: {data.certificate.bcn}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // SUCCESS STATE - VERIFIED CERTIFICATE
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Certificate Verification
          </h1>
          <p className="text-gray-600">
            This certificate has been verified as authentic and valid
          </p>
        </div>

        {/* Verification Status Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">
          {/* Status Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
                  <span className="text-4xl">✓</span>
                  Certificate Valid
                </h2>
                <p className="text-green-100">
                  Last verified: {new Date(data.verification.lastVerified).toLocaleString()}
                </p>
              </div>
              <div className="text-6xl">✓</div>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Certificate Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Left Column */}
              <div className="space-y-6">
                <DetailItem
                  label="Recipient Name"
                  value={data.certificate.recipientName}
                  icon="👤"
                />
                <DetailItem
                  label="Baptism Date"
                  value={new Date(data.certificate.baptismDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  icon="📅"
                />
                <DetailItem
                  label="Church"
                  value={data.certificate.church}
                  icon="⛪"
                />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <DetailItem
                  label="Pastor"
                  value={data.certificate.pastor}
                  icon="👨‍⛪"
                />
                <DetailItem
                  label="Certificate Date"
                  value={new Date(data.certificate.certificateDate).toLocaleDateString()}
                  icon="📄"
                />
                <DetailItem
                  label="Certificate Number"
                  value={data.certificate.bcn}
                  icon="🔢"
                  monospace={true}
                />
              </div>
            </div>

            {/* Verification Features */}
            <div className="border-t pt-8">
              <h4 className="text-xl font-bold text-gray-900 mb-6">Security Verification</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.securityFeatures.map((feature, index) => (
                  <SecurityFeature
                    key={index}
                    icon={feature.icon}
                    label={feature.label}
                    status={feature.status}
                  />
                ))}
              </div>
            </div>

            {/* Verification Indicators */}
            <div className="border-t pt-8 mt-8">
              <h4 className="text-xl font-bold text-gray-900 mb-6">Verification Status</h4>

              <div className="space-y-3">
                <VerificationIndicator
                  label="Digital Signature"
                  status={data.verification.digitalSignatureValid}
                />
                <VerificationIndicator
                  label="Blockchain Verification"
                  status={data.verification.blockchainVerified}
                />
                <VerificationIndicator
                  label="Not Revoked"
                  status={!data.verification.isRevoked}
                />
                <VerificationIndicator
                  label="Current Status"
                  status={data.verification.isValid}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <ActionButton
            icon="📥"
            label="Download PDF"
            onClick={() => window.location.href = `/api/certificates/${bcn}/download`}
            color="blue"
          />
          <ActionButton
            icon="📤"
            label="Share"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Baptism Certificate',
                  text: `Verify my baptism certificate: ${data.certificate.bcn}`,
                  url: window.location.href,
                });
              }
            }}
            color="green"
          />
          <ActionButton
            icon="📱"
            label="Add to Wallet"
            onClick={() => {
              window.location.href = `/api/certificates/${bcn}/wallet`;
            }}
            color="purple"
          />
          <ActionButton
            icon="🔗"
            label="Copy Link"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }}
            color="gray"
          />
        </div>

        {/* Footer */}
        <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
          <p className="mb-4">
            This certificate is part of the Seventh-day Adventist Church's official baptism record system.
          </p>
          <p className="text-sm text-gray-500">
            Powered by ADVENTIFY • {new Date().getFullYear()} • All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENT: Detail Item
// ============================================
function DetailItem({
  label,
  value,
  icon,
  monospace = false,
}: {
  label: string;
  value: string;
  icon: string;
  monospace?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        {label}
      </label>
      <p
        className={`text-lg text-gray-900 ${
          monospace ? 'font-mono bg-gray-100 p-3 rounded' : 'font-medium'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================
// COMPONENT: Security Feature
// ============================================
function SecurityFeature({
  icon,
  label,
  status,
}: {
  icon: string;
  label: string;
  status: 'verified' | 'unverified';
}) {
  const isVerified = status === 'verified';

  return (
    <div
      className={`p-4 rounded-lg border-2 ${
        isVerified
          ? 'bg-green-50 border-green-300'
          : 'bg-yellow-50 border-yellow-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{label}</p>
          <p
            className={`text-sm ${
              isVerified ? 'text-green-700' : 'text-yellow-700'
            }`}
          >
            {isVerified ? '✓ Verified' : '⚠ Unverified'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENT: Verification Indicator
// ============================================
function VerificationIndicator({
  label,
  status,
}: {
  label: string;
  status: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-gray-700 font-medium">{label}</span>
      <span
        className={`flex items-center gap-2 font-semibold ${
          status ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {status ? '✓' : '✗'}
      </span>
    </div>
  );
}

// ============================================
// COMPONENT: Action Button
// ============================================
function ActionButton({
  icon,
  label,
  onClick,
  color = 'blue',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  color?: 'blue' | 'green' | 'purple' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    gray: 'bg-gray-600 hover:bg-gray-700',
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} text-white font-bold py-3 px-4 rounded-lg transition shadow-md hover:shadow-lg flex items-center justify-center gap-2`}
    >
      <span className="text-xl">{icon}</span>
      <span className="hidden md:inline">{label}</span>
      <span className="md:hidden text-lg">{label.split(' ')[0]}</span>
    </button>
  );
}
