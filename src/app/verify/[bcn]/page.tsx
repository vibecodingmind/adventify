'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Shield,
  Church,
  Calendar,
  User,
  FileText,
  Loader2,
  QrCode,
} from 'lucide-react';

interface CertificateData {
  bcn: string;
  personName: string;
  baptismDate: string;
  churchName: string;
  churchLocation: string;
  pastorName: string;
  status: string;
  certificateDate: string;
}

export default function VerifyCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const bcn = params.bcn as string;

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [data, setData] = useState<CertificateData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyCertificate() {
      try {
        const response = await fetch(`/api/verify/${bcn}`);
        const result = await response.json();

        setVerified(result.verified);
        if (result.verified && result.data) {
          setData(result.data);
        } else {
          setError(result.error || 'Certificate not found');
        }
      } catch (err) {
        setVerified(false);
        setError('Failed to verify certificate');
      } finally {
        setLoading(false);
      }
    }

    if (bcn) {
      verifyCertificate();
    }
  }, [bcn]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Church className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-emerald-700">ADVENTIFY</span>
            </Link>
            <Link href="/login">
              <Button variant="outline">Admin Login</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {loading ? (
          <Card className="shadow-xl">
            <CardContent className="py-16 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-emerald-600 mb-4" />
              <p className="text-gray-600">Verifying certificate...</p>
            </CardContent>
          </Card>
        ) : verified && data ? (
          <Card className="shadow-xl border-0 overflow-hidden">
            {/* Success Header */}
            <div className="bg-emerald-600 px-6 py-8 text-center">
              <CheckCircle className="h-16 w-16 text-white mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">
                Certificate Verified
              </h1>
              <p className="text-emerald-100">
                This is a valid baptism certificate
              </p>
            </div>

            <CardContent className="p-6">
              {/* Certificate Number */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
                <p className="text-sm text-gray-500 mb-1">Certificate Number</p>
                <p className="font-mono text-lg font-semibold text-gray-900">
                  {data.bcn}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Baptized Person</p>
                    <p className="font-semibold text-gray-900">{data.personName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Baptism Date</p>
                    <p className="font-semibold text-gray-900">
                      {formatDate(data.baptismDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Church className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Church</p>
                    <p className="font-semibold text-gray-900">{data.churchName}</p>
                    <p className="text-sm text-gray-500">{data.churchLocation}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Officiating Minister</p>
                    <p className="font-semibold text-gray-900">{data.pastorName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Certificate Issued</p>
                    <p className="font-semibold text-gray-900">
                      {formatDate(data.certificateDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <Badge className="bg-green-100 text-green-700 text-sm px-4 py-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Official Record
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardContent className="py-16 text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Certificate Not Found
              </h1>
              <p className="text-gray-600 mb-6">
                {error || 'The certificate number you entered could not be verified.'}
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500">Certificate Number</p>
                <p className="font-mono font-semibold text-gray-900">{bcn}</p>
              </div>
              <Link href="/verify">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Try Another Certificate
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
