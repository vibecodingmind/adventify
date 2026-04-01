'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Plus, Search, Loader2, CheckCircle, XCircle, Award, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Role, BaptismStatus } from '@prisma/client';

const baptismRecordSchema = z.object({
  personId: z.string().min(1, 'Person is required'),
  churchId: z.string().min(1, 'Church is required'),
  baptismDate: z.string().min(1, 'Baptism date is required'),
  baptismLocation: z.string().optional(),
  pastorName: z.string().min(2, 'Pastor name is required'),
  pastorTitle: z.string().optional(),
  witnessName: z.string().optional(),
  notes: z.string().optional(),
});

const editBaptismRecordSchema = z.object({
  baptismDate: z.string().min(1, 'Baptism date is required'),
  baptismLocation: z.string().optional(),
  pastorName: z.string().min(2, 'Pastor name is required'),
  pastorTitle: z.string().optional(),
  witnessName: z.string().optional(),
  notes: z.string().optional(),
});

type BaptismRecordFormValues = z.infer<typeof baptismRecordSchema>;
type EditBaptismRecordFormValues = z.infer<typeof editBaptismRecordSchema>;

interface Person {
  id: string;
  pid: string;
  fullName: string;
  baptismRecord?: { id: string } | null;
}

interface Church {
  id: string;
  name: string;
  city?: string;
  conference?: { code: string };
}

interface BaptismRecord {
  id: string;
  personId: string;
  churchId: string;
  baptismDate: string;
  baptismLocation?: string;
  pastorName: string;
  pastorTitle?: string;
  witnessName?: string;
  notes?: string;
  status: string;
  rejectionReason?: string;
  person: { id: string; pid: string; fullName: string };
  church: { id: string; name: string; city?: string };
  certificate?: { id: string; bcn: string } | null;
  createdAt: string;
}

