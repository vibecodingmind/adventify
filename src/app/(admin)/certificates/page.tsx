'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, Mail, Trash2, Eye, Loader2 } from 'lucide-react';
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
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const res = await fetch('/api/certificates');
      if (!res.ok) throw new Error('Failed to fetch certificates');
      return res.json();
    },
  });

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
    const email = prompt('Enter recipient email:');
    if (!email) return;

    try {
      const res = await fetch(`/api/certificates/${bcn}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: email }),
      });

      if (!res.ok) throw new Error('Email failed');
      alert('Certificate emailed successfully!');
    } catch (err) {
      console.error('Email error:', err);
      alert('Failed to send email');
    }
  };

  const handleRevoke = async (bcn: string) => {
    if (!confirm('Are you sure you want to revoke this certificate?')) return;

    try {
      const reason = prompt('Revocation reason:');
      const res = await fetch(`/api/certificates/${bcn}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Revoked by administrator' }),
      });

      if (!res.ok) throw new Error('Revocation failed');
      refetch();
      alert('Certificate revoked successfully');
    } catch (err) {
      console.error('Revocation error:', err);
      alert('Failed to revoke certificate');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-5 w-5 text-red-600 mb-2" />
        <p className="text-red-900">Error loading certificates</p>
      </div>
    );
  }

  const certificates = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Certificates</h1>
        <p className="text-gray-600 mt-2">Manage baptism certificates</p>
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
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No certificates found
                </TableCell>
              </TableRow>
            ) : (
              certificates.map((cert: CertificateData) => (
                <TableRow key={cert.id} className="border-b hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">{cert.bcn}</TableCell>
                  <TableCell className="font-medium">{cert.recipientName}</TableCell>
                  <TableCell>{new Date(cert.baptismDate).toLocaleDateString()}</TableCell>
                  <TableCell>{cert.churchName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={cert.status === 'active' ? 'default' : 'destructive'}
                    >
                      {cert.status === 'active' ? '✓ Active' : '✗ Revoked'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
