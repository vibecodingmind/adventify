'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { Role, DocumentType, RequestStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Plus,
  Download,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
  ShieldAlert,
} from 'lucide-react';
import {
  DOCUMENT_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  type MemberRequestWithDetails,
} from '@/types';
import { useToast } from '@/hooks/use-toast';

// ─────────────────────────────────────────────────────────────
// Role check helper
// ─────────────────────────────────────────────────────────────
const CONFERENCE_ROLES: Role[] = [
  Role.CONFERENCE_ADMIN,
  Role.UNION_ADMIN,
  Role.DIVISION_ADMIN,
  Role.GENERAL_CONFERENCE_ADMIN,
];

function isConferenceRole(role: Role): boolean {
  return CONFERENCE_ROLES.includes(role);
}

// ─────────────────────────────────────────────────────────────
// Status badge component
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: RequestStatus }) {
  switch (status) {
    case RequestStatus.PENDING:
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          {REQUEST_STATUS_LABELS[status]}
        </Badge>
      );
    case RequestStatus.APPROVED:
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          {REQUEST_STATUS_LABELS[status]}
        </Badge>
      );
    case RequestStatus.REJECTED:
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          {REQUEST_STATUS_LABELS[status]}
        </Badge>
      );
    case RequestStatus.GENERATED:
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          <FileText className="h-3 w-3 mr-1" />
          {REQUEST_STATUS_LABELS[status]}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─────────────────────────────────────────────────────────────