export default function BaptismRecordsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<BaptismRecord[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BaptismRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  const createForm = useForm<BaptismRecordFormValues>({
    resolver: zodResolver(baptismRecordSchema),
    defaultValues: {
      personId: '',
      churchId: user?.churchId || '',
      baptismDate: '',
      baptismLocation: '',
      pastorName: '',
      pastorTitle: '',
      witnessName: '',
      notes: '',
    },
  });

  const editForm = useForm<EditBaptismRecordFormValues>({
    resolver: zodResolver(editBaptismRecordSchema),
    defaultValues: {
      baptismDate: '',
      baptismLocation: '',
      pastorName: '',
      pastorTitle: '',
      witnessName: '',
      notes: '',
    },
  });

  useEffect(() => {
    fetchRecords();
    fetchPersons();
    if (user?.role !== Role.CHURCH_CLERK && user?.role !== Role.CHURCH_PASTOR) {
      fetchChurches();
    }
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchRecords();
  }, [pagination.page]);

  const fetchRecords = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/baptism-records?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
        setPagination(prev => ({ ...prev, total: data.pagination.total, totalPages: data.pagination.totalPages }));
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersons = async () => {
    try {
      const res = await fetch('/api/persons?limit=100');
      const data = await res.json();
      if (data.success) {
        setPersons(data.data.filter((p: Person) => !p.baptismRecord));
      }
    } catch (error) {
      console.error('Error fetching persons:', error);
    }
  };

  const fetchChurches = async () => {
    try {
      const res = await fetch('/api/churches');
      const data = await res.json();
      if (data.success) {
        setChurches(data.data);
      }
    } catch (error) {
      console.error('Error fetching churches:', error);
    }
  };

  const openEditDialog = (record: BaptismRecord) => {
    setSelectedRecord(record);
    editForm.reset({
      baptismDate: record.baptismDate ? record.baptismDate.split('T')[0] : '',
      baptismLocation: record.baptismLocation || '',
      pastorName: record.pastorName,
      pastorTitle: record.pastorTitle || '',
      witnessName: record.witnessName || '',
      notes: record.notes || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (record: BaptismRecord) => {
    setSelectedRecord(record);
    setShowDeleteDialog(true);
  };

  const onCreateSubmit = async (data: BaptismRecordFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/baptism-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Baptism record created successfully' });
        setShowCreateDialog(false);
        createForm.reset();
        fetchRecords();
        fetchPersons();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create record' });
    } finally {
      setSubmitting(false);
    }
  };

  const onEditSubmit = async (data: EditBaptismRecordFormValues) => {
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/baptism-records/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Baptism record updated successfully' });
        setShowEditDialog(false);
        setSelectedRecord(null);
        editForm.reset();
        fetchRecords();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update record' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/baptism-records/${selectedRecord.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Baptism record deleted successfully' });
        setShowDeleteDialog(false);
        setSelectedRecord(null);
        fetchRecords();
        fetchPersons();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete record' });
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async (recordId: string) => {
    try {
      const res = await fetch(`/api/baptism-records/${recordId}/approve`, {
        method: 'POST',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Baptism record approved' });
        fetchRecords();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve record' });
    }
  };

  const handleReject = async () => {
    if (!selectedRecord || !rejectReason.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide a rejection reason' });
      return;
    }

    try {
      const res = await fetch(`/api/baptism-records/${selectedRecord.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Baptism record rejected' });
        setShowRejectDialog(false);
        setRejectReason('');
        setSelectedRecord(null);
        fetchRecords();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reject record' });
    }
  };

  const handleGenerateCertificate = async (recordId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baptismRecordId: recordId }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Certificate generated successfully' });
        fetchRecords();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate certificate' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Church Pastor, Church Admin, and higher can approve/reject
  const canApprove = user?.role !== Role.MEMBER && user?.role !== Role.CHURCH_CLERK;
  const canCreate = user?.role !== Role.MEMBER;
  const canEdit = user?.role !== Role.MEMBER;
  const canDelete = user?.role === Role.GENERAL_CONFERENCE_ADMIN || user?.role === Role.DIVISION_ADMIN || user?.role === Role.CONFERENCE_ADMIN;
  const canGenerateCertificate = user?.role !== Role.MEMBER; // Kept for reference but button removed (auto-generated on approval)

  const pendingCount = records.filter(r => r.status === 'PENDING').length;

  // Determine if edit is allowed for a record (only pending, and CHURCH_CLERK+ in scope)
  const canEditRecord = (record: BaptismRecord) => {
    return canEdit && record.status === 'PENDING';
  };

  // Determine if delete is allowed (CONFERENCE_ADMIN+ and no certificate, or any PENDING record)
  const canDeleteRecord = (record: BaptismRecord) => {
    if (canDelete && !record.certificate) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Baptism Records</h1>
          <p className="text-gray-500 mt-1">Manage baptism records and approvals</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            New Baptism Record
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v)}>
        <TabsList>
          <TabsTrigger value="all">All Records</TabsTrigger>
          <TabsTrigger value="PENDING">
            Pending
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-yellow-500 text-white">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name or PID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No baptism records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Church</TableHead>
                    <TableHead>Baptism Date</TableHead>
                    <TableHead>Pastor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.person.fullName}</p>
                          <p className="text-xs text-gray-500 font-mono">{record.person.pid}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{record.church.name}</p>
                          {record.church.city && (
                            <p className="text-xs text-gray-500">{record.church.city}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(record.baptismDate)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{record.pastorName}</p>
                          {record.pastorTitle && (
                            <p className="text-xs text-gray-500">{record.pastorTitle}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {record.certificate ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            {record.certificate.bcn.substring(record.certificate.bcn.lastIndexOf('-') + 1)}
                          </Badge>
                        ) : record.status === 'APPROVED' ? (
                          <span className="text-gray-400 text-sm">Not generated</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEditRecord(record) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-500 hover:text-blue-600"
                              onClick={() => openEditDialog(record)}
                              title="Edit record"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteRecord(record) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-500 hover:text-red-600"
                              onClick={() => openDeleteDialog(record)}
                              title="Delete record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {record.status === 'PENDING' && canApprove && (
                            <>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 text-green-600 hover:bg-green-50"
                                onClick={() => handleApprove(record.id)}
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setShowRejectDialog(true);
                                }}
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {/* Generate Certificate button removed - certificates are auto-generated on approval */}
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Baptism Record</DialogTitle>
            <DialogDescription>Record a new baptism</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Person *</label>
              <Select onValueChange={(v) => createForm.setValue('personId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {persons.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.fullName} ({person.pid})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.personId && (
                <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.personId.message}</p>
              )}
            </div>

            {user?.role !== Role.CHURCH_CLERK && user?.role !== Role.CHURCH_PASTOR && (
              <div>
                <label className="text-sm font-medium">Church *</label>
                <Select onValueChange={(v) => createForm.setValue('churchId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select church" />
                  </SelectTrigger>
                  <SelectContent>
                    {churches.map(church => (
                      <SelectItem key={church.id} value={church.id}>
                        {church.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Baptism Date *</label>
                <Input type="date" {...createForm.register('baptismDate')} />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input {...createForm.register('baptismLocation')} placeholder="Optional" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Pastor Name *</label>
                <Input {...createForm.register('pastorName')} placeholder="John Smith" />
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input {...createForm.register('pastorTitle')} placeholder="Senior Pastor" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Witness Name</label>
              <Input {...createForm.register('witnessName')} placeholder="Optional" />
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea {...createForm.register('notes')} placeholder="Optional notes..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setSelectedRecord(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Baptism Record</DialogTitle>
            <DialogDescription>
              Update record for {selectedRecord?.person.fullName} ({selectedRecord?.person.pid})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Baptism Date *</label>
                <Input type="date" {...editForm.register('baptismDate')} />
                {editForm.formState.errors.baptismDate && (
                  <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.baptismDate.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input {...editForm.register('baptismLocation')} placeholder="Optional" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Pastor Name *</label>
                <Input {...editForm.register('pastorName')} placeholder="John Smith" />
                {editForm.formState.errors.pastorName && (
                  <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.pastorName.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input {...editForm.register('pastorTitle')} placeholder="Senior Pastor" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Witness Name</label>
              <Input {...editForm.register('witnessName')} placeholder="Optional" />
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea {...editForm.register('notes')} placeholder="Optional notes..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={(open) => { setShowRejectDialog(open); if (!open) { setRejectReason(''); setSelectedRecord(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Baptism Record</DialogTitle>
            <DialogDescription>
              Reject record for {selectedRecord?.person.fullName}. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Baptism Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the baptism record for{' '}
              <strong>{selectedRecord?.person.fullName}</strong> ({selectedRecord?.person.pid})?
              {selectedRecord?.certificate && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Warning: This record has a linked certificate. It cannot be deleted.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedRecord(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || !!selectedRecord?.certificate}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
