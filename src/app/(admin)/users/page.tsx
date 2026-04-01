'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Shield,
  Plus,
  Loader2,
  MoreHorizontal,
  UserCheck,
  UserX,
  Search,
  Filter,
  Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Role } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

const userCreateSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name is required'),
  role: z.nativeEnum(Role),
  divisionId: z.string().optional(),
  unionId: z.string().optional(),
  conferenceId: z.string().optional(),
  churchId: z.string().optional(),
});

type UserCreateFormValues = z.infer<typeof userCreateSchema>;

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  division?: { id: string; code: string; name: string } | null;
  union?: { id: string; code: string; name: string } | null;
  conference?: { id: string; code: string; name: string } | null;
  church?: { id: string; code: string; name: string } | null;
}

interface Division {
  id: string;
  code: string;
  name: string;
}

interface Union {
  id: string;
  code: string;
  name: string;
  divisionId: string;
}

interface Conference {
  id: string;
  code: string;
  name: string;
  unionId: string;
}

interface Church {
  id: string;
  code: string;
  name: string;
  conferenceId: string;
}

const ROLE_HIERARCHY: Record<Role, number> = {
  GENERAL_CONFERENCE_ADMIN: 6,
  DIVISION_ADMIN: 5,
  UNION_ADMIN: 4,
  CONFERENCE_ADMIN: 3,
  CHURCH_PASTOR: 2,
  CHURCH_CLERK: 1,
  MEMBER: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRoleLabel(role: Role): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getRoleBadgeVariant(role: Role): string {
  switch (role) {
    case Role.GENERAL_CONFERENCE_ADMIN:
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case Role.DIVISION_ADMIN:
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case Role.UNION_ADMIN:
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case Role.CONFERENCE_ADMIN:
      return 'bg-teal-100 text-teal-800 border-teal-200';
    case Role.CHURCH_PASTOR:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case Role.CHURCH_CLERK:
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case Role.MEMBER:
      return 'bg-gray-100 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function formatLastLogin(date: string | null): string {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function getScopeLabel(user: UserItem): string {
  if (user.church) return user.church.name;
  if (user.conference) return user.conference.name;
  if (user.union) return user.union.name;
  if (user.division) return user.division.name;
  return 'Global';
}

function getScopePath(user: UserItem): string {
  const parts: string[] = [];
  if (user.division) parts.push(user.division.name);
  if (user.union) parts.push(user.union.name);
  if (user.conference) parts.push(user.conference.name);
  if (user.church) parts.push(user.church.name);
  return parts.join(' › ') || 'Global';
}

// ─── Pagination helper ───────────────────────────────────────────────────────

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (currentPage > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis');
  }

  pages.push(totalPages);

  return pages;
}

// ─── Skeleton Component ──────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();

  // List state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Hierarchy data for create dialog
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'activate' | 'deactivate';
    userId: string;
    userName: string;
  } | null>(null);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  // Form
  const form = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      role: Role.MEMBER,
    },
  });

  // ─── Fetch users ─────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        setUsers(result.data.users);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, roleFilter, statusFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  // ─── Fetch hierarchy data ────────────────────────────────────────────────

  useEffect(() => {
    async function fetchHierarchy() {
      try {
        const [divRes, unionRes, confRes, churchRes] = await Promise.all([
          fetch('/api/divisions'),
          fetch('/api/unions'),
          fetch('/api/conferences'),
          fetch('/api/churches'),
        ]);

        if (divRes.ok) { const d = await divRes.json(); setDivisions(d.data || []); }
        if (unionRes.ok) { const d = await unionRes.json(); setUnions(d.data || []); }
        if (confRes.ok) { const d = await confRes.json(); setConferences(d.data || []); }
        if (churchRes.ok) { const d = await churchRes.json(); setChurches(d.data || []); }
      } catch (error) {
        console.error('Error fetching hierarchy:', error);
      }
    }
    fetchHierarchy();
  }, []);

  // ─── Reset form fields on role change ────────────────────────────────────

  useEffect(() => {
    form.setValue('divisionId', '');
    form.setValue('unionId', '');
    form.setValue('conferenceId', '');
    form.setValue('churchId', '');
    setSelectedDivisionId('');
  }, [selectedRole, form]);

  // ─── Search handler ──────────────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  // ─── Create user ────────────────────────────────────────────────────────

  const onSubmitCreate = async (data: UserCreateFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: 'Success', description: 'User created successfully' });
        setShowCreateDialog(false);
        form.reset();
        setSelectedRole('');
        fetchUsers();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create user' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Toggle active/inactive ─────────────────────────────────────────────

  const handleToggleActive = async () => {
    if (!confirmAction) return;
    const { type, userId, userName } = confirmAction;
    setTogglingUser(userId);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: type === 'activate' }),
      });
      const result = await res.json();

      if (result.success) {
        toast({
          title: type === 'activate' ? 'User Activated' : 'User Deactivated',
          description: `${userName} has been ${type === 'activate' ? 'activated' : 'deactivated'}`,
        });
        fetchUsers();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user' });
    } finally {
      setTogglingUser(null);
      setConfirmAction(null);
    }
  };

  // ─── Permission helpers ─────────────────────────────────────────────────

  const canManageUser = (targetRole: Role): boolean => {
    if (!currentUser) return false;
    return ROLE_HIERARCHY[currentUser.role] > ROLE_HIERARCHY[targetRole];
  };

  const availableRolesForCreate = (): Role[] => {
    if (!currentUser) return [];
    const myLevel = ROLE_HIERARCHY[currentUser.role];
    // Can create users with role strictly lower than own
    return Object.values(Role).filter((r) => ROLE_HIERARCHY[r] < myLevel);
  };

  // ─── Filtered hierarchy for form ─────────────────────────────────────────

  const filteredUnions = selectedDivisionId
    ? unions.filter((u) => u.divisionId === selectedDivisionId)
    : unions;

  const selectedUnionId = form.watch('unionId');
  const filteredConferences = selectedUnionId
    ? conferences.filter((c) => c.unionId === selectedUnionId)
    : conferences;

  const selectedConferenceId = form.watch('conferenceId');
  const filteredChurches = selectedConferenceId
    ? churches.filter((c) => c.conferenceId === selectedConferenceId)
    : churches;

  const hasActiveFilters = searchQuery || roleFilter || statusFilter;
  const clearFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setRoleFilter('');
    setStatusFilter('');
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="outline" size="default">
                Search
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.values(Role).map((r) => (
                    <SelectItem key={r} value={r}>
                      {getRoleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Accounts
              {!loading && total > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({total} {total === 1 ? 'user' : 'users'})
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">User</TableHead>
                  <TableHead className="min-w-[120px]">Role</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[160px]">Scope</TableHead>
                  <TableHead className="min-w-[90px]">Status</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[100px]">Last Login</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton />
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Users className="h-8 w-8" />
                        <p>No users found</p>
                        {hasActiveFilters && (
                          <Button variant="link" size="sm" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const manageable = canManageUser(user.role);
                    return (
                      <TableRow
                        key={user.id}
                        className={!user.isActive ? 'opacity-60' : ''}
                      >
                        {/* User info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold shrink-0">
                              {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {user.fullName}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getRoleBadgeVariant(user.role)}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>

                        {/* Scope */}
                        <TableCell className="hidden md:table-cell">
                          <p className="text-sm text-gray-700 truncate max-w-[200px]" title={getScopePath(user)}>
                            {getScopePath(user)}
                          </p>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.isActive
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>

                        {/* Last Login */}
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-gray-500">
                            {formatLastLogin(user.lastLoginAt)}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          {manageable && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {user.isActive ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirmAction({
                                        type: 'deactivate',
                                        userId: user.id,
                                        userName: user.fullName,
                                      })
                                    }
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirmAction({
                                        type: 'activate',
                                        userId: user.id,
                                        userName: user.fullName,
                                      })
                                    }
                                    className="text-green-600 focus:text-green-600"
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Showing {startItem}–{endItem} of {total}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {getPageNumbers(page, totalPages).map((p, idx) =>
                    p === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                          isActive={page === p}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) setPage(page + 1);
                      }}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the platform. They will be assigned the selected role and scope.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <Input
                {...form.register('fullName')}
                placeholder="John Smith"
                disabled={submitting}
              />
              {form.formState.errors.fullName && (
                <p className="text-sm text-red-500">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                {...form.register('email')}
                placeholder="email@example.com"
                disabled={submitting}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input
                type="password"
                {...form.register('password')}
                placeholder="Min 8 characters"
                disabled={submitting}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select
                onValueChange={(v) => {
                  form.setValue('role', v as Role);
                  setSelectedRole(v as Role);
                }}
                defaultValue={Role.MEMBER}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRolesForCreate().map((r) => (
                    <SelectItem key={r} value={r}>
                      {getRoleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scope assignment based on role */}
            {selectedRole && selectedRole !== Role.GENERAL_CONFERENCE_ADMIN && (
              <div className="space-y-3 rounded-lg border p-3 bg-gray-50">
                <p className="text-sm font-medium text-gray-600">Scope Assignment</p>

                {(selectedRole === Role.DIVISION_ADMIN ||
                  selectedRole === Role.UNION_ADMIN ||
                  selectedRole === Role.CONFERENCE_ADMIN ||
                  selectedRole === Role.CHURCH_PASTOR ||
                  selectedRole === Role.CHURCH_CLERK ||
                  selectedRole === Role.MEMBER) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Division</label>
                    <Select
                      onValueChange={(v) => {
                        form.setValue('divisionId', v);
                        setSelectedDivisionId(v);
                      }}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {divisions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(selectedRole === Role.UNION_ADMIN ||
                  selectedRole === Role.CONFERENCE_ADMIN ||
                  selectedRole === Role.CHURCH_PASTOR ||
                  selectedRole === Role.CHURCH_CLERK ||
                  selectedRole === Role.MEMBER) &&
                  selectedDivisionId && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Union</label>
                      <Select
                        onValueChange={(v) => form.setValue('unionId', v)}
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select union" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredUnions.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                {(selectedRole === Role.CONFERENCE_ADMIN ||
                  selectedRole === Role.CHURCH_PASTOR ||
                  selectedRole === Role.CHURCH_CLERK ||
                  selectedRole === Role.MEMBER) &&
                  selectedUnionId && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Conference</label>
                      <Select
                        onValueChange={(v) => form.setValue('conferenceId', v)}
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select conference" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredConferences.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                {(selectedRole === Role.CHURCH_PASTOR ||
                  selectedRole === Role.CHURCH_CLERK ||
                  selectedRole === Role.MEMBER) &&
                  selectedConferenceId && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Church</label>
                      <Select
                        onValueChange={(v) => form.setValue('churchId', v)}
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select church" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredChurches.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Activate/Deactivate Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'activate'
                ? 'Activate User'
                : 'Deactivate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'activate'
                ? `Are you sure you want to activate ${confirmAction?.userName}? They will regain access to the platform.`
                : `Are you sure you want to deactivate ${confirmAction?.userName}? They will lose access to the platform immediately.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!togglingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              disabled={!!togglingUser}
              className={
                confirmAction?.type === 'deactivate'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }
            >
              {togglingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmAction?.type === 'activate' ? 'Activate' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
