'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, Mail, Trash2, Eye, Loader2, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CertificateData {
  id: string;
  bcn: string;
  recipientName: string;
  baptismDate: string;
  churchName: string;
  status: 'active' | 'revoked';
  createdAt: string;
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCertificates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/certificates');
      if (!res.ok) throw new Error('Failed to fetch certificates');
      const json = await res.json();
      setCertificates(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleDownload = async (bcn: string) => {
    try {
      const res = await fetch(`/api/certificates/${bcn}/download`);
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${bcn}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleEmail = async (bcn: string) => {
    try {
      const res = await fetch(`/api/certificates/${bcn}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: '' }),
      });

      if (!res.ok) throw new Error('Email failed');
    } catch (err) {
      console.error('Email error:', err);
    }
  };

  const handleRevoke = async (bcn: string) => {
    try {
      const res = await fetch(`/api/certificates/${bcn}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Revoked by administrator' }),
      });

      if (!res.ok) throw new Error('Revocation failed');
      fetchCertificates();
    } catch (err) {
      console.error('Revocation error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="text-red-900 font-medium">Error loading certificates</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchCertificates} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Certificates</h1>
          <p className="text-gray-600 mt-1">Manage baptism certificates</p>
        </div>
        <Button variant="outline" onClick={fetchCertificates} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Certificate #</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Baptized</TableHead>
              <TableHead>Church</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certificates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Eye className="h-8 w-8 text-gray-300" />
                    <p>No certificates found</p>
                    <p className="text-sm text-gray-400">Certificates will appear here once baptism records are approved.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              certificates.map((cert: CertificateData) => (
                <TableRow key={cert.id} className="border-b hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">{cert.bcn}</TableCell>
                  <TableCell className="font-medium">{cert.recipientName}</TableCell>
                  <TableCell>
                    {cert.baptismDate
                      ? new Date(cert.baptismDate).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>{cert.churchName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={cert.status === 'active' ? 'default' : 'destructive'}
                    >
                      {cert.status === 'active' ? 'Active' : 'Revoked'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/verify/${cert.bcn}`, '_blank')}
                        title="View certificate"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(cert.bcn)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEmail(cert.bcn)}
                        title="Email certificate"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      {cert.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleRevoke(cert.bcn)}
                          title="Revoke certificate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
