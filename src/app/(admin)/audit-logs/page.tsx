'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { Loader2, BarChart3, Filter, Shield, AlertCircle } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  } | null;
}

interface AuditLogsResponse {
  success: boolean;
  data: {
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}

const ITEMS_PER_PAGE = 20;

function TableSkeleton() {
  return (
    <div className="space-y-0">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/50">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-3 border-b">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', ITEMS_PER_PAGE.toString());
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (entityFilter !== 'all') params.set('entity', entityFilter);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const result: AuditLogsResponse = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to load audit logs');
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      setLogs(result.data.logs);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Network error. Please try again.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
  };

  const handleEntityFilterChange = (value: string) => {
    setEntityFilter(value);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-700 border-green-200',
      UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
      DELETE: 'bg-red-100 text-red-700 border-red-200',
      APPROVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      REJECT: 'bg-orange-100 text-orange-700 border-orange-200',
      LOGIN: 'bg-purple-100 text-purple-700 border-purple-200',
      LOGOUT: 'bg-gray-100 text-gray-700 border-gray-200',
      REGISTER: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      VIEW: 'bg-sky-100 text-sky-700 border-sky-200',
      DOWNLOAD: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      GENERATE: 'bg-teal-100 text-teal-700 border-teal-200',
    };
    return colors[action] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getEntityBadge = (entity: string) => {
    const colors: Record<string, string> = {
      User: 'bg-violet-50 text-violet-700 border-violet-200',
      Division: 'bg-amber-50 text-amber-700 border-amber-200',
      Union: 'bg-pink-50 text-pink-700 border-pink-200',
      Conference: 'bg-lime-50 text-lime-700 border-lime-200',
      Church: 'bg-orange-50 text-orange-700 border-orange-200',
      Person: 'bg-sky-50 text-sky-700 border-sky-200',
      BaptismRecord: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Certificate: 'bg-teal-50 text-teal-700 border-teal-200',
    };
    return colors[entity] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const formatDetails = (details: string | undefined | null) => {
    if (!details) return '-';
    try {
      const parsed = JSON.parse(details);
      if (parsed.message) return parsed.message;
      if (parsed.personName) return `Person: ${parsed.personName}`;
      if (parsed.fullName) return `Name: ${parsed.fullName}`;
      if (parsed.email) return `Email: ${parsed.email}`;
      // Show first few meaningful keys
      const entries = Object.entries(parsed).slice(0, 3);
      return entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ');
    } catch {
      return details.length > 50 ? details.substring(0, 50) + '...' : details;
    }
  };

  // Build pagination page numbers
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track all system activities and changes</p>
        </div>
        {!loading && !error && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield className="h-4 w-4" />
            <span>{total} log{total !== 1 ? 's' : ''} found</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Filter className="h-4 w-4" />
              <span>Filters:</span>
            </div>
            <Select value={actionFilter} onValueChange={handleActionFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="APPROVE">Approve</SelectItem>
                <SelectItem value="REJECT">Reject</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
                <SelectItem value="REGISTER">Register</SelectItem>
                <SelectItem value="VIEW">View</SelectItem>
                <SelectItem value="DOWNLOAD">Download</SelectItem>
                <SelectItem value="GENERATE">Generate</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={handleEntityFilterChange}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Division">Division</SelectItem>
                <SelectItem value="Union">Union</SelectItem>
                <SelectItem value="Conference">Conference</SelectItem>
                <SelectItem value="Church">Church</SelectItem>
                <SelectItem value="Person">Person</SelectItem>
                <SelectItem value="BaptismRecord">Baptism Record</SelectItem>
                <SelectItem value="Certificate">Certificate</SelectItem>
              </SelectContent>
            </Select>

            {(actionFilter !== 'all' || entityFilter !== 'all') && (
              <button
                onClick={() => {
                  setActionFilter('all');
                  setEntityFilter('all');
                  setPage(1);
                }}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-2">
              <TableSkeleton />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-gray-600 font-medium">{error}</p>
              <button
                onClick={fetchLogs}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Try again
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No audit logs available</p>
              <p className="text-sm text-gray-400 mt-1">
                {(actionFilter !== 'all' || entityFilter !== 'all')
                  ? 'No logs match the current filters'
                  : 'Activity will appear here as actions are performed'}
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[180px]">User</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                      <TableHead className="w-[130px]">Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="w-[140px]">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <div>
                              <p className="font-medium text-sm">{log.user.fullName}</p>
                              <p className="text-xs text-gray-500">{log.user.email}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Deleted user</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold ${getActionBadge(log.action)}`}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getEntityBadge(log.entity)}`}
                          >
                            {log.entity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                          <span title={log.details || undefined}>
                            {formatDetails(log.details)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-gray-400 whitespace-nowrap">
                          {log.ipAddress || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-gray-500">
                    Showing {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className={page <= 1 ? 'pointer-events-none opacity-50 cursor-default' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {getPageNumbers().map((pageNum, idx) =>
                        pageNum === 'ellipsis' ? (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setPage(pageNum)}
                              isActive={pageNum === page}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className={page >= totalPages ? 'pointer-events-none opacity-50 cursor-default' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
