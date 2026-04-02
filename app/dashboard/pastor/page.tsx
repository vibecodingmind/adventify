/**
 * ADVENTIFY DEMO - Pastor Approval Page
 * File: src/app/demo/pastor/page.tsx
 */

'use client';

import { useState, useEffect } from 'react';

interface Request {
  id: string;
  recipient: { fullName: string };
  certificateType: { name: string };
  details: any;
  status: string;
  submittedAt: string;
}

export default function DemoPastorPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/demo-requests');
      const data = await res.json();
      if (data.success) {
        // Filter for submitted requests
        const submitted = data.data.filter((r: Request) => r.status === 'SUBMITTED' || r.status === 'DRAFT');
        setRequests(submitted);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!selectedRequest) return;

    setLoading(true);
    setError('');

    try {
      // Generate certificate
      const bcn = `DIV-UNI-CON-CH-2024-${Math.floor(Math.random() * 999)
        .toString()
        .padStart(3, '0')}`;

      setCertificate({
        bcn,
        recipientName: selectedRequest.recipient.fullName,
        type: selectedRequest.certificateType.name,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        details: selectedRequest.details,
        pastorName: selectedRequest.details.pastorName || 'Rev. David Johnson',
        church: 'Demo Seventh-day Adventist Church'
      });

      // Mark as approved (in real app, would call API)
      setTimeout(() => {
        setRequests(reqs => reqs.filter(r => r.id !== requestId));
        alert(`✅ Certificate approved and generated!\n\nCertificate ID: ${bcn}`);
      }, 1000);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (requestId: string) => {
    if (confirm('Are you sure you want to reject this request?')) {
      setRequests(reqs => reqs.filter(r => r.id !== requestId));
      setSelectedRequest(null);
      alert('❌ Request rejected. Clerk will be notified.');
    }
  };

  const pendingCount = requests.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-emerald-900">✅ Pastor Dashboard</h1>
          <p className="text-xl text-emerald-700 mt-2">Review and Approve Certificate Requests</p>
        </div>

        {/* Pending Count */}
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Pending Approvals</p>
              <p className="text-5xl font-bold text-emerald-600">{pendingCount}</p>
            </div>
            <button
              onClick={fetchRequests}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Pending Requests List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Pending Requests</h2>

            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 text-lg">✅ All requests approved!</p>
                  <p className="text-gray-500 text-sm mt-2">New requests will appear here</p>
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    onClick={() => setSelectedRequest(request)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition transform hover:scale-105 ${
                      selectedRequest?.id === request.id
                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <p className="font-bold text-lg text-gray-900">
                      {request.recipient.fullName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {request.certificateType.name}
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold mt-2">
                      ID: {request.id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted: {new Date(request.submittedAt || request.id).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Request Details & Certificate */}
          <div className="col-span-2 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-500 p-4 rounded-lg text-red-800">
                {error}
              </div>
            )}

            {selectedRequest ? (
              <>
                {/* Request Details */}
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">📄 Request Details</h2>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-gray-600 text-sm">Recipient</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedRequest.recipient.fullName}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-600 text-sm">Certificate Type</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedRequest.certificateType.name}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t-2 border-gray-200">
                    <p className="font-bold text-gray-900 mb-3">Details:</p>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {Object.entries(selectedRequest.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                          <span className="font-semibold text-gray-900">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={loading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-lg transition transform hover:scale-105"
                    >
                      {loading ? '⏳ Approving...' : '✅ Approve & Generate'}
                    </button>
                    <button
                      onClick={() => handleReject(selectedRequest.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>

                {/* Generated Certificate */}
                {certificate && (
                  <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 rounded-lg shadow-2xl p-12 border-4 border-amber-300">
                    {/* Certificate Decorations */}
                    <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-amber-600 rounded-tr-3xl opacity-30"></div>
                    <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-amber-600 rounded-tl-3xl opacity-30"></div>

                    <div className="text-center space-y-6 relative z-10">
                      {/* Title */}
                      <div>
                        <p className="text-sm uppercase tracking-widest text-amber-800 font-semibold">
                          Official Certificate
                        </p>
                        <h2 className="text-4xl font-bold text-amber-900 mt-2">
                          CERTIFICATE OF BAPTISM
                        </h2>
                      </div>

                      {/* Decorative line */}
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 h-1 bg-amber-600"></div>
                        <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
                        <div className="w-12 h-1 bg-amber-600"></div>
                      </div>

                      {/* Main text */}
                      <div className="space-y-4">
                        <p className="text-amber-800 text-lg italic">This certifies that</p>

                        <p className="text-4xl font-bold text-amber-900 border-b-2 border-amber-400 pb-3">
                          {certificate.recipientName}
                        </p>

                        <div className="space-y-3 text-amber-800">
                          <p className="text-lg">was baptized in accordance with</p>
                          <p className="text-lg">the traditions of the Seventh-day Adventist Church</p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-amber-700">on</p>
                          <p className="text-2xl font-bold text-amber-900">
                            {certificate.details.baptismDate}
                          </p>
                          <p className="text-sm text-amber-700">at</p>
                          <p className="text-xl font-semibold text-amber-900">
                            {certificate.details.location}
                          </p>
                        </div>
                      </div>

                      {/* Decorative line */}
                      <div className="flex items-center justify-center gap-2 pt-6">
                        <div className="w-12 h-1 bg-amber-600"></div>
                        <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
                        <div className="w-12 h-1 bg-amber-600"></div>
                      </div>

                      {/* Signature and Details */}
                      <div className="grid grid-cols-2 gap-8 pt-8 text-center text-sm">
                        <div>
                          <p className="text-amber-700 mb-8">_____________________</p>
                          <p className="font-semibold text-amber-900">
                            {certificate.pastorName}
                          </p>
                          <p className="text-xs text-amber-800">Pastor</p>
                        </div>

                        <div>
                          <p className="text-amber-700 mb-8">_____________________</p>
                          <p className="font-semibold text-amber-900">{certificate.date}</p>
                          <p className="text-xs text-amber-800">Date</p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-8 border-t-2 border-amber-300 mt-8 space-y-1">
                        <p className="text-xs text-amber-800 font-semibold">
                          {certificate.church}
                        </p>
                        <p className="text-xs text-amber-700">
                          Certificate ID: <span className="font-bold">{certificate.bcn}</span>
                        </p>
                        <p className="text-xs text-amber-700">
                          Issued: {certificate.date}
                        </p>
                        <div className="flex justify-center gap-2 mt-4">
                          <span className="text-xs">✓ Verified</span>
                          <span className="text-xs">🔐 Digitally Signed</span>
                          <span className="text-xs">✅ Official</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-8 justify-center">
                      <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg transition">
                        📥 Download PDF
                      </button>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition">
                        ✉️ Email to Member
                      </button>
                      <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition">
                        📱 Digital Wallet
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-16 text-center">
                <p className="text-gray-600 text-xl">
                  👈 Select a request to view details and approve
                </p>
                {requests.length === 0 && (
                  <p className="text-gray-500 text-sm mt-4">
                    Waiting for clerk to submit requests...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
