'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Ban,
  Search,
  Loader2,
  Shield,
  FileText,
  AlertTriangle,
  Calendar,
  Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Role } from '@prisma/client';

interface RevocationRecord {
  id: string;
  bcn: string;
  personName: string;
  personPid: string;
  churchName: string;
  churchId: string;
  baptismDate: string;
  certificateDate: string;
  revokedAt: string | null;
  revocationReason: string | null;
  revokedByName: string | null;
}

interface CertificateLookup {
  id: string;
  bcn: string;
  personName: string;
  churchName: string;
  baptismDate: string;
  isRevoked: boolean;
}

export default function RevocationsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  // All Revocations tab
  const [revocations, setRevocations] = useState<RevocationRecord[]>([]);
  const [loadingRevocations, setLoadingRevocations] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  // Revoke Certificate tab
  const [searchBcn, setSearchBcn] = useState('');
  const [searchingCert, setSearchingCert] = useState(false);
  const [foundCert, setFoundCert] = useState<CertificateLookup | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, revoked: 0, rate: '0%' });

  useEffect(() => {
    fetchRevocations();
    fetchStats();
  }, [pagination.page]);

  const fetchRevocations = async () => {
    setLoadingRevocations(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
      });
      const res = await fetch(`/api/revocations?${params}`);
      const result = await res.json();
      if (result.success) {
        setRevocations(result.data);
        setPagination(prev => ({
          ...prev,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error('Error fetching revocations:', error);
    } finally {
      setLoadingRevocations(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/revocations?limit=1');
      const result = await res.json();
      if (result.success) {
        const totalRevoked = result.pagination.total;
        // Fetch total certificates from analytics or certificates endpoint
        try {
          const certRes = await fetch('/api/certificates?limit=1');
          const certResult = await certRes.json();
          const totalCerts = certResult.pagination?.total || 0;
          const rate = totalCerts > 0 ? ((totalRevoked / totalCerts) * 100).toFixed(1) : '0';
          setStats({ total: totalCerts, revoked: totalRevoked, rate: `${rate}%` });
        } catch {
          setStats({ total: 0, revoked: totalRevoked, rate: '0%' });
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const searchCertificate = async () => {
    if (!searchBcn.trim()) return;
    setSearchingCert(true);
    setFoundCert(null);
    try {
      const bcn = searchBcn.trim().toUpperCase();
      const res = await fetch(`/api/verify/${bcn}`);
      const result = await res.json();
      if (result.verified && result.data) {
        setFoundCert({
          id: '',
          bcn: result.data.bcn,
          personName: result.data.personName,
          churchName: result.data.churchName,
          baptismDate: result.data.baptismDate,
          isRevoked: result.data.isRevoked,
        });
      } else {
        toast({ variant: 'destructive', title: 'Not Found', description: 'Certificate not found' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to search certificate' });
    } finally {
      setSearchingCert(false);
    }
  };

  const lookupCertId = async (bcn: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/certificates?search=${bcn}&limit=5`);
      const result = await res.json();
      if (result.success && result.data?.length > 0) {
        const match = result.data.find((c: { bcn: string }) => c.bcn === bcn);
        return match?.id || result.data[0]?.id || null;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const handleRevoke = async () => {
    if (!foundCert || !revokeReason.trim()) return;
    setRevoking(true);
    try {
      // Look up the certificate ID by BCN
      const certId = await lookupCertId(foundCert.bcn);
      if (!certId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find certificate ID' });
        return;
      }
      const res = await fetch(`/api/certificates/${certId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Certificate revoked successfully' });
        setShowConfirmDialog(false);
        setFoundCert(null);
        setRevokeReason('');
        setSearchBcn('');
        fetchRevocations();
        fetchStats();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to revoke certificate' });
    } finally {
      setRevoking(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const canRevoke = user?.role === Role.CHURCH_PASTOR || user?.role === Role.CONFERENCE_ADMIN || user?.role === Role.UNION_ADMIN || user?.role === Role.DIVISION_ADMIN || user?.role === Role.GENERAL_CONFERENCE_ADMIN;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Certificate Revocations</h1>
        <p className="text-gray-500 mt-1">Manage revoked certificates</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Certificates</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revoked</p>
                <p className="text-2xl font-bold text-gray-900">{stats.revoked}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Revocation Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all-revocations">
        <TabsList>
          <TabsTrigger value="all-revocations">
            <Ban className="h-4 w-4 mr-2" />
            All Revocations
          </TabsTrigger>
          {canRevoke && (
            <TabsTrigger value="revoke-certificate">
              <Shield className="h-4 w-4 mr-2" />
              Revoke Certificate
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all-revocations" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Revoked Certificates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRevocations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : revocations.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No revoked certificates found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>BCN</TableHead>
                        <TableHead>Person</TableHead>
                        <TableHead>Church</TableHead>
                        <TableHead>Revoked Date</TableHead>
                        <TableHead>Revoked By</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revocations.map((rev) => (
                        <TableRow key={rev.id}>
                          <TableCell className="font-mono text-sm">{rev.bcn}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{rev.personName}</p>
                              <p className="text-xs text-gray-400 font-mono">{rev.personPid}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{rev.churchName}</TableCell>
                          <TableCell className="text-sm">
                            {rev.revokedAt ? formatDate(rev.revokedAt) : '-'}
                          </TableCell>
                          <TableCell className="text-sm">{rev.revokedByName || '-'}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {rev.revocationReason || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {revocations.length} of {pagination.total} revocations
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
        </TabsContent>

        {canRevoke && (
          <TabsContent value="revoke-certificate" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revoke a Certificate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Search Certificate by BCN</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Enter certificate number..."
                        value={searchBcn}
                        onChange={(e) => setSearchBcn(e.target.value)}
                        className="pl-10 font-mono uppercase"
                        onKeyDown={(e) => e.key === 'Enter' && searchCertificate()}
                      />
                    </div>
                    <Button
                      onClick={searchCertificate}
                      disabled={searchingCert || !searchBcn.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {searchingCert ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Found Certificate */}
                {foundCert && (
                  <div className="space-y-4">
                    {foundCert.isRevoked ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-700 font-medium">
                          <AlertTriangle className="h-5 w-5" />
                          This certificate has already been revoked
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                          <h4 className="font-medium text-gray-900">Certificate Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">BCN:</span>
                              <span className="ml-2 font-mono">{foundCert.bcn}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Person:</span>
                              <span className="ml-2 font-medium">{foundCert.personName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Church:</span>
                              <span className="ml-2">{foundCert.churchName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Baptism:</span>
                              <span className="ml-2">{formatDate(foundCert.baptismDate)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-red-700">
                            Revocation Reason <span className="text-red-500">*</span>
                          </label>
                          <Textarea
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            placeholder="Provide a detailed reason for revoking this certificate..."
                            rows={4}
                            className="border-red-200 focus:border-red-500 focus:ring-red-500"
                          />
                        </div>

                        <Button
                          onClick={() => setShowConfirmDialog(true)}
                          disabled={!revokeReason.trim() || revokeReason.trim().length < 5}
                          className="w-full bg-red-600 hover:bg-red-700"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Revoke This Certificate
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Confirm Revocation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Certificate Revocation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to <strong>permanently revoke</strong> the following certificate:
              </p>
              {foundCert && (
                <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                  <p><strong>BCN:</strong> {foundCert.bcn}</p>
                  <p><strong>Person:</strong> {foundCert.personName}</p>
                  <p><strong>Church:</strong> {foundCert.churchName}</p>
                </div>
              )}
              <p><strong>Reason:</strong> {revokeReason}</p>
              <p className="text-red-600 font-medium">
                This action cannot be undone. The certificate will show as revoked on the public verification portal.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-red-600 hover:bg-red-700"
            >
              {revoking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Revoke Certificate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
