'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Area,
} from 'recharts';
import {
  FileBarChart,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  ArrowUpDown,
  Printer,
} from 'lucide-react';
import { Role } from '@prisma/client';

// Types
interface ReportSummary {
  totalBaptisms: number;
  approved: number;
  rejected: number;
  pending: number;
  growthRate: number;
  topMonth: string;
  topChurch: string;
}

interface MonthlyDataItem {
  month: string;
  monthNum: number;
  count: number;
  cumulative: number;
}

interface ChurchDataItem {
  churchName: string;
  city: string;
  count: number;
  percentage: number;
}

interface ConferenceDataItem {
  conferenceName: string;
  count: number;
  percentage: number;
}

interface YearOverYear {
  currentYear: number;
  previousYear: number;
  change: number;
  changePercentage: number;
}

interface ReportData {
  summary: ReportSummary;
  monthlyData: MonthlyDataItem[];
  churchData: ChurchDataItem[];
  conferenceData: ConferenceDataItem[];
  yearOverYear: YearOverYear;
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const reportRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [scopeType, setScopeType] = useState<string>('all');
  const [scopeId, setScopeId] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [sortField, setSortField] = useState<'count' | 'percentage'>('count');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Scope options
  const [scopeOptions, setScopeOptions] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchScopeOptions();
  }, [scopeType, user]);

  const fetchScopeOptions = useCallback(async () => {
    try {
      let url = '/api/hierarchy';
      let key = '';

      if (scopeType === 'conference') {
        url += '/conferences';
        key = 'conferences';
      } else if (scopeType === 'union') {
        url += '/unions';
        key = 'unions';
      } else if (scopeType === 'church') {
        url += '/churches';
        key = 'churches';
      } else {
        setScopeOptions([]);
        setScopeId('');
        return;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const items = data.data || data[key] || [];
        setScopeOptions(
          items.map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))
        );
      }
    } catch (error) {
      console.error('Error fetching scope options:', error);
    }
  }, [scopeType, user]);

  const generateReport = async () => {
    setLoading(true);
    setGenerated(true);
    try {
      let url = `/api/reports?year=${year}`;
      if (scopeType !== 'all' && scopeId) {
        url += `&${scopeType}Id=${scopeId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportData(data.data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!reportData || !reportRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Annual Baptism Report - ${year}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1f2937; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
          .header h1 { color: #065f46; font-size: 28px; margin-bottom: 8px; }
          .header p { color: #6b7280; font-size: 14px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 40px; }
          .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; }
          .summary-card .value { font-size: 32px; font-weight: 700; color: #065f46; }
          .summary-card .label { font-size: 13px; color: #6b7280; margin-top: 4px; }
          .section { margin-bottom: 30px; }
          .section h2 { font-size: 18px; color: #065f46; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { background-color: #f0fdf4; color: #065f46; padding: 10px 12px; text-align: left; border-bottom: 2px solid #d1d5db; }
          td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
          tr:last-child td { border-bottom: none; }
          .growth-positive { color: #059669; font-weight: 600; }
          .growth-negative { color: #ef4444; font-weight: 600; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Annual Baptism Report</h1>
          <p>Seventh-day Adventist Church — Year ${year}</p>
          <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="value">${reportData.summary.totalBaptisms}</div>
            <div class="label">Total Baptisms</div>
          </div>
          <div class="summary-card">
            <div class="value">${reportData.summary.approved}</div>
            <div class="label">Approved</div>
          </div>
          <div class="summary-card">
            <div class="value ${reportData.summary.growthRate >= 0 ? 'growth-positive' : 'growth-negative'}">
              ${reportData.summary.growthRate >= 0 ? '+' : ''}${reportData.summary.growthRate}%
            </div>
            <div class="label">Growth Rate</div>
          </div>
        </div>

        <div class="section">
          <h2>Key Insights</h2>
          <p><strong>Top Month:</strong> ${reportData.summary.topMonth}</p>
          <p><strong>Top Church:</strong> ${reportData.summary.topChurch}</p>
          <p><strong>Pending:</strong> ${reportData.summary.pending} | <strong>Rejected:</strong> ${reportData.summary.rejected}</p>
        </div>

        <div class="section">
          <h2>Monthly Performance</h2>
          <table>
            <thead>
              <tr><th>Month</th><th>Baptisms</th><th>Cumulative</th></tr>
            </thead>
            <tbody>
              ${reportData.monthlyData.map(m => `<tr><td>${m.month}</td><td>${m.count}</td><td>${m.cumulative}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Church Performance</h2>
          <table>
            <thead>
              <tr><th>#</th><th>Church</th><th>City</th><th>Baptisms</th><th>%</th></tr>
            </thead>
            <tbody>
              ${reportData.churchData.slice(0, 20).map((c, i) => `<tr><td>${i + 1}</td><td>${c.churchName}</td><td>${c.city}</td><td>${c.count}</td><td>${c.percentage}%</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        ${reportData.conferenceData.length > 0 ? `
        <div class="section">
          <h2>Conference Performance</h2>
          <table>
            <thead>
              <tr><th>Conference</th><th>Baptisms</th><th>%</th></tr>
            </thead>
            <tbody>
              ${reportData.conferenceData.map(c => `<tr><td>${c.conferenceName}</td><td>${c.count}</td><td>${c.percentage}%</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="section">
          <h2>Year-over-Year Comparison</h2>
          <p><strong>${reportData.yearOverYear.previousYear}:</strong> ${reportData.yearOverYear.previousYear} baptisms</p>
          <p><strong>${reportData.yearOverYear.currentYear}:</strong> ${reportData.yearOverYear.approved || reportData.summary.approved} baptisms</p>
          <p class="${reportData.yearOverYear.change >= 0 ? 'growth-positive' : 'growth-negative'}">
            Change: ${reportData.yearOverYear.change >= 0 ? '+' : ''}${reportData.yearOverYear.change} (${reportData.yearOverYear.changePercentage >= 0 ? '+' : ''}${reportData.yearOverYear.changePercentage}%)
          </p>
        </div>

        <div class="footer">
          <p>Generated by Adventify — Baptism Certificate Platform</p>
          <p>This report is for internal church use only.</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const toggleSort = (field: 'count' | 'percentage') => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedChurchData = reportData?.churchData
    ? [...reportData.churchData].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
      })
    : [];

  const canFilterByConference = user && [Role.UNION_ADMIN, Role.DIVISION_ADMIN, Role.GENERAL_CONFERENCE_ADMIN].includes(user.role);
  const canFilterByUnion = user && [Role.DIVISION_ADMIN, Role.GENERAL_CONFERENCE_ADMIN].includes(user.role);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Annual Reports</h1>
        <p className="text-gray-500 mt-1">
          Generate comprehensive annual baptism reports for your {getScopeLabel(user?.role)}.
        </p>
      </div>

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-emerald-600" />
            Report Configuration
          </CardTitle>
          <CardDescription>Select year and scope to generate a report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {/* Year Selector */}
            <div className="flex-1 w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Year</label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scope Filter */}
            <div className="flex-1 w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Scope</label>
              <Select value={scopeType} onValueChange={setScopeType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="church">Church</SelectItem>
                  {canFilterByConference && (
                    <SelectItem value="conference">Conference</SelectItem>
                  )}
                  {canFilterByUnion && (
                    <SelectItem value="union">Union</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Scope Selector (when specific scope chosen) */}
            {scopeType !== 'all' && scopeOptions.length > 0 && (
              <div className="flex-1 w-full sm:w-auto">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  {scopeType.charAt(0).toUpperCase() + scopeType.slice(1)}
                </label>
                <Select value={scopeId} onValueChange={setScopeId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select ${scopeType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={generateReport}
              disabled={loading || (scopeType !== 'all' && !scopeId)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {generated && loading && <ReportSkeleton />}
      {generated && !loading && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Download/Print Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>

          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600" />
                Executive Summary — {year}
              </CardTitle>
              <CardDescription>Key metrics for the selected year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricCard
                  icon={Users}
                  label="Total Baptisms"
                  value={reportData.summary.totalBaptisms}
                  color="emerald"
                />
                <MetricCard
                  icon={CheckCircle}
                  label="Approved"
                  value={reportData.summary.approved}
                  color="green"
                />
                <MetricCard
                  icon={Clock}
                  label="Pending"
                  value={reportData.summary.pending}
                  color="yellow"
                />
                <MetricCard
                  icon={XCircle}
                  label="Rejected"
                  value={reportData.summary.rejected}
                  color="red"
                />
                <MetricCard
                  icon={reportData.summary.growthRate >= 0 ? TrendingUp : TrendingDown}
                  label="Growth Rate"
                  value={`${reportData.summary.growthRate >= 0 ? '+' : ''}${reportData.summary.growthRate}%`}
                  color={reportData.summary.growthRate >= 0 ? 'green' : 'red'}
                />
                <MetricCard
                  icon={Award}
                  label="Top Month"
                  value={reportData.summary.topMonth}
                  color="emerald"
                />
              </div>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Top Performing Church:</span>{' '}
                  <span className="text-emerald-700 font-semibold">{reportData.summary.topChurch}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Baptism Trends</CardTitle>
              <CardDescription>Bar chart with cumulative line for {year}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={reportData.monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" name="Monthly Baptisms" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative" stroke="#059669" strokeWidth={2} dot={{ fill: '#059669', r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Year-over-Year Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Year-over-Year Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">{reportData.yearOverYear.previousYear}</p>
                  <p className="text-3xl font-bold text-gray-400">
                    {reportData.yearOverYear.change >= 0
                      ? reportData.yearOverYear.currentYear - (reportData.yearOverYear.change || 0)
                      : reportData.yearOverYear.currentYear + Math.abs(reportData.yearOverYear.change)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">baptisms</p>
                </div>
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold ${
                      reportData.yearOverYear.change >= 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {reportData.yearOverYear.change >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {reportData.yearOverYear.change >= 0 ? '+' : ''}
                    {reportData.yearOverYear.change} ({reportData.yearOverYear.changePercentage >= 0 ? '+' : ''}
                    {reportData.yearOverYear.changePercentage}%)
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">{reportData.yearOverYear.currentYear}</p>
                  <p className="text-3xl font-bold text-emerald-700">
                    {reportData.summary.approved}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">baptisms</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Church Performance Table */}
          {sortedChurchData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Church Performance</CardTitle>
                <CardDescription>Baptism counts by church — click column headers to sort</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Church</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead
                          className="text-center cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => toggleSort('count')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Baptisms
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-center cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => toggleSort('percentage')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            %
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedChurchData.map((church, index) => (
                        <TableRow key={church.churchName}>
                          <TableCell className="text-gray-400 font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">{church.churchName}</TableCell>
                          <TableCell className="text-gray-500">{church.city || '—'}</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                              {church.count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm text-gray-600">
                            {church.percentage}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conference Performance Table */}
          {reportData.conferenceData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conference Performance</CardTitle>
                <CardDescription>Baptism counts by conference</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conference</TableHead>
                      <TableHead className="text-center">Baptisms</TableHead>
                      <TableHead className="text-center">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.conferenceData.map((conf) => (
                      <TableRow key={conf.conferenceName}>
                        <TableCell className="font-medium">{conf.conferenceName}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            {conf.count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-600">
                          {conf.percentage}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty state */}
      {!generated && !loading && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <FileBarChart className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No Report Generated</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Select a year and optional scope filter, then click &quot;Generate Report&quot; to create your annual baptism report.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Metric Card ---
function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'emerald' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-lg ${colorClasses[color]} mb-2`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// --- Report Skeleton ---
function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <Skeleton className="h-10 w-10 rounded-lg mb-2" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-20 mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-52" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// --- Helpers ---
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
