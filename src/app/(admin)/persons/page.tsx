'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Plus, Search, Loader2, Pencil, Trash2 } from 'lucide-react';
import { CountryCombobox } from '@/components/country-combobox';
import { useToast } from '@/hooks/use-toast';
import { Role } from '@prisma/client';

const personSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', '']).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  churchId: z.string().optional(),
  notes: z.string().optional(),
});

type PersonFormValues = z.infer<typeof personSchema>;

interface Person {
  id: string;
  pid: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
  church?: { id: string; name: string; city?: string; country?: string } | null;
  baptismRecord?: { id: string; baptismDate: string; status: string } | null;
  createdAt: string;
}

interface Church {
  id: string;
  name: string;
  city?: string;
  country?: string;
}

export default function PersonsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [persons, setPersons] = useState<Person[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  const createForm = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      gender: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      churchId: '',
      notes: '',
    },
  });

  const editForm = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      gender: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      churchId: '',
      notes: '',
    },
  });

  useEffect(() => {
    fetchPersons();
    fetchChurches();
  }, [pagination.page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchPersons();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPersons = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/persons?${params}`);
      const data = await res.json();
      if (data.success) {
        setPersons(data.data);
        setPagination(prev => ({ ...prev, total: data.pagination.total, totalPages: data.pagination.totalPages }));
      }
    } catch (error) {
      console.error('Error fetching persons:', error);
    } finally {
      setLoading(false);
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

  const openEditDialog = (person: Person) => {
    setSelectedPerson(person);
    editForm.reset({
      fullName: person.fullName,
      dateOfBirth: person.dateOfBirth ? person.dateOfBirth.split('T')[0] : '',
      gender: (person.gender as 'Male' | 'Female' | '') || '',
      email: person.email || '',
      phone: person.phone || '',
      address: person.address || '',
      city: person.city || '',
      country: person.country || '',
      churchId: person.church?.id || '',
      notes: person.notes || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (person: Person) => {
    setSelectedPerson(person);
    setShowDeleteDialog(true);
  };

  const onCreateSubmit = async (data: PersonFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          churchId: user && churchLevelRoles.includes(user.role) ? user.churchId : data.churchId,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Person created successfully' });
        setShowCreateDialog(false);
        createForm.reset();
        fetchPersons();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create person' });
    } finally {
      setSubmitting(false);
    }
  };

  const onEditSubmit = async (data: PersonFormValues) => {
    if (!selectedPerson) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/persons/${selectedPerson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          churchId: data.churchId || null,
          email: data.email || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Person updated successfully' });
        setShowEditDialog(false);
        setSelectedPerson(null);
        editForm.reset();
        fetchPersons();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update person' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPerson) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/persons/${selectedPerson.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Person deleted successfully' });
        setShowDeleteDialog(false);
        setSelectedPerson(null);
        fetchPersons();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete person' });
    } finally {
      setDeleting(false);
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
        return <Badge className="bg-green-100 text-green-700">Baptized</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      default:
        return null;
    }
  };

  const churchLevelRoles: Role[] = [Role.CHURCH_CLERK, Role.CHURCH_PASTOR];
  const canEdit = user?.role !== Role.MEMBER;
  const canDelete = user?.role === Role.GENERAL_CONFERENCE_ADMIN || user?.role === Role.DIVISION_ADMIN || user?.role === Role.CONFERENCE_ADMIN;
  const canCreate = user?.role !== Role.MEMBER;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Persons</h1>
          <p className="text-gray-500 mt-1">Manage person records</p>
        </div>
        {canCreate && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Person</DialogTitle>
                <DialogDescription>Create a new person record</DialogDescription>
              </DialogHeader>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input {...createForm.register('fullName')} placeholder="John Smith" />
                  {createForm.formState.errors.fullName && (
                    <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input type="date" {...createForm.register('dateOfBirth')} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Gender</label>
                    <Select onValueChange={(v) => createForm.setValue('gender', v as 'Male' | 'Female' | '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" {...createForm.register('email')} placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input {...createForm.register('phone')} placeholder="+44 7700 900000" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Input {...createForm.register('address')} placeholder="Street Address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input {...createForm.register('city')} placeholder="London" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <CountryCombobox
                      value={createForm.watch('country') || ''}
                      onChange={(v) => createForm.setValue('country', v)}
                    />
                  </div>
                </div>
                {user && !churchLevelRoles.includes(user.role) && churches.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Church</label>
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
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea {...createForm.register('notes')} placeholder="Optional notes..." rows={2} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Person
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name or PID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Persons Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : persons.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No persons found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PID</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Church</TableHead>
                    <TableHead>Baptism Status</TableHead>
                    <TableHead>Created</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {persons.map(person => (
                    <TableRow key={person.id}>
                      <TableCell className="font-mono text-sm">{person.pid}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{person.fullName}</p>
                          {person.email && (
                            <p className="text-sm text-gray-500">{person.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {person.church ? (
                          <div>
                            <p className="text-sm">{person.church.name}</p>
                            {person.church.city && (
                              <p className="text-xs text-gray-500">{person.church.city}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {person.baptismRecord ? (
                          <div>
                            {getStatusBadge(person.baptismRecord.status)}
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(person.baptismRecord.baptismDate)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not baptized</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(person.createdAt)}
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                onClick={() => openEditDialog(person)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-500 hover:text-red-600"
                                onClick={() => openDeleteDialog(person)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
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
            Showing {persons.length} of {pagination.total} persons
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setSelectedPerson(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
            <DialogDescription>Update person record for {selectedPerson?.fullName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name *</label>
              <Input {...editForm.register('fullName')} placeholder="John Smith" />
              {editForm.formState.errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.fullName.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date of Birth</label>
                <Input type="date" {...editForm.register('dateOfBirth')} />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <Select
                  value={editForm.watch('gender') || ''}
                  onValueChange={(v) => editForm.setValue('gender', v as 'Male' | 'Female' | '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" {...editForm.register('email')} placeholder="email@example.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input {...editForm.register('phone')} placeholder="+44 7700 900000" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input {...editForm.register('address')} placeholder="Street Address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <Input {...editForm.register('city')} placeholder="London" />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <CountryCombobox
                  value={editForm.watch('country') || ''}
                  onChange={(v) => editForm.setValue('country', v)}
                />
              </div>
            </div>
            {user && !churchLevelRoles.includes(user.role) && churches.length > 0 && (
              <div>
                <label className="text-sm font-medium">Church</label>
                <Select
                  value={editForm.watch('churchId') || ''}
                  onValueChange={(v) => editForm.setValue('churchId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select church" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No church</SelectItem>
                    {churches.map(church => (
                      <SelectItem key={church.id} value={church.id}>
                        {church.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Person</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedPerson?.fullName}</strong> ({selectedPerson?.pid})?
              {selectedPerson?.baptismRecord && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Warning: This person has a linked baptism record. It will also be deleted.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPerson(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Person
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
