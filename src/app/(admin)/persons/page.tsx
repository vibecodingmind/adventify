'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
import {
  Users, Plus, Search, Loader2, Pencil, Trash2,
  Sparkles, AlertTriangle, X, Check, User, Award, FileText,
} from 'lucide-react';
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

interface SmartSearchResult {
  _type: string;
  _relevance: number;
  id: string;
  pid?: string;
  bcn?: string;
  fullName?: string;
  person?: { fullName: string; pid: string };
  email?: string;
  status?: string;
  baptismDate?: string;
  certificateDate?: string;
  church?: { name: string };
}

interface AiSuggestion {
  value: string;
  confidence: number;
}

interface DuplicateMatch {
  id: string;
  pid: string;
  fullName: string;
  matchScore: number;
  matchReasons: string[];
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

  // AI Autofill state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AiSuggestion>>({});
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [pendingAiTarget, setPendingAiTarget] = useState<'create' | 'edit'>('create');

  // Duplicate detection state
  const [dupesLoading, setDupesLoading] = useState(false);
  const [showDupesDialog, setShowDupesDialog] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [pendingSubmitData, setPendingSubmitData] = useState<PersonFormValues | null>(null);
  const [pendingSubmitType, setPendingSubmitType] = useState<'create' | 'edit'>('create');

  // Smart search state
  const [smartSearchQuery, setSmartSearchQuery] = useState('');
  const [smartSearchResults, setSmartSearchResults] = useState<SmartSearchResult[]>([]);
  const [smartSearchLoading, setSmartSearchLoading] = useState(false);
  const [showSmartSearch, setShowSmartSearch] = useState(false);
  const smartSearchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Close smart search on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (smartSearchRef.current && !smartSearchRef.current.contains(event.target as Node)) {
        setShowSmartSearch(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // AI Auto-fill
  const handleAiAutofill = async (target: 'create' | 'edit') => {
    const form = target === 'create' ? createForm : editForm;
    const currentData = form.getValues();
    const name = currentData.fullName;

    if (!name || name.trim().length < 2) {
      toast({ title: 'Info', description: 'Enter a name first to get AI suggestions' });
      return;
    }

    setAiLoading(true);
    setPendingAiTarget(target);
    try {
      const partialData: Record<string, string> = { fullName: name };
      if (currentData.email) partialData.email = currentData.email;
      if (currentData.phone) partialData.phone = currentData.phone;
      if (currentData.city) partialData.city = currentData.city;
      if (currentData.country) partialData.country = currentData.country;

      const res = await fetch('/api/ai/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'person', partialData }),
      });
      const result = await res.json();
      if (result.success && result.data && Object.keys(result.data).length > 0) {
        setAiSuggestions(result.data);
        setShowAiDialog(true);
      } else {
        toast({ title: 'No Suggestions', description: 'AI could not generate suggestions for the provided data' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to get AI suggestions' });
    } finally {
      setAiLoading(false);
    }
  };

  const acceptAiSuggestion = (field: string, value: string) => {
    const form = pendingAiTarget === 'create' ? createForm : editForm;
    form.setValue(field as keyof PersonFormValues, value);
    // Remove accepted suggestion
    const newSuggestions = { ...aiSuggestions };
    delete newSuggestions[field];
    setAiSuggestions(newSuggestions);
    if (Object.keys(newSuggestions).length === 0) {
      setShowAiDialog(false);
    }
  };

  const acceptAllAiSuggestions = () => {
    const form = pendingAiTarget === 'create' ? createForm : editForm;
    for (const [field, suggestion] of Object.entries(aiSuggestions)) {
      form.setValue(field as keyof PersonFormValues, suggestion.value);
    }
    setAiSuggestions({});
    setShowAiDialog(false);
    toast({ title: 'Applied', description: 'All AI suggestions applied' });
  };

  // Duplicate Detection
  const checkDuplicates = async (data: PersonFormValues, type: 'create' | 'edit') => {
    setDupesLoading(true);
    try {
      const res = await fetch('/api/persons/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email || undefined,
          phone: data.phone || undefined,
          dateOfBirth: data.dateOfBirth || undefined,
          churchId: data.churchId || user?.churchId || undefined,
        }),
      });
      const result = await res.json();
      if (result.success && result.data.isDuplicate) {
        setDuplicates(result.data.potentialMatches);
        setPendingSubmitData(data);
        setPendingSubmitType(type);
        setShowDupesDialog(true);
        return true; // Has duplicates
      }
      return false;
    } catch {
      return false;
    } finally {
      setDupesLoading(false);
    }
  };

  const proceedWithSubmit = async () => {
    if (!pendingSubmitData) return;
    setShowDupesDialog(false);
    if (pendingSubmitType === 'create') {
      await doCreatePerson(pendingSubmitData);
    } else {
      await doEditPerson(pendingSubmitData);
    }
  };

  // Smart Search
  const handleSmartSearch = useCallback((query: string) => {
    setSmartSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSmartSearchResults([]);
      setShowSmartSearch(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSmartSearchLoading(true);
      setShowSmartSearch(true);
      try {
        const params = new URLSearchParams({ q: query, type: 'all', limit: '5' });
        const res = await fetch(`/api/search?${params}`);
        const result = await res.json();
        if (result.success) {
          const allResults: SmartSearchResult[] = [
            ...(result.data.persons || []),
            ...(result.data.baptismRecords || []).map((r: SmartSearchResult) => ({
              ...r,
              _type: 'baptism',
              fullName: r.person?.fullName,
            })),
            ...(result.data.certificates || []).map((r: SmartSearchResult) => ({
              ...r,
              _type: 'certificate',
              fullName: r.person?.fullName,
              pid: r.person?.pid,
            })),
          ];
          setSmartSearchResults(allResults.slice(0, 10));
        }
      } catch {
        setSmartSearchResults([]);
      } finally {
        setSmartSearchLoading(false);
      }
    }, 300);
  }, []);

