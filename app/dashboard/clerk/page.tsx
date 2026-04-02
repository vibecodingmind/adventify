/**
 * ADVENTIFY DEMO - Clerk Request Page
 * File: src/app/demo/clerk/page.tsx
 */

'use client';

import { useState, useEffect } from 'react';

export default function DemoClerkPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    recipientName: 'John Smith',
    recipientEmail: 'john@church.demo',
    certificateTypeId: 'BAPTISM',
    templateId: 'minimalist',
    details: {
      baptismDate: '2024-03-15',
      location: 'Church Baptismal Pool',
      pastorName: 'Rev. David Johnson',
      witnessName: 'Susan Miller'
    }
  });

  // Fetch requests on mount
  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 3000); // Auto-refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/demo-requests');
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(`✅ Request created successfully!\n\nRequest ID: ${data.data.id.slice(0, 8)}...\nRecipient: ${data.data.recipient.fullName}\nStatus: ${data.data.status}`);

        // Reset form with new example
        setFormData({
          ...formData,
          recipientName: `Member ${Math.floor(Math.random() * 9000) + 1000}`,
          recipientEmail: `member${Date.now()}@church.demo`,
          details: {
            ...formData.details,
            baptismDate: new Date().toISOString().split('T')[0]
          }
        });

        // Refresh requests
        setTimeout(fetchRequests, 500);
      } else {
        setError(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setError(`❌ Failed to create request: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-blue-900">📝 Clerk Dashboard</h1>
          <p className="text-xl text-blue-700 mt-2">Submit Certificate Requests for Pastor Approval</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Form */}
          <div className="col-span-2 space-y-6">
            {/* Status Messages */}
            {success && (
              <div className="bg-green-50 border-2 border-green-500 p-4 rounded-lg text-green-800 whitespace-pre-line">
                {success}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-500 p-4 rounded-lg text-red-800">
                {error}
              </div>
            )}

            {/* Request Form */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Certificate Request</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Recipient Info */}
                <div className="bg-blue-50 p-6 rounded-lg space-y-4">
                  <h3 className="font-bold text-gray-900">👤 Recipient Information</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="John Smith"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.recipientEmail}
                      onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="john@church.local"
                      required
                    />
                  </div>
                </div>

                {/* Certificate Type */}
                <div className="bg-purple-50 p-6 rounded-lg space-y-4">
                  <h3 className="font-bold text-gray-900">🎓 Certificate Type</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Type</label>
                    <select
                      value={formData.certificateTypeId}
                      onChange={(e) => setFormData({ ...formData, certificateTypeId: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                      required
                    >
                      <option value="BAPTISM">💧 Baptism Certificate</option>
                      <option value="YOUTH_HONORS">⭐ Youth Honors</option>
                      <option value="SERVICE_RECOGNITION">🏆 Service Recognition</option>
                      <option value="ACHIEVEMENT">🎖️ Achievement</option>
                    </select>
                  </div>
                </div>

                {/* Baptism Details */}
                <div className="bg-amber-50 p-6 rounded-lg space-y-4">
                  <h3 className="font-bold text-gray-900">📅 Baptism Details</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Baptism</label>
                    <input
                      type="date"
                      value={formData.details.baptismDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        details: { ...formData.details, baptismDate: e.target.value }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={formData.details.location}
                      onChange={(e) => setFormData({
                        ...formData,
                        details: { ...formData.details, location: e.target.value }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="Church Baptismal Pool"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pastor Name</label>
                    <input
                      type="text"
                      value={formData.details.pastorName}
                      onChange={(e) => setFormData({
                        ...formData,
                        details: { ...formData.details, pastorName: e.target.value }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="Rev. David Johnson"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Witness Name (Optional)</label>
                    <input
                      type="text"
                      value={formData.details.witnessName}
                      onChange={(e) => setFormData({
                        ...formData,
                        details: { ...formData.details, witnessName: e.target.value }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="Susan Miller"
                    />
                  </div>
                </div>

                {/* Template */}
                <div className="bg-green-50 p-6 rounded-lg space-y-4">
                  <h3 className="font-bold text-gray-900">🎨 Select Template</h3>

                  <div className="grid grid-cols-3 gap-4">
                    {['minimalist', 'traditional', 'digital_native'].map((template) => (
                      <label
                        key={template}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                          formData.templateId === template
                            ? 'border-green-500 bg-green-100'
                            : 'border-gray-300 hover:border-green-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="template"
                          value={template}
                          checked={formData.templateId === template}
                          onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                          className="mr-2"
                        />
                        <span className="font-medium capitalize">{template.replace('_', '-')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-lg transition"
                >
                  {loading ? '⏳ Submitting...' : '✉️ Submit Request to Pastor'}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar - Requests List */}
          <div className="bg-white rounded-lg shadow-lg p-6 h-fit sticky top-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">📊 My Requests</h3>
              <button
                onClick={fetchRequests}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                🔄
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {requests.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No requests yet</p>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className={`p-3 rounded-lg border-2 transition ${
                      req.status === 'APPROVED'
                        ? 'bg-green-50 border-green-300'
                        : req.status === 'SUBMITTED'
                        ? 'bg-yellow-50 border-yellow-300'
                        : req.status === 'REJECTED'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-blue-50 border-blue-300'
                    }`}
                  >
                    <p className="font-bold text-gray-900 text-sm">{req.recipient.fullName}</p>
                    <p className="text-xs text-gray-600">{req.certificateType.name}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-bold px-2 py-1 bg-white rounded">
                        {req.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {req.id.slice(0, 6)}...
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
