'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { Role } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Download, RefreshCw, BookOpen, FileText, Clock, CheckCircle2, XCircle, Loader2, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IntroLetter {
  id: string;
  requestId: string;
  personName: string;
  memberName: string;
  churchName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'GENERATED';
  reason?: string;
  clerkNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  generatedAt?: string;
  documentExpiry?: string;
}

export default function IntroductionLettersPage() {
  const { user } = useAuthStore();
  const [letters, setLetters] = useState<IntroLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [total, setTotal] = useState(0);

  const fetchLetters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/member-requests?documentType=INTRODUCTION_LETTER&limit=50`;
      if (activeTab !== 'all') {
        url += `&status=${activeTab}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch introduction letters');
      const json = await res.json();
      const data = (json.data || []).map((r: Record<string, unknown>) => ({
        id: r.id,
        requestId: r.requestId,
        personName: r.person?.fullName || r.member?.fullName || 'Unknown',
        memberName: r.member?.fullName || 'Unknown',
        churchName: r.church?.name || 'Unknown',
        status: r.status,
        reason: r.reason,
        clerkNotes: r.clerkNotes,
        rejectionReason: r.rejectionReason,
        createdAt: r.createdAt,
        generatedAt: r.generatedAt,
        documentExpiry: r.documentExpiry,
      }));
      setLetters(data);
      setTotal(json.pagination?.total || data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  const handleDownload = (requestId: string, personName: string) => {
    window.open(`/api/member-requests/${requestId}/download`, '_blank');
  };

  const handleView = (requestId: string) => {
    window.open(`/api/member-requests/${requestId}/download`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'APPROVED':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'GENERATED':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Generated</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Stats
  const pendingCount = letters.filter((l) => l.status === 'PENDING').length;
  const generatedCount = letters.filter((l) => l.status === 'GENERATED').length;
  const rejectedCount = letters.filter((l) => l.status === 'REJECTED').length;

  // Role-based view
  const isMember = user?.role === Role.MEMBER;
  const isClerk = user?.role === Role.CHURCH_CLERK;
  const isPastor = user?.role === Role.CHURCH_PASTOR;

  if (isMember) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Introduction Letters</h1>
          <p className="text-gray-600 mt-1">View your introduction letter requests</p>
        </div>
        <LetterContent
          letters={letters}
          isLoading={isLoading}
          error={error}
          total={total}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
          generatedCount={generatedCount}
          rejectedCount={rejectedCount}
          getStatusBadge={getStatusBadge}
          handleDownload={handleDownload}
          handleView={handleView}
          showActions={false}
          onRetry={fetchLetters}
        />
      </div>
    );
  }

  if (isClerk || isPastor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Introduction Letters</h1>
            <p className="text-gray-600 mt-1">
              {isClerk ? 'Manage introduction letter requests' : 'Review and approve introduction letter requests'}
            </p>
          </div>
          <Button variant="outline" onClick={fetchLetters} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <LetterContent
          letters={letters}
          isLoading={isLoading}
          error={error}
          total={total}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
          generatedCount={generatedCount}
          rejectedCount={rejectedCount}
          getStatusBadge={getStatusBadge}
          handleDownload={handleDownload}
          handleView={handleView}
          showActions={true}
          onRetry={fetchLetters}
        />
      </div>
    );
  }

  // Conference+ - Access Denied
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <CardTitle className="text-xl">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-500">
          Introduction letters are managed at the church level. Your role does not have access to this feature.
        </CardContent>
      </Card>
    </div>
  );
}

function LetterContent({
  letters,
  isLoading,
  error,
  total,
  activeTab,
  setActiveTab,
  pendingCount,
  generatedCount,
  rejectedCount,
  getStatusBadge,
  handleDownload,
  handleView,
  showActions,
  onRetry,
}: {
  letters: IntroLetter[];
  isLoading: boolean;
  error: string | null;
  total: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  generatedCount: number;
  rejectedCount: number;
  getStatusBadge: (status: string) => React.ReactNode;
  handleDownload: (requestId: string, personName: string) => void;
  handleView: (requestId: string) => void;
  showActions: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
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
            <p className="text-red-900 font-medium">Error loading letters</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{generatedCount}</p>
                <p className="text-xs text-gray-500">Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-xs text-gray-500">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="PENDING" className="gap-1">
            Pending {pendingCount > 0 && <span className="ml-1 bg-amber-100 text-amber-700 text-xs px-1.5 rounded-full">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="GENERATED" className="gap-1">
            Generated {generatedCount > 0 && <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs px-1.5 rounded-full">{generatedCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="REJECTED" className="gap-1">
            Rejected {rejectedCount > 0 && <span className="ml-1 bg-red-100 text-red-700 text-xs px-1.5 rounded-full">{rejectedCount}</span>}
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Request ID</TableHead>
                <TableHead>Person Name</TableHead>
                <TableHead>Church</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {letters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 7 : 6} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen className="h-10 w-10 text-gray-300" />
                      <p className="font-medium">No introduction letters found</p>
                      <p className="text-sm text-gray-400">
                        Letters will appear here once requests are submitted and generated.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                letters.map((letter) => (
                  <TableRow key={letter.id} className="border-b hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-gray-600">
                      {letter.requestId}
                    </TableCell>
                    <TableCell className="font-medium">{letter.personName}</TableCell>
                    <TableCell className="text-gray-600">{letter.churchName}</TableCell>
                    <TableCell className="text-gray-600 max-w-[200px] truncate">
                      {letter.reason || letter.clerkNotes || '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(letter.status)}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(letter.createdAt).toLocaleDateString()}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {letter.status === 'GENERATED' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(letter.id)}
                                title="View letter"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(letter.id, letter.personName)}
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {letter.status === 'REJECTED' && letter.rejectionReason && (
                            <span className="text-xs text-red-500 max-w-[150px] truncate block" title={letter.rejectionReason}>
                              {letter.rejectionReason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Tabs>
    </div>
  );
}
