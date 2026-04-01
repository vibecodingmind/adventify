'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Award, Search, Loader2, Download, ExternalLink } from 'lucide-react';

interface Certificate {
  id: string;
  bcn: string;
  certificateDate: string;
  verificationUrl: string;
  baptismRecord: {
    id: string;
    baptismDate: string;
    person: { id: string; pid: string; fullName: string };
    church: { id: string; name: string; city?: string; country?: string };
    pastorName: string;
    status: string;
  };
}

export default function CertificatesPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, [pagination.page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (pagination.page === 1) {
      fetchCertificates();
    }
  }, [pagination.page]);

  const fetchCertificates = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/certificates?${params}`);
      const data = await res.json();
      if (data.success) {
        setCertificates(data.data);
        setPagination(prev => ({ ...prev, total: data.pagination.total, totalPages: data.pagination.totalPages }));
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificate: Certificate) => {
    setDownloading(certificate.id);
    try {
      // Get certificate with PDF data
      const res = await fetch(`/api/certificates`);
      const data = await res.json();
      
      if (data.success) {
        const cert = data.data.find((c: Certificate) => c.id === certificate.id);
        if (cert && cert.baptismRecord) {
          // Generate PDF on-the-fly if needed
          const generateRes = await fetch('/api/certificates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ baptismRecordId: cert.baptismRecord.id }),
          });
          const generateData = await generateRes.json();
          
          if (generateData.success && generateData.data.pdfData) {
            // Convert data URL to blob and download
            const link = document.createElement('a');
            link.href = generateData.data.pdfData;
            link.download = `Baptism_Certificate_${cert.bcn}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Certificates</h1>
          <p className="text-gray-500 mt-1">View and download baptism certificates</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Certificates Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No certificates found</p>
              <p className="text-sm text-gray-400 mt-1">
                Generate certificates from approved baptism records
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate Number</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Church</TableHead>
                  <TableHead>Baptism Date</TableHead>
                  <TableHead>Pastor</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map(cert => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div className="font-mono text-sm font-medium">{cert.bcn}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cert.baptismRecord.person.fullName}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {cert.baptismRecord.person.pid}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{cert.baptismRecord.church.name}</p>
                        {cert.baptismRecord.church.city && (
                          <p className="text-xs text-gray-500">
                            {cert.baptismRecord.church.city}
                            {cert.baptismRecord.church.country && `, ${cert.baptismRecord.church.country}`}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(cert.baptismRecord.baptismDate)}</TableCell>
                    <TableCell className="text-sm">{cert.baptismRecord.pastorName}</TableCell>
                    <TableCell>{formatDate(cert.certificateDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/verify/${cert.bcn}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleDownload(cert)}
                          disabled={downloading === cert.id}
                        >
                          {downloading === cert.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {certificates.length} of {pagination.total} certificates
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
