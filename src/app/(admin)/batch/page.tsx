'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, Layers, Users, Award, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface Person {
  id: string;
  pid: string;
  fullName: string;
  email?: string;
  church?: { id: string; name: string } | null;
  baptismRecord?: { id: string; status: string } | null;
}

interface Church {
  id: string;
  name: string;
}

interface BaptismRecord {
  id: string;
  person: { id: string; fullName: string };
  church: { id: string; name: string };
  baptismDate: string;
  status: string;
  certificate?: { id: string; bcn: string } | null;
}

interface BatchJob {
  id: string;
  type: string;
  status: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdAt: string;
  completedAt?: string | null;
}

export default function BatchPage() {
  const { user } = useAuthStore();
  const [persons, setPersons] = useState<Person[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [approvedRecords, setApprovedRecords] = useState<BaptismRecord[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [baptismForm, setBaptismForm] = useState({
    churchId: '',
    pastorName: '',
    pastorTitle: '',
    baptismDate: '',
  });
  const [certForm, setCertForm] = useState({
    churchId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [progress, setProgress] = useState<{ active: boolean; message: string; value: number }>({
    active: false,
    message: '',
    value: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const [personsRes, churchesRes, recordsRes, jobsRes] = await Promise.all([
        fetch('/api/persons?limit=200'),
        fetch('/api/churches?limit=200'),
        fetch('/api/baptism-records?status=APPROVED&limit=200'),
        fetch('/api/batch-jobs'),
      ]);

      const personsData = await personsRes.json();
      const churchesData = await churchesRes.json();
      const recordsData = await recordsRes.json();
      const jobsData = await jobsRes.json();

      if (personsData.success) {
        // Filter persons without baptism records
        setPersons(personsData.data.filter((p: Person) => !p.baptismRecord));
      }
      if (churchesData.success) setChurches(churchesData.data);
      if (recordsData.success) {
        // Filter approved records without certificates
        setApprovedRecords(
          (recordsData.data || []).filter(
            (r: BaptismRecord) => r.status === 'APPROVED' && !r.certificate
          )
        );
      }
      if (jobsData.success) setBatchJobs(jobsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePerson = (personId: string) => {
    setSelectedPersons((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  };

  const toggleRecord = (recordId: string) => {
    setSelectedRecords((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId]
    );
  };

  const selectAllPersons = () => {
    setSelectedPersons(persons.map((p) => p.id));
  };

  const clearAllPersons = () => {
    setSelectedPersons([]);
  };

  const selectAllRecords = () => {
    setSelectedRecords(approvedRecords.map((r) => r.id));
  };

  const clearAllRecords = () => {
    setSelectedRecords([]);
  };

  const handleBatchBaptism = async () => {
    if (selectedPersons.length === 0 || !baptismForm.churchId || !baptismForm.pastorName || !baptismForm.baptismDate) {
      return;
    }

    setLoading(true);
    setProgress({ active: true, message: 'Creating batch baptism records...', value: 0 });

    const records = selectedPersons.map((personId) => ({
      personId,
      churchId: baptismForm.churchId,
      baptismDate: baptismForm.baptismDate,
      pastorName: baptismForm.pastorName,
      pastorTitle: baptismForm.pastorTitle || undefined,
    }));

    try {
      setProgress({ active: true, message: 'Processing records...', value: 30 });
      const res = await fetch('/api/baptism-records/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      const data = await res.json();
      setProgress({ active: true, message: 'Finalizing...', value: 90 });

      if (data.success) {
        setProgress({
          active: true,
          message: `Completed! ${data.data.successful} successful, ${data.data.failed} failed.`,
          value: 100,
        });
        setTimeout(() => {
          setProgress({ active: false, message: '', value: 0 });
          setSelectedPersons([]);
          fetchData();
        }, 3000);
      } else {
        setProgress({ active: false, message: data.error || 'Failed', value: 0 });
      }
    } catch (error) {
      setProgress({ active: false, message: 'An error occurred', value: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCertificates = async () => {
    if (selectedRecords.length === 0 && !certForm.churchId) return;

    setLoading(true);
    setProgress({ active: true, message: 'Generating batch certificates...', value: 0 });

    try {
      let body: Record<string, unknown>;
      if (selectedRecords.length > 0) {
        body = { baptismRecordIds: selectedRecords };
      } else {
        body = {
          churchId: certForm.churchId,
          dateFrom: certForm.dateFrom,
          dateTo: certForm.dateTo,
        };
      }

      setProgress({ active: true, message: 'Processing certificates...', value: 30 });
      const res = await fetch('/api/certificates/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setProgress({ active: true, message: 'Finalizing...', value: 90 });

      if (data.success) {
        setProgress({
          active: true,
          message: `Completed! ${data.data.successful} certificates generated, ${data.data.failed} failed.`,
          value: 100,
        });
        setTimeout(() => {
          setProgress({ active: false, message: '', value: 0 });
          setSelectedRecords([]);
          fetchData();
        }, 3000);
      } else {
        setProgress({ active: false, message: data.error || 'Failed', value: 0 });
      }
    } catch (error) {
      setProgress({ active: false, message: 'An error occurred', value: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: React.ReactNode }> = {
      COMPLETED: { color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle2 className="h-3 w-3" /> },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      FAILED: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      PARTIALLY_COMPLETED: { color: 'bg-orange-100 text-orange-800', icon: <AlertTriangle className="h-3 w-3" /> },
    };
    const variant = variants[status] || variants.PENDING;
    return (
      <Badge className={`${variant.color} gap-1`} variant="secondary">
        {variant.icon}
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="h-7 w-7 text-emerald-600" />
          Batch Operations
        </h1>
        <p className="text-gray-500 mt-1">Process multiple records and certificates efficiently</p>
      </div>

      {/* Progress */}
      {progress.active && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
              <span className="text-sm font-medium text-emerald-800">{progress.message}</span>
            </div>
            <Progress value={progress.value} className="h-2" />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="baptism" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="baptism" className="gap-2">
            <Users className="h-4 w-4" />
            Batch Baptism Records
          </TabsTrigger>
          <TabsTrigger value="certificates" className="gap-2">
            <Award className="h-4 w-4" />
            Batch Certificates
          </TabsTrigger>
        </TabsList>

        {/* Batch Baptism Records Tab */}
        <TabsContent value="baptism">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Person Selection */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Select Persons</CardTitle>
                    <CardDescription>Choose persons to create baptism records for</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllPersons}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAllPersons}>
                      Clear
                    </Button>
                  </div>
                </div>
                <Badge variant="secondary" className="mt-2">
                  {selectedPersons.length} of {persons.length} selected
                </Badge>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {persons.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">
                      No eligible persons found (all have baptism records)
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>PID</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {persons.map((person) => (
                          <TableRow
                            key={person.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => togglePerson(person.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedPersons.includes(person.id)}
                                onCheckedChange={() => togglePerson(person.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{person.fullName}</TableCell>
                            <TableCell className="text-gray-500 font-mono text-sm">{person.pid}</TableCell>
                            <TableCell className="text-gray-500">{person.email || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Baptism Form */}
            <Card>
              <CardHeader>
                <CardTitle>Baptism Details</CardTitle>
                <CardDescription>Set common fields for all records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="church">Church *</Label>
                  <Select
                    value={baptismForm.churchId}
                    onValueChange={(val) => setBaptismForm({ ...baptismForm, churchId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select church" />
                    </SelectTrigger>
                    <SelectContent>
                      {churches.map((church) => (
                        <SelectItem key={church.id} value={church.id}>
                          {church.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pastorName">Pastor Name *</Label>
                  <Input
                    value={baptismForm.pastorName}
                    onChange={(e) => setBaptismForm({ ...baptismForm, pastorName: e.target.value })}
                    placeholder="Pastor's full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pastorTitle">Pastor Title</Label>
                  <Input
                    value={baptismForm.pastorTitle}
                    onChange={(e) => setBaptismForm({ ...baptismForm, pastorTitle: e.target.value })}
                    placeholder="e.g., Pastor, Elder, Rev."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baptismDate">Baptism Date *</Label>
                  <Input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={baptismForm.baptismDate}
                    onChange={(e) => setBaptismForm({ ...baptismForm, baptismDate: e.target.value })}
                  />
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleBatchBaptism}
                  disabled={
                    loading ||
                    selectedPersons.length === 0 ||
                    !baptismForm.churchId ||
                    !baptismForm.pastorName ||
                    !baptismForm.baptismDate
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Create {selectedPersons.length} Records
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Batch Certificates Tab */}
        <TabsContent value="certificates">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Record Selection */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Approved Records Without Certificates</CardTitle>
                    <CardDescription>Select records to generate certificates for</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllRecords}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAllRecords}>
                      Clear
                    </Button>
                  </div>
                </div>
                <Badge variant="secondary" className="mt-2">
                  {selectedRecords.length} of {approvedRecords.length} selected
                </Badge>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {approvedRecords.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">
                      No eligible records found (need approved records without certificates)
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Person Name</TableHead>
                          <TableHead>Church</TableHead>
                          <TableHead>Baptism Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedRecords.map((record) => (
                          <TableRow
                            key={record.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleRecord(record.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedRecords.includes(record.id)}
                                onCheckedChange={() => toggleRecord(record.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{record.person.fullName}</TableCell>
                            <TableCell className="text-gray-500">{record.church.name}</TableCell>
                            <TableCell className="text-gray-500">
                              {new Date(record.baptismDate).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Certificate Generation Options */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Options</CardTitle>
                <CardDescription>Generate by selection or date range</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-3 bg-gray-50">
                  <p className="text-sm font-medium mb-1">Manual Selection</p>
                  <p className="text-xs text-gray-500">
                    {selectedRecords.length} records selected from the table above
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or by date range</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certChurch">Church</Label>
                  <Select
                    value={certForm.churchId}
                    onValueChange={(val) => setCertForm({ ...certForm, churchId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select church" />
                    </SelectTrigger>
                    <SelectContent>
                      {churches.map((church) => (
                        <SelectItem key={church.id} value={church.id}>
                          {church.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input
                    type="date"
                    value={certForm.dateFrom}
                    onChange={(e) => setCertForm({ ...certForm, dateFrom: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input
                    type="date"
                    value={certForm.dateTo}
                    onChange={(e) => setCertForm({ ...certForm, dateTo: e.target.value })}
                  />
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleBatchCertificates}
                  disabled={loading || (selectedRecords.length === 0 && !certForm.churchId)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Generate Certificates
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Batch History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            Batch History
          </CardTitle>
          <CardDescription>Recent batch operation history</CardDescription>
        </CardHeader>
        <CardContent>
          {batchJobs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No batch jobs yet</p>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {job.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {job.type === 'baptism' ? 'Baptism' : 'Certificate'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>{job.totalItems}</TableCell>
                      <TableCell>{job.processedItems}</TableCell>
                      <TableCell>
                        {job.failedItems > 0 ? (
                          <span className="text-red-600 font-medium">{job.failedItems}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(job.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
