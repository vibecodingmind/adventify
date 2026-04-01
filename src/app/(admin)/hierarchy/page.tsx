'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Role } from '@prisma/client';

// Schemas
const divisionSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2),
  headquarters: z.string().optional(),
  description: z.string().optional(),
});

const unionSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2),
  divisionId: z.string().min(1),
  headquarters: z.string().optional(),
  description: z.string().optional(),
});

const conferenceSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2),
  unionId: z.string().min(1),
  headquarters: z.string().optional(),
  description: z.string().optional(),
});

const churchSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(2),
  conferenceId: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

// Types
interface Division {
  id: string;
  code: string;
  name: string;
  headquarters?: string | null;
  description?: string | null;
  unionCount?: number;
  churchCount?: number;
  unions?: Union[];
}

interface Union {
  id: string;
  code: string;
  name: string;
  divisionId: string;
  headquarters?: string | null;
  description?: string | null;
  conferenceCount?: number;
  conferences?: Conference[];
}

interface Conference {
  id: string;
  code: string;
  name: string;
  unionId: string;
  headquarters?: string | null;
  description?: string | null;
  churchCount?: number;
  churches?: Church[];
}

interface Church {
  id: string;
  code: string;
  name: string;
  conferenceId: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

type EntityType = 'division' | 'union' | 'conference' | 'church';

export default function HierarchyPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [expandedUnions, setExpandedUnions] = useState<Set<string>>(new Set());
  const [expandedConferences, setExpandedConferences] = useState<Set<string>>(new Set());

