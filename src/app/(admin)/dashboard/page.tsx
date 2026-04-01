'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  FileText,
  Award,
  Clock,
  TrendingUp,
  Church,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Role } from '@prisma/client';

interface DashboardStats {
  totalBaptisms: number;
  pendingApprovals: number;
  approvedBaptisms: number;
  recentBaptisms: number;
  growthPercentage: number;
  monthlyStats: Array<{ month: string; count: number }>;
  churchBreakdown: Array<{ churchId: string; churchName: string; total: number; pending: number; approved: number }>;
  year: number;
}

interface RecentRecord {
  id: string;
  person: { pid: string; fullName: string };
  church: { name: string };
  baptismDate: string;
  status: string;
  certificate?: { bcn: string } | null;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, recordsRes] = await Promise.all([
          fetch('/api/analytics'),
          fetch('/api/baptism-records?limit=5'),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.data);
        }

        if (recordsRes.ok) {
          const data = await recordsRes.json();
          setRecentRecords(data.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, {user?.fullName?.split(' ')[0]}! Here&apos;s an overview of your {getScopeLabel(user?.role)}.
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Baptisms"
            value={stats.totalBaptisms}
            description="All time records"
            icon={Users}
            color="emerald"
          />
          <StatsCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            description="Awaiting review"
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Approved This Year"
            value={stats.approvedBaptisms}
            description={`${stats.year} baptisms`}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title="Growth Rate"
            value={`${stats.growthPercentage > 0 ? '+' : ''}${stats.growthPercentage}%`}
            description="vs. previous year"
            icon={TrendingUp}
            color={stats.growthPercentage >= 0 ? 'green' : 'red'}
          />
        </div>
      )}

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        {stats && stats.monthlyStats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Baptisms - {stats.year}</CardTitle>
              <CardDescription>Baptism records by month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end gap-2">
                {stats.monthlyStats.map((item, index) => {
                  const maxCount = Math.max(...stats.monthlyStats.map((m) => m.count), 1);
                  const height = (item.count / maxCount) * 100;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center justify-end gap-1"
                    >
                      <span className="text-xs font-medium text-gray-600">
                        {item.count}
                      </span>
                      <div
                        className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-xs text-gray-400 mt-1">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Records */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Baptism Records</CardTitle>
            <CardDescription>Latest activity in your scope</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No baptism records yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {record.person.fullName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {record.church.name} • {formatDate(record.baptismDate)}
                      </p>
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Church Breakdown (for higher level admins) */}
      {stats?.churchBreakdown && stats.churchBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Church Statistics</CardTitle>
            <CardDescription>Top churches by baptism count</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Church</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.churchBreakdown.map((church) => (
                  <TableRow key={church.churchId}>
                    <TableCell className="font-medium">{church.churchName}</TableCell>
                    <TableCell className="text-center">{church.total}</TableCell>
                    <TableCell className="text-center">
                      {church.pending > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          {church.pending}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-100 text-green-700">
                        {church.approved}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  color: 'emerald' | 'yellow' | 'green' | 'red';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getScopeLabel(role?: Role): string {
  if (!role) return 'area';
  switch (role) {
    case Role.GENERAL_CONFERENCE_ADMIN:
      return 'global scope';
    case Role.DIVISION_ADMIN:
      return 'division';
    case Role.UNION_ADMIN:
      return 'union';
    case Role.CONFERENCE_ADMIN:
      return 'conference';
    case Role.CHURCH_ADMIN:
      return 'church';
    default:
      return 'area';
  }
}