// Document type badge
// ─────────────────────────────────────────────────────────────
function DocumentTypeBadge({ type }: { type: DocumentType }) {
  return (
    <Badge variant="outline" className="border-emerald-200 text-emerald-700 font-normal">
      {DOCUMENT_TYPE_LABELS[type]}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────
// Mini stat card
// ─────────────────────────────────────────────────────────────
function MiniStatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Person option for clerk picker
// ─────────────────────────────────────────────────────────────
interface PersonOption {
  id: string;
  pid: string;
  fullName: string;
  email?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Pagination info
// ─────────────────────────────────────────────────────────────
interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────
export default function MemberRequestsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  // ── Shared state ──
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<MemberRequestWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── Clerk-specific state ──
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [editClerkNotes, setEditClerkNotes] = useState('');
  const [editingRequest, setEditingRequest] = useState<MemberRequestWithDetails | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  // ── Pastor-specific state ──
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<MemberRequestWithDetails | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // ── Search debounce ──
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchRequests();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch on tab / page change ──
  useEffect(() => {
    fetchRequests();
  }, [activeTab, pagination.page]);

  // ── Fetch persons for clerk ──
  useEffect(() => {
    if (user?.role === Role.CHURCH_CLERK && user?.churchId) {
      fetchPersons();
    }
  }, [user?.role, user?.churchId]);

  // ─────────────────────────────────────────────────────────
  // API calls
  // ─────────────────────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
      });
      if (activeTab !== 'ALL') {
        params.set('status', activeTab);
      }
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const res = await fetch(`/api/member-requests?${params}`);
      const data = await res.json();

      if (data.success) {
        setRequests(data.data || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to load requests',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch requests',
      });
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, pagination.page, search, toast]);

  const fetchPersons = async () => {
    if (!user?.churchId) return;
    try {
      const params = new URLSearchParams({
        churchId: user.churchId,
        limit: '100',
      });
      const res = await fetch(`/api/persons?${params}`);
      const data = await res.json();
      if (data.success) {
        setPersons(data.data || []);
      }
    } catch {
      // Silent fail for person list
    }
  };

  // ── Create request (clerk only) ──
  const handleCreate = async () => {
    if (!selectedPersonId || !selectedDocumentType) return;
    setCreating(true);
    try {
      const res = await fetch('/api/member-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: selectedPersonId,
          documentType: selectedDocumentType,
          reason: createReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Document request created successfully' });
        setShowCreateDialog(false);
        resetCreateForm();
        fetchRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to create request',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create request',
      });
    } finally {
      setCreating(false);
    }
  };

  // ── Edit request (clerk only) ──
  const handleEdit = async () => {
    if (!editingRequest) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/member-requests/${editingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkNotes: editClerkNotes.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Request updated successfully' });
        setShowEditDialog(false);
        setEditingRequest(null);
        setEditClerkNotes('');
        fetchRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to update request',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update request',
      });
    } finally {
      setEditing(false);
    }
  };

  // ── Approve request (pastor only) ──
  const handleApprove = async (requestId: string) => {
    setApprovingId(requestId);
    try {
      const res = await fetch(`/api/member-requests/${requestId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Request approved and document generated' });
        fetchRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to approve request',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve request',
      });
    } finally {
      setApprovingId(null);
    }
  };

  // ── Reject request (pastor only) ──
  const handleReject = async () => {
    if (!rejectingRequest || rejectReason.trim().length < 5) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/member-requests/${rejectingRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Request rejected' });
        setShowRejectDialog(false);
        setRejectingRequest(null);
        setRejectReason('');
        fetchRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to reject request',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject request',
      });
    } finally {
      setRejecting(false);
    }
  };

  // ── Download document ──
  const handleDownload = async (requestId: string) => {
    setDownloadingId(requestId);
    try {
      const res = await fetch(`/api/member-requests/${requestId}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          variant: 'destructive',
          title: 'Download Failed',
          description: data.error || 'Could not download document',
        });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      const filename = disposition
        ? disposition.split('filename=')[1]?.replace(/"/g, '')
        : `document-${requestId}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download document',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Helpers ──
  const resetCreateForm = () => {
    setSelectedPersonId('');
    setSelectedDocumentType('');
    setCreateReason('');
  };

  const openEditDialog = (request: MemberRequestWithDetails) => {
    setEditingRequest(request);
    setEditClerkNotes(request.clerkNotes || '');
    setShowEditDialog(true);
  };

  const openRejectDialog = (request: MemberRequestWithDetails) => {
    setRejectingRequest(request);
    setRejectReason('');
    setShowRejectDialog(true);
  };

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ─────────────────────────────────────────────────────────
  // Stats computation
  // ─────────────────────────────────────────────────────────
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === RequestStatus.PENDING).length,
    approved: requests.filter((r) => r.status === RequestStatus.APPROVED).length,
    generated: requests.filter((r) => r.status === RequestStatus.GENERATED).length,
    rejected: requests.filter((r) => r.status === RequestStatus.REJECTED).length,
  };

  // Use "total" from pagination when available (for full counts)
  const totalFromPagination = pagination.total;

  // ─────────────────────────────────────────────────────────
  // Access denied for CONFERENCE+ roles
  // ─────────────────────────────────────────────────────────
  if (user && isConferenceRole(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-red-100 p-4 w-fit">
              <ShieldAlert className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl">Access Denied</CardTitle>
            <CardDescription>
              Document requests are managed at the church level. Conference administrators do
              not have access to this feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-gray-500">
            <p>
              If you need access to document requests, please contact your local church clerk or
              pastor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // MEMBER view
  // ─────────────────────────────────────────────────────────
  if (user?.role === Role.MEMBER) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Document Requests</h1>
          <p className="text-gray-500 mt-1">View and download your requested documents</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MiniStatCard
            label="Total Requests"
            value={totalFromPagination}
            icon={FileText}
            color="bg-gray-100 text-gray-600"
          />
          <MiniStatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            color="bg-yellow-100 text-yellow-600"
          />
          <MiniStatCard
            label="Completed"
            value={stats.generated}
            icon={CheckCircle}
            color="bg-emerald-100 text-emerald-600"
          />
          <MiniStatCard
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            color="bg-red-100 text-red-600"
          />
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by document type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Requests Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No document requests found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">{request.requestId}</TableCell>
                        <TableCell>
                          <DocumentTypeBadge type={request.documentType} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(request.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === RequestStatus.GENERATED && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => handleDownload(request.id)}
                              disabled={downloadingId === request.id}
                            >
                              {downloadingId === request.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-1" />
                              )}
                              Download
                            </Button>
                          )}
                          {request.status === RequestStatus.REJECTED && request.rejectionReason && (
                            <span className="text-xs text-red-500 block mt-1">
                              {request.rejectionReason}
                            </span>
                          )}
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {requests.length} of {totalFromPagination} requests
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // CHURCH_CLERK view
  // ─────────────────────────────────────────────────────────
  if (user?.role === Role.CHURCH_CLERK) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Requests</h1>
            <p className="text-gray-500 mt-1">
              Create and process document requests for church members
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetCreateForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                New Document Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Document Request</DialogTitle>
                <DialogDescription>
                  Select a church member and the document type they need
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Person picker */}
                <div>
                  <label className="text-sm font-medium">Person *</label>
                  <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {persons.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{p.fullName}</span>
                            <span className="text-xs text-gray-400 font-mono">{p.pid}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Document type */}
                <div>
                  <label className="text-sm font-medium">Document Type *</label>
                  <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-sm font-medium">Reason (optional)</label>
                  <Textarea
                    value={createReason}
                    onChange={(e) => setCreateReason(e.target.value)}
                    placeholder="Why is this document needed?"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !selectedPersonId || !selectedDocumentType}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <MiniStatCard
            label="Total"
            value={totalFromPagination}
            icon={FileText}
            color="bg-gray-100 text-gray-600"
          />
          <MiniStatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            color="bg-yellow-100 text-yellow-600"
          />
          <MiniStatCard
            label="Approved"
            value={stats.approved}
            icon={CheckCircle}
            color="bg-blue-100 text-blue-600"
          />
          <MiniStatCard
            label="Generated"
            value={stats.generated}
            icon={FileText}
            color="bg-emerald-100 text-emerald-600"
          />
          <MiniStatCard
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            color="bg-red-100 text-red-600"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="PENDING">
              Pending
              {stats.pending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-yellow-100 text-yellow-700 text-xs">
                  {stats.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="APPROVED">
              Approved
              {stats.approved > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                  {stats.approved}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="GENERATED">
              Generated
              {stats.generated > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                  {stats.generated}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="REJECTED">
              Rejected
              {stats.rejected > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-100 text-red-700 text-xs">
                  {stats.rejected}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search (shared across tabs) */}
          <div className="relative max-w-sm mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or request ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* All tab content is the same table - just filtered via API */}
          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No document requests found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request ID</TableHead>
                          <TableHead>Person Name</TableHead>
                          <TableHead>Document Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-mono text-sm">
                              {request.requestId}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {request.person?.fullName || request.member?.fullName || 'Unknown'}
                                </p>
                                {request.person?.email && (
                                  <p className="text-xs text-gray-500">{request.person.email}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DocumentTypeBadge type={request.documentType} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={request.status} />
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(request.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {request.status === RequestStatus.PENDING && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                                    onClick={() => openEditDialog(request)}
                                    title="Edit clerk notes"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {request.status === RequestStatus.GENERATED && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                    onClick={() => handleDownload(request.id)}
                                    disabled={downloadingId === request.id}
                                  >
                                    {downloadingId === request.id ? (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4 mr-1" />
                                    )}
                                    Download
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {requests.length} of {totalFromPagination} requests
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Edit Clerk Notes Dialog */}
        <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditingRequest(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Request</DialogTitle>
              <DialogDescription>
                Add clerk notes for request{' '}
                <span className="font-mono">{editingRequest?.requestId}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {editingRequest && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">Person:</span>{' '}
                    <span className="font-medium">
                      {editingRequest.person?.fullName || editingRequest.member?.fullName}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-500">Document:</span>{' '}
                    <DocumentTypeBadge type={editingRequest.documentType} />
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Clerk Notes</label>
                <Textarea
                  value={editClerkNotes}
                  onChange={(e) => setEditClerkNotes(e.target.value)}
                  placeholder="Add notes for the pastor reviewing this request..."
                  rows={4}
                />
                <p className="text-xs text-gray-400 mt-1">
                  These notes will be visible to the pastor during approval
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleEdit} disabled={editing} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {editing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Notes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // CHURCH_PASTOR view
  // ─────────────────────────────────────────────────────────
  if (user?.role === Role.CHURCH_PASTOR) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-500 mt-1">
            Review and approve document requests from church members
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MiniStatCard
            label="Total"
            value={totalFromPagination}
            icon={FileText}
            color="bg-gray-100 text-gray-600"
          />
          <MiniStatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            color="bg-yellow-100 text-yellow-600"
          />
          <MiniStatCard
            label="Approved"
            value={stats.approved}
            icon={CheckCircle}
            color="bg-emerald-100 text-emerald-600"
          />
          <MiniStatCard
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            color="bg-red-100 text-red-600"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="PENDING">
              Pending
              {stats.pending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-yellow-100 text-yellow-700 text-xs">
                  {stats.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="APPROVED">
              Approved
              {stats.approved > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                  {stats.approved}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="REJECTED">
              Rejected
              {stats.rejected > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-100 text-red-700 text-xs">
                  {stats.rejected}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="GENERATED">
              Generated
              {stats.generated > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                  {stats.generated}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative max-w-sm mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or request ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No document requests found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request ID</TableHead>
                          <TableHead>Person Name</TableHead>
                          <TableHead>Document Type</TableHead>
                          <TableHead>Clerk Notes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-mono text-sm">
                              {request.requestId}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {request.person?.fullName || request.member?.fullName || 'Unknown'}
                                </p>
                                {request.reason && (
                                  <p className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">
                                    {request.reason}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DocumentTypeBadge type={request.documentType} />
                            </TableCell>
                            <TableCell>
                              {request.clerkNotes ? (
                                <span className="text-sm text-gray-600 max-w-[200px] block truncate">
                                  {request.clerkNotes}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={request.status} />
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(request.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Approve */}
                                {request.status === RequestStatus.PENDING && (
                                  <>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                          disabled={approvingId === request.id}
                                        >
                                          {approvingId === request.id ? (
                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                          ) : (
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                          )}
                                          Approve
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Approve Request</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to approve this document request for{' '}
                                            <strong>
                                              {request.person?.fullName || request.member?.fullName}
                                            </strong>
                                            ? The document will be generated automatically upon
                                            approval.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleApprove(request.id)}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                          >
                                            Approve &amp; Generate
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>

                                    {/* Reject */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => openRejectDialog(request)}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}

                                {/* Download */}
                                {request.status === RequestStatus.GENERATED && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                    onClick={() => handleDownload(request.id)}
                                    disabled={downloadingId === request.id}
                                  >
                                    {downloadingId === request.id ? (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4 mr-1" />
                                    )}
                                    Download
                                  </Button>
                                )}

                                {/* Rejection reason display */}
                                {request.status === RequestStatus.REJECTED && request.rejectionReason && (
                                  <span className="text-xs text-red-500 block mt-1 max-w-[180px] truncate">
                                    {request.rejectionReason}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {requests.length} of {totalFromPagination} requests
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={(open) => { setShowRejectDialog(open); if (!open) { setRejectingRequest(null); setRejectReason(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Reject Request
              </DialogTitle>
              <DialogDescription>
                Reject document request for{' '}
                <strong>{rejectingRequest?.person?.fullName || rejectingRequest?.member?.fullName}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {rejectingRequest && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">Document:</span>{' '}
                    <DocumentTypeBadge type={rejectingRequest.documentType} />
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Rejection Reason *</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for rejecting this request (minimum 5 characters)..."
                  rows={4}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {rejectReason.length < 5
                    ? `${5 - rejectReason.length} more character${5 - rejectReason.length !== 1 ? 's' : ''} needed`
                    : 'Ready to submit'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleReject}
                disabled={rejecting || rejectReason.trim().length < 5}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {rejecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reject Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // Fallback (should not reach here)
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-gray-100 p-4 w-fit">
            <ShieldAlert className="h-8 w-8 text-gray-500" />
          </div>
          <CardTitle className="text-xl">Access Restricted</CardTitle>
          <CardDescription>
            Your role does not have access to this feature.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
