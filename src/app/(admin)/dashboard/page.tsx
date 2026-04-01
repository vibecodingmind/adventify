'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Plus,
  XCircle,
  LogIn,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Role } from '@prisma/client';

// Types
interface MonthlyStat {
  month: string;
  monthNum: number;
  year: number;
  count: number;
}

interface StatusItem {
  status: string;
  count: number;
}

interface YearlyItem {
  year: number;
  count: number;
}

interface TopChurch {
  churchId: string;
  churchName: string;
  city: string;
  country: string;
  baptismCount: number;
}

interface RecentActivityItem {
  id: string;
  action: string;
  entity: string;
  details: string;
  createdAt: string;
  userName: string;
}

interface GenderItem {
  gender: string;
  count: number;
}

interface AgeItem {
  range: string;
  count: number;
}

interface DashboardStats {
  totalBaptisms: number;
  pendingApprovals: number;
  approvedBaptisms: number;
  recentBaptisms: number;
  growthPercentage: number;
  monthlyStats: MonthlyStat[];
  churchBreakdown: Array<{ churchId: string; churchName: string; total: number; pending: number; approved: number }>;
  year: number;
  period: string;
  statusBreakdown: StatusItem[];
  conferenceBreakdown: Array<{ conferenceId: string; conferenceName: string; totalBaptisms: number; approvedBaptisms: number }>;
  yearlyComparison: YearlyItem[];
  topChurches: TopChurch[];
  recentActivity: RecentActivityItem[];
  genderBreakdown: GenderItem[];
  ageBreakdown: AgeItem[];
}