  // Dialog states
  const [showDivisionDialog, setShowDivisionDialog] = useState(false);
  const [showUnionDialog, setShowUnionDialog] = useState(false);
  const [showConferenceDialog, setShowConferenceDialog] = useState(false);
  const [showChurchDialog, setShowChurchDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit states
  const [editingEntity, setEditingEntity] = useState<{ type: EntityType; id: string; data: Record<string, string> } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<{ type: EntityType; id: string; name: string; code: string; childCount: number; childLabel: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Selected parent for creation
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [selectedUnionId, setSelectedUnionId] = useState<string>('');
  const [selectedConferenceId, setSelectedConferenceId] = useState<string>('');

  // Forms
  const divisionForm = useForm({
    resolver: zodResolver(divisionSchema),
    defaultValues: { code: '', name: '', headquarters: '', description: '' },
  });

  const unionForm = useForm({
    resolver: zodResolver(unionSchema),
    defaultValues: { code: '', name: '', divisionId: '', headquarters: '', description: '' },
  });

  const conferenceForm = useForm({
    resolver: zodResolver(conferenceSchema),
    defaultValues: { code: '', name: '', unionId: '', headquarters: '', description: '' },
  });

  const churchForm = useForm({
    resolver: zodResolver(churchSchema),
    defaultValues: { code: '', name: '', conferenceId: '', address: '', city: '', country: '' },
  });

  // Edit form (reused)
  const editForm = useForm({
    defaultValues: { code: '', name: '', headquarters: '', description: '' },
  });

  const fetchHierarchy = useCallback(async () => {
    try {
      const res = await fetch('/api/divisions');
      const data = await res.json();
      if (data.success) {
        setDivisions(data.data);
      }
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const fetchUnionDetails = async (divisionId: string) => {
    try {
      const res = await fetch(`/api/unions?divisionId=${divisionId}`);
      const data = await res.json();
      if (data.success) {
        setDivisions(prev => prev.map(d => {
          if (d.id === divisionId) {
            return { ...d, unions: data.data };
          }
          return d;
        }));
      }
    } catch (error) {
      console.error('Error fetching unions:', error);
    }
  };

  const fetchConferenceDetails = async (unionId: string) => {
    try {
      const res = await fetch(`/api/conferences?unionId=${unionId}`);
      const data = await res.json();
      if (data.success) {
        setDivisions(prev => prev.map(d => ({
          ...d,
          unions: d.unions?.map(u => {
            if (u.id === unionId) {
              return { ...u, conferences: data.data };
            }
            return u;
          }),
        })));
      }
    } catch (error) {
      console.error('Error fetching conferences:', error);
    }
  };

  const fetchChurchDetails = async (conferenceId: string) => {
    try {
      const res = await fetch(`/api/churches?conferenceId=${conferenceId}`);
      const data = await res.json();
      if (data.success) {
        setDivisions(prev => prev.map(d => ({
          ...d,
          unions: d.unions?.map(u => ({
            ...u,
            conferences: u.conferences?.map(c => {
              if (c.id === conferenceId) {
                return { ...c, churches: data.data };
              }
              return c;
            }),
          })),
        })));
      }
    } catch (error) {
      console.error('Error fetching churches:', error);
    }
  };

  const toggleDivision = (divisionId: string) => {
    const newExpanded = new Set(expandedDivisions);
    if (newExpanded.has(divisionId)) {
      newExpanded.delete(divisionId);
    } else {
      newExpanded.add(divisionId);
      fetchUnionDetails(divisionId);
    }
    setExpandedDivisions(newExpanded);
  };

  const toggleUnion = (unionId: string) => {
    const newExpanded = new Set(expandedUnions);
    if (newExpanded.has(unionId)) {
      newExpanded.delete(unionId);
    } else {
      newExpanded.add(unionId);
      fetchConferenceDetails(unionId);
    }
    setExpandedUnions(newExpanded);
  };

  const toggleConference = (conferenceId: string) => {
    const newExpanded = new Set(expandedConferences);
    if (newExpanded.has(conferenceId)) {
      newExpanded.delete(conferenceId);
    } else {
      newExpanded.add(conferenceId);
      fetchChurchDetails(conferenceId);
    }
    setExpandedConferences(newExpanded);
  };

  // Create handlers
  const createDivision = async (data: z.infer<typeof divisionSchema>) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Division created successfully' });
        setShowDivisionDialog(false);
        divisionForm.reset();
        fetchHierarchy();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create division' });
    } finally {
      setSubmitting(false);
    }
  };

  const createUnion = async (data: z.infer<typeof unionSchema>) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/unions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Union created successfully' });
        setShowUnionDialog(false);
        unionForm.reset();
        fetchHierarchy();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create union' });
    } finally {
      setSubmitting(false);
    }
  };

  const createConference = async (data: z.infer<typeof conferenceSchema>) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/conferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Conference created successfully' });
        setShowConferenceDialog(false);
        conferenceForm.reset();
        fetchHierarchy();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create conference' });
    } finally {
      setSubmitting(false);
    }
  };

  const createChurch = async (data: z.infer<typeof churchSchema>) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/churches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Church created successfully' });
        setShowChurchDialog(false);
        churchForm.reset();
        fetchHierarchy();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create church' });
    } finally {
      setSubmitting(false);
    }
  };

  // Edit handler
  const openEditDialog = (type: EntityType, id: string, data: Record<string, string>) => {
    setEditingEntity({ type, id, data });
    editForm.reset({
      code: data.code || '',
      name: data.name || '',
      headquarters: data.headquarters || '',
      description: data.description || '',
    });
    setShowEditDialog(true);
  };

  const handleEdit = async () => {
    if (!editingEntity) return;
    setSubmitting(true);
    try {
      const values = editForm.getValues();
      const updateData: Record<string, string> = {};
      if (values.code) updateData.code = values.code;
      if (values.name) updateData.name = values.name;
      if (values.headquarters !== undefined) updateData.headquarters = values.headquarters || null as unknown as string;
      if (values.description !== undefined) updateData.description = values.description || null as unknown as string;

      const res = await fetch(`/api/${editingEntity.type}s/${editingEntity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: `${editingEntity.type.charAt(0).toUpperCase() + editingEntity.type.slice(1)} updated successfully` });
        setShowEditDialog(false);
        setEditingEntity(null);
        fetchHierarchy();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update ${editingEntity?.type}` });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handler
  const openDeleteDialog = (type: EntityType, id: string, name: string, code: string, childCount: number, childLabel: string) => {
    setDeleteTarget({ type, id, name, code, childCount, childLabel });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/${deleteTarget.type}s/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: `${deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1)} deleted successfully` });
        setDeleteTarget(null);
        fetchHierarchy();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to delete ${deleteTarget?.type}` });
    } finally {
      setDeleting(false);
    }
  };

  // Permissions
  const canCreateDivision = user?.role === Role.GENERAL_CONFERENCE_ADMIN;
  const canEditDivision = user?.role === Role.GENERAL_CONFERENCE_ADMIN;
  const canDeleteDivision = user?.role === Role.GENERAL_CONFERENCE_ADMIN;

  const canCreateUnion = user?.role === Role.GENERAL_CONFERENCE_ADMIN || user?.role === Role.DIVISION_ADMIN;
  const canEditUnion = user?.role === Role.GENERAL_CONFERENCE_ADMIN || user?.role === Role.DIVISION_ADMIN;
  const canDeleteUnion = user?.role === Role.GENERAL_CONFERENCE_ADMIN;

  const canCreateConference = user?.role === Role.GENERAL_CONFERENCE_ADMIN ||
                              user?.role === Role.DIVISION_ADMIN ||
                              user?.role === Role.UNION_ADMIN;
  const canEditConference = user?.role === Role.GENERAL_CONFERENCE_ADMIN ||
                             user?.role === Role.DIVISION_ADMIN ||
                             user?.role === Role.UNION_ADMIN;
  const canDeleteConference = user?.role === Role.GENERAL_CONFERENCE_ADMIN || user?.role === Role.DIVISION_ADMIN;

  const canCreateChurch = user?.role !== Role.MEMBER && user?.role !== Role.CHURCH_PASTOR && user?.role !== Role.CHURCH_CLERK;
  const canEditChurch = user?.role !== Role.MEMBER && user?.role !== Role.CHURCH_PASTOR && user?.role !== Role.CHURCH_CLERK;
  const canDeleteChurch = user?.role === Role.GENERAL_CONFERENCE_ADMIN || user?.role === Role.DIVISION_ADMIN || user?.role === Role.UNION_ADMIN;

  const entityLabel = (type: EntityType) => type.charAt(0).toUpperCase() + type.slice(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Church Hierarchy</h1>
          <p className="text-gray-500 mt-1">
            Manage divisions, unions, conferences, and churches
          </p>
        </div>
        {canCreateDivision && (
          <Dialog open={showDivisionDialog} onOpenChange={setShowDivisionDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Division
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Division</DialogTitle>
                <DialogDescription>Add a new division to the hierarchy</DialogDescription>
              </DialogHeader>
              <form onSubmit={divisionForm.handleSubmit(createDivision)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Code</label>
                    <Input {...divisionForm.register('code')} placeholder="EUD" className="uppercase" />
                    {divisionForm.formState.errors.code && (
                      <p className="text-red-500 text-xs mt-1">{divisionForm.formState.errors.code.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input {...divisionForm.register('name')} placeholder="Euro-Asia Division" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Headquarters</label>
                  <Input {...divisionForm.register('headquarters')} placeholder="City, Country" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea {...divisionForm.register('description')} placeholder="Optional description..." rows={2} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Division
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Hierarchy Tree */}
      <div className="space-y-2">
        {divisions.map(division => (
          <Collapsible
            key={division.id}
            open={expandedDivisions.has(division.id)}
            onOpenChange={() => toggleDivision(division.id)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedDivisions.has(division.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{division.name}</CardTitle>
                        <CardDescription>
                          {division.code} • {division.unionCount || 0} Unions
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {canCreateUnion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDivisionId(division.id);
                            unionForm.setValue('divisionId', division.id);
                            setShowUnionDialog(true);
                          }}
                          title="Add union"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                      {canEditDivision && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-blue-600"
                          onClick={() => openEditDialog('division', division.id, {
                            code: division.code,
                            name: division.name,
                            headquarters: division.headquarters || '',
                            description: division.description || '',
                          })}
                          title="Edit division"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteDivision && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-red-600"
                          onClick={() => openDeleteDialog('division', division.id, division.name, division.code, division.unionCount || 0, 'union(s)')}
                          title="Delete division"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pl-12">
                  {division.unions?.map(union => (
                    <Collapsible
                      key={union.id}
                      open={expandedUnions.has(union.id)}
                      onOpenChange={() => toggleUnion(union.id)}
                    >
                      <div className="border-l-2 border-emerald-200 pl-4 py-2">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <div className="flex items-center gap-2">
                              {expandedUnions.has(union.id) ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                              <div className="h-8 w-8 bg-teal-100 rounded flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-teal-600" />
                              </div>
                              <div>
                                <p className="font-medium">{union.name}</p>
                                <p className="text-xs text-gray-500">{union.code}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {canCreateConference && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUnionId(union.id);
                                    conferenceForm.setValue('unionId', union.id);
                                    setShowConferenceDialog(true);
                                  }}
                                  title="Add conference"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                              {canEditUnion && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-500 hover:text-blue-600"
                                  onClick={() => openEditDialog('union', union.id, {
                                    code: union.code,
                                    name: union.name,
                                    headquarters: union.headquarters || '',
                                    description: union.description || '',
                                  })}
                                  title="Edit union"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDeleteUnion && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-500 hover:text-red-600"
                                  onClick={() => openDeleteDialog('union', union.id, union.name, union.code, union.conferenceCount || 0, 'conference(s)')}
                                  title="Delete union"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-6 mt-2 space-y-1">
                            {union.conferences?.map(conference => (
                              <Collapsible
                                key={conference.id}
                                open={expandedConferences.has(conference.id)}
                                onOpenChange={() => toggleConference(conference.id)}
                              >
                                <div className="border-l-2 border-teal-200 pl-4 py-1">
                                  <CollapsibleTrigger asChild>
                                    <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded">
                                      <div className="flex items-center gap-2">
                                        {expandedConferences.has(conference.id) ? (
                                          <ChevronDown className="h-4 w-4 text-gray-400" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-gray-400" />
                                        )}
                                        <div className="h-8 w-8 bg-cyan-100 rounded flex items-center justify-center">
                                          <Building2 className="h-4 w-4 text-cyan-600" />
                                        </div>
                                        <div>
                                          <p className="font-medium">{conference.name}</p>
                                          <p className="text-xs text-gray-500">{conference.code}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        {canCreateChurch && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedConferenceId(conference.id);
                                              churchForm.setValue('conferenceId', conference.id);
                                              setShowChurchDialog(true);
                                            }}
                                            title="Add church"
                                          >
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        )}
                                        {canEditConference && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-500 hover:text-blue-600"
                                            onClick={() => openEditDialog('conference', conference.id, {
                                              code: conference.code,
                                              name: conference.name,
                                              headquarters: conference.headquarters || '',
                                              description: conference.description || '',
                                            })}
                                            title="Edit conference"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        )}
                                        {canDeleteConference && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-500 hover:text-red-600"
                                            onClick={() => openDeleteDialog('conference', conference.id, conference.name, conference.code, conference.churchCount || 0, 'church(es)')}
                                            title="Delete conference"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="ml-6 mt-2 space-y-1">
                                      {conference.churches?.map(church => (
                                        <div
                                          key={church.id}
                                          className="flex items-center justify-between gap-2 p-2 hover:bg-gray-50 rounded border-l-2 border-cyan-200 pl-4"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 bg-blue-100 rounded flex items-center justify-center">
                                              <Building2 className="h-3 w-3 text-blue-600" />
                                            </div>
                                            <div>
                                              <p className="text-sm font-medium">{church.name}</p>
                                              <p className="text-xs text-gray-500">
                                                {church.code} • {church.city && `${church.city}, `}{church.country}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {canEditChurch && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 text-gray-500 hover:text-blue-600"
                                                onClick={() => openEditDialog('church', church.id, {
                                                  code: church.code,
                                                  name: church.name,
                                                  headquarters: church.address || '',
                                                  description: church.city ? `${church.city}, ${church.country || ''}` : '',
                                                })}
                                                title="Edit church"
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                            )}
                                            {canDeleteChurch && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 text-gray-500 hover:text-red-600"
                                                onClick={() => openDeleteDialog('church', church.id, church.name, church.code, 0, 'child records')}
                                                title="Delete church"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {(!conference.churches || conference.churches.length === 0) && (
                                        <p className="text-sm text-gray-400 p-2">No churches</p>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            ))}
                            {(!union.conferences || union.conferences.length === 0) && (
                              <p className="text-sm text-gray-400 p-2">No conferences</p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                  {(!division.unions || division.unions.length === 0) && (
                    <p className="text-sm text-gray-400 p-4">No unions</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Union Dialog */}
      <Dialog open={showUnionDialog} onOpenChange={setShowUnionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Union</DialogTitle>
            <DialogDescription>Add a new union to this division</DialogDescription>
          </DialogHeader>
          <form onSubmit={unionForm.handleSubmit(createUnion)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Code</label>
                <Input {...unionForm.register('code')} placeholder="UKU" className="uppercase" />
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input {...unionForm.register('name')} placeholder="Ukrainian Union" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Headquarters</label>
              <Input {...unionForm.register('headquarters')} placeholder="City, Country" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea {...unionForm.register('description')} placeholder="Optional description..." rows={2} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Union
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Conference Dialog */}
      <Dialog open={showConferenceDialog} onOpenChange={setShowConferenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Conference</DialogTitle>
            <DialogDescription>Add a new conference to this union</DialogDescription>
          </DialogHeader>
          <form onSubmit={conferenceForm.handleSubmit(createConference)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Code</label>
                <Input {...conferenceForm.register('code')} placeholder="SEC" className="uppercase" />
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input {...conferenceForm.register('name')} placeholder="South England Conference" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Headquarters</label>
              <Input {...conferenceForm.register('headquarters')} placeholder="City, Country" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea {...conferenceForm.register('description')} placeholder="Optional description..." rows={2} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Conference
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Church Dialog */}
      <Dialog open={showChurchDialog} onOpenChange={setShowChurchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Church</DialogTitle>
            <DialogDescription>Add a new church to this conference</DialogDescription>
          </DialogHeader>
          <form onSubmit={churchForm.handleSubmit(createChurch)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Code</label>
                <Input {...churchForm.register('code')} placeholder="001" />
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input {...churchForm.register('name')} placeholder="London Central SDA Church" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input {...churchForm.register('address')} placeholder="Street Address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <Input {...churchForm.register('city')} placeholder="London" />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <Input {...churchForm.register('country')} placeholder="United Kingdom" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Church
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (generic for all entity types) */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditingEntity(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingEntity ? entityLabel(editingEntity.type) : ''}</DialogTitle>
            <DialogDescription>
              Update {editingEntity?.type} {editingEntity?.data.code} ({editingEntity?.data.name})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Code</label>
                <Input {...editForm.register('code')} placeholder="Code" className="uppercase" />
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input {...editForm.register('name')} placeholder="Name" />
              </div>
            </div>
            {editingEntity?.type !== 'church' && (
              <div>
                <label className="text-sm font-medium">Headquarters</label>
                <Input {...editForm.register('headquarters')} placeholder="City, Country" />
              </div>
            )}
            {editingEntity?.type === 'church' && (
              <>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Input {...editForm.register('headquarters')} placeholder="Street Address" />
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input {...editForm.register('description')} placeholder="City, Country" />
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget ? entityLabel(deleteTarget.type) : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})?
              {deleteTarget && deleteTarget.childCount > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Warning: This {deleteTarget.type} has {deleteTarget.childCount} {deleteTarget.childLabel}. Delete child entities first.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || (deleteTarget !== null && deleteTarget.childCount > 0)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete {deleteTarget ? entityLabel(deleteTarget.type) : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