  const getSearchResultIcon = (type: string) => {
    switch (type) {
      case 'person': return <User className="h-4 w-4 text-emerald-500" />;
      case 'baptism': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'certificate': return <Award className="h-4 w-4 text-purple-500" />;
      default: return <Search className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSearchResultBadge = (type: string) => {
    switch (type) {
      case 'person': return <Badge className="bg-emerald-100 text-emerald-700 text-xs">{type}</Badge>;
      case 'baptism': return <Badge className="bg-blue-100 text-blue-700 text-xs">{type}</Badge>;
      case 'certificate': return <Badge className="bg-purple-100 text-purple-700 text-xs">{type}</Badge>;
      default: return null;
    }
  };

  // Form submissions
  const doCreatePerson = async (data: PersonFormValues) => {
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
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create person' });
    } finally {
      setSubmitting(false);
    }
  };

  const doEditPerson = async (data: PersonFormValues) => {
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
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update person' });
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateSubmit = async (data: PersonFormValues) => {
    const hasDupes = await checkDuplicates(data, 'create');
    if (!hasDupes) {
      await doCreatePerson(data);
    }
  };

  const onEditSubmit = async (data: PersonFormValues) => {
    const hasDupes = await checkDuplicates(data, 'edit');
    if (!hasDupes) {
      await doEditPerson(data);
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
    } catch {
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

  const renderFormField = (form: ReturnType<typeof useForm<PersonFormValues>>, name: keyof PersonFormValues, label: string, type: string = 'text', placeholder?: string) => (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {name === 'gender' ? (
        <Select onValueChange={(v) => form.setValue('gender', v as 'Male' | 'Female' | '')}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
          </SelectContent>
        </Select>
      ) : name === 'country' ? (
        <CountryCombobox
          value={form.watch('country') || ''}
          onChange={(v) => form.setValue('country', v)}
        />
      ) : name === 'notes' ? (
        <Textarea {...form.register('notes')} placeholder={placeholder} rows={2} />
      ) : (
        <Input
          type={type}
          {...form.register(name)}
          placeholder={placeholder}
        />
      )}
    </div>
  );

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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Person</DialogTitle>
                <DialogDescription>Create a new person record</DialogDescription>
              </DialogHeader>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                {/* Name with AI button */}
                <div>
                  <label className="text-sm font-medium">Full Name *</label>
                  <div className="flex gap-2">
                    <Input {...createForm.register('fullName')} placeholder="John Smith" className="flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => handleAiAutofill('create')}
                      disabled={aiLoading}
                      title="AI Auto-fill"
                    >
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-emerald-600" />}
                    </Button>
                  </div>
                  {createForm.formState.errors.fullName && (
                    <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {renderFormField(createForm, 'dateOfBirth', 'Date of Birth', 'date')}
                  {renderFormField(createForm, 'gender', 'Gender')}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {renderFormField(createForm, 'email', 'Email', 'email', 'email@example.com')}
                  {renderFormField(createForm, 'phone', 'Phone', 'tel', '+44 7700 900000')}
                </div>
                {renderFormField(createForm, 'address', 'Address', 'text', 'Street Address')}
                <div className="grid grid-cols-2 gap-4">
                  {renderFormField(createForm, 'city', 'City', 'text', 'London')}
                  {renderFormField(createForm, 'country', 'Country')}
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
                {renderFormField(createForm, 'notes', 'Notes', 'text', 'Optional notes...')}
                <DialogFooter>
                  <Button type="submit" disabled={submitting || dupesLoading} className="w-full">
                    {(submitting || dupesLoading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {dupesLoading ? 'Checking duplicates...' : 'Create Person'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Smart Search Bar */}
      <div className="relative" ref={smartSearchRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Smart search: persons, baptism records, certificates..."
              value={smartSearchQuery}
              onChange={(e) => handleSmartSearch(e.target.value)}
              onFocus={() => smartSearchResults.length > 0 && setShowSmartSearch(true)}
              className="pl-10"
            />
            {smartSearchLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-emerald-600" />
            )}
          </div>
        </div>

        {/* Smart Search Results Dropdown */}
        {showSmartSearch && smartSearchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              <p className="px-2 py-1 text-xs text-gray-400 font-medium uppercase">Smart Search Results</p>
              {smartSearchResults.map((result, index) => (
                <button
                  key={`${result._type}-${result.id}-${index}`}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 text-left transition-colors"
                  onClick={() => {
                    setShowSmartSearch(false);
                    // Navigate based on type
                    if (result._type === 'person') {
                      setSearch(result.fullName || '');
                    } else if (result._type === 'certificate' && result.bcn) {
                      window.open(`/verify/${result.bcn}`, '_blank');
                    }
                  }}
                >
                  {getSearchResultIcon(result._type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.fullName || result.bcn || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {result.pid && <span className="font-mono mr-2">{result.pid}</span>}
                      {result.church?.name && <span>{result.church.name}</span>}
                      {result.email && <span className="ml-2">{result.email}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSearchResultBadge(result._type)}
                    <span className="text-xs text-gray-400">{result._relevance}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Filter persons by name or PID..."
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
            <DialogDescription>Update person record for {selectedPerson?.fullName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name *</label>
              <div className="flex gap-2">
                <Input {...editForm.register('fullName')} placeholder="John Smith" className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => handleAiAutofill('edit')}
                  disabled={aiLoading}
                  title="AI Auto-fill"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-emerald-600" />}
                </Button>
              </div>
              {editForm.formState.errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.fullName.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {renderFormField(editForm, 'dateOfBirth', 'Date of Birth', 'date')}
              {renderFormField(editForm, 'gender', 'Gender')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {renderFormField(editForm, 'email', 'Email', 'email', 'email@example.com')}
              {renderFormField(editForm, 'phone', 'Phone', 'tel', '+44 7700 900000')}
            </div>
            {renderFormField(editForm, 'address', 'Address', 'text', 'Street Address')}
            <div className="grid grid-cols-2 gap-4">
              {renderFormField(editForm, 'city', 'City', 'text', 'London')}
              {renderFormField(editForm, 'country', 'Country')}
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
            {renderFormField(editForm, 'notes', 'Notes', 'text', 'Optional notes...')}
            <DialogFooter>
              <Button type="submit" disabled={submitting || dupesLoading} className="w-full">
                {(submitting || dupesLoading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {dupesLoading ? 'Checking duplicates...' : 'Save Changes'}
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

      {/* AI Suggestions Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              AI Suggestions
            </DialogTitle>
            <DialogDescription>
              Review and accept AI-predicted fields for this person record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {Object.entries(aiSuggestions).map(([field, suggestion]) => (
              <div
                key={field}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-sm text-gray-600">{suggestion.value}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div
                      className={`h-1.5 w-12 rounded-full ${
                        suggestion.confidence >= 0.7
                          ? 'bg-emerald-500'
                          : suggestion.confidence >= 0.5
                          ? 'bg-amber-500'
                          : 'bg-red-400'
                      }`}
                    />
                    <span className="text-xs text-gray-400">
                      {Math.round(suggestion.confidence * 100)}% confident
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acceptAiSuggestion(field, suggestion.value)}
                  className="flex-shrink-0"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Accept
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowAiDialog(false)}>
              Dismiss
            </Button>
            <Button
              onClick={acceptAllAiSuggestions}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Accept All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Warning Dialog */}
      <Dialog open={showDupesDialog} onOpenChange={setShowDupesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Potential Duplicates Found
            </DialogTitle>
            <DialogDescription>
              The following records may be duplicates of the person you are trying to save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {duplicates.map((dup) => (
              <div
                key={dup.id}
                className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{dup.fullName}</p>
                  <Badge className="bg-amber-200 text-amber-800 text-xs">
                    {dup.matchScore}% match
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 font-mono">{dup.pid}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {dup.matchReasons.map((reason, i) => (
                    <span key={i} className="text-xs bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-700">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowDupesDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={proceedWithSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Save Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