const EMERALD_COLORS = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'];
const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#10b981',
  PENDING: '#f59e0b',
  REJECTED: '#ef4444',
};
const GENDER_COLORS: Record<string, string> = {
  MALE: '#10b981',
  FEMALE: '#059669',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all_time');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics?period=${period}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [period]);

  const statusPieData = useMemo(() => {
    if (!stats?.statusBreakdown) return [];
    return stats.statusBreakdown.map((s) => ({
      name: s.status.charAt(0) + s.status.slice(1).toLowerCase(),
      value: s.count,
      color: STATUS_COLORS[s.status] || '#94a3b8',
    }));
  }, [stats?.statusBreakdown]);

  const genderData = useMemo(() => {
    if (!stats?.genderBreakdown) return [];
    return stats.genderBreakdown.map((g) => ({
      gender: g.gender === 'MALE' ? 'Male' : g.gender === 'FEMALE' ? 'Female' : g.gender,
      count: g.count,
      fill: GENDER_COLORS[g.gender] || '#94a3b8',
    }));
  }, [stats?.genderBreakdown]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {user?.fullName?.split(' ')[0]}! Here&apos;s an overview of your{' '}
            {getScopeLabel(user?.role)}.
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_time">All Time</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="this_quarter">This Quarter</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 1: Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Baptisms"
            value={stats.totalBaptisms}
            description={`${period.replace('_', ' ')} records`}
            icon={Users}
            trend={stats.growthPercentage >= 0 ? 'up' : 'down'}
            trendValue={stats.growthPercentage}
            color="emerald"
          />
          <StatsCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            description="Awaiting review"
            icon={Clock}
            color="yellow"
            link="/baptism-records?status=PENDING"
          />
          <StatsCard
            title="Approved This Year"
            value={stats.approvedBaptisms}
            description={`${stats.year} baptisms`}
            icon={CheckCircle}
            subtitle={stats.totalBaptisms > 0 ? `${Math.round((stats.approvedBaptisms / stats.totalBaptisms) * 100)}% of total` : undefined}
            color="green"
          />
          <StatsCard
            title="Growth Rate"
            value={`${stats.growthPercentage > 0 ? '+' : ''}${stats.growthPercentage}%`}
            description="vs. previous year"
            icon={stats.growthPercentage >= 0 ? TrendingUp : TrendingDown}
            trend={stats.growthPercentage >= 0 ? 'up' : 'down'}
            trendValue={Math.abs(stats.growthPercentage)}
            color={stats.growthPercentage >= 0 ? 'green' : 'red'}
          />
        </div>
      )}

      {/* Row 2: Monthly Trend (2/3) + Status Pie (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Baptism Trend - Area Chart */}
        {stats && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Baptism Trend</CardTitle>
              <CardDescription>Approved baptisms by month — {stats.year}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthlyStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#emeraldGradient)"
                      name="Baptisms"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Distribution - Donut/Pie */}
        {stats && statusPieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Distribution</CardTitle>
              <CardDescription>Records by approval status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-900">
                    {stats.totalBaptisms}
                  </span>
                  <span className="text-xs text-gray-500">Total</span>
                </div>
              </div>
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-2">
                {statusPieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900">({item.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 3: Year Comparison (1/2) + Gender + Age (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Year-over-Year Comparison */}
        {stats && stats.yearlyComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Year-over-Year Comparison</CardTitle>
              <CardDescription>Approved baptisms over the last 5 years</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.yearlyComparison} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Bar dataKey="count" name="Baptisms" radius={[4, 4, 0, 0]}>
                      {stats.yearlyComparison.map((_, index) => (
                        <Cell
                          key={`bar-${index}`}
                          fill={EMERALD_COLORS[index % EMERALD_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gender + Age Distribution */}
        <div className="space-y-6">
          {/* Gender Distribution - Horizontal Bar */}
          {stats && genderData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Gender Distribution</CardTitle>
                <CardDescription>Baptisms by gender</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genderData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                      <YAxis type="category" dataKey="gender" tick={{ fontSize: 12 }} stroke="#9ca3af" width={60} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                        {genderData.map((entry, index) => (
                          <Cell key={`gender-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Age Group Distribution */}
          {stats && stats.ageBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Age Group Distribution</CardTitle>
                <CardDescription>Baptisms by age range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.ageBreakdown} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="range" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                        {stats.ageBreakdown.map((_, index) => (
                          <Cell
                            key={`age-${index}`}
                            fill={EMERALD_COLORS[index % EMERALD_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Row 4: Top Churches (1/2) + Recent Activity (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Churches Table */}
        {stats && stats.topChurches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Churches</CardTitle>
              <CardDescription>Top 10 churches by baptism count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {stats.topChurches.map((church, index) => {
                  const maxCount = stats.topChurches[0]?.baptismCount || 1;
                  const percentage = (church.baptismCount / maxCount) * 100;
                  return (
                    <div key={church.churchId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            <span className="text-emerald-600 font-bold mr-2">#{index + 1}</span>
                            {church.churchName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {[church.city, church.country].filter(Boolean).join(', ')}
                          </p>
                        </div>
                        <span className="ml-3 text-sm font-semibold text-emerald-700">
                          {church.baptismCount}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Feed */}
        {stats && stats.recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest actions across the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {stats.recentActivity.slice(0, 10).map((activity) => {
                  const actionConfig = getActionConfig(activity.action);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div
                        className={`p-2 rounded-lg mt-0.5 ${actionConfig.bgColor}`}
                      >
                        <actionConfig.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{activity.userName}</span>{' '}
                          {actionConfig.description}{' '}
                          {activity.entity && (
                            <span className="text-gray-500">{activity.entity}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatTimestamp(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// --- Stats Card Component ---
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  color,
  subtitle,
  link,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: number;
  color: 'emerald' | 'yellow' | 'green' | 'red';
  subtitle?: string;
  link?: string;
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };

  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && trendValue !== undefined && (
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                trend === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trendValue}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{title}</p>
          <p className="text-xs text-gray-400">{description}</p>
          {subtitle && (
            <p className="text-xs text-emerald-600 font-medium mt-1">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}

// --- Helper functions ---
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
    case Role.CHURCH_PASTOR:
    case Role.CHURCH_CLERK:
      return 'church';
    default:
      return 'area';
  }
}

function getActionConfig(action: string) {
  const configs: Record<
    string,
    { icon: React.ElementType; description: string; bgColor: string }
  > = {
    CREATE: {
      icon: Plus,
      description: 'created a new',
      bgColor: 'bg-emerald-100 text-emerald-600',
    },
    APPROVE: {
      icon: CheckCircle,
      description: 'approved',
      bgColor: 'bg-green-100 text-green-600',
    },
    REJECT: {
      icon: XCircle,
      description: 'rejected',
      bgColor: 'bg-red-100 text-red-600',
    },
    LOGIN: {
      icon: LogIn,
      description: 'logged in',
      bgColor: 'bg-blue-100 text-blue-600',
    },
    UPDATE: {
      icon: FileText,
      description: 'updated',
      bgColor: 'bg-yellow-100 text-yellow-600',
    },
    DELETE: {
      icon: XCircle,
      description: 'deleted',
      bgColor: 'bg-red-100 text-red-600',
    },
  };

  return (
    configs[action] || {
      icon: FileText,
      description: action.toLowerCase(),
      bgColor: 'bg-gray-100 text-gray-600',
    }
  );
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// --- Loading Skeleton ---
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="mt-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32 mt-2" />
                <Skeleton className="h-3 w-28 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-56 w-full rounded-full mx-auto" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-52" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
