'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Church, QrCode, Search, ArrowRight, Shield, Loader2 } from 'lucide-react';

const verifySchema = z.object({
  bcn: z.string().min(10, 'Please enter a valid certificate number (at least 10 characters)'),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export default function VerifyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      bcn: '',
    },
  });

  const onSubmit = (data: VerifyFormValues) => {
    setIsSubmitting(true);
    const bcn = data.bcn.trim().toUpperCase();
    router.push(`/verify/${bcn}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                <Church className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-emerald-700">ADVENTIFY</span>
                <p className="text-xs text-gray-400 -mt-0.5">Baptism Certificate Verification</p>
              </div>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-2xl mb-5 shadow-sm">
              <Shield className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Verify Certificate
            </h1>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
              Enter a baptism certificate number to verify its authenticity and status
            </p>
          </div>

          {/* Verification Form Card */}
          <Card className="shadow-xl border-0 shadow-emerald-100/50">
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="bcn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          Certificate Number (BCN)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              placeholder="EUD-UKU-SEC-001-2024-000001"
                              className="font-mono uppercase pl-11 h-13 text-base border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold shadow-lg shadow-emerald-200 transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-5 w-5 mr-2" />
                        Verify Certificate
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              {/* Format Guide */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-500 text-center mb-3 font-medium">
                  Certificate Number Format
                </p>
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-center tracking-wide">
                  <span className="text-emerald-600">DIV</span>
                  <span className="text-gray-300 mx-1">-</span>
                  <span className="text-teal-600">UNI</span>
                  <span className="text-gray-300 mx-1">-</span>
                  <span className="text-cyan-600">CON</span>
                  <span className="text-gray-300 mx-1">-</span>
                  <span className="text-blue-600">CH</span>
                  <span className="text-gray-300 mx-1">-</span>
                  <span className="text-indigo-600">YEAR</span>
                  <span className="text-gray-300 mx-1">-</span>
                  <span className="text-purple-600">SERIAL</span>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Division &middot; Union &middot; Conference &middot; Church &middot; Year &middot; Serial
                </p>
              </div>
            </CardContent>
          </Card>

          {/* QR Scan Hint */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-full px-6 py-3">
              <QrCode className="h-5 w-5 text-emerald-600" />
              <span className="text-sm text-gray-600">
                You can also scan a QR code from a printed certificate
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-emerald-100">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Church className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">ADVENTIFY</span>
          </div>
          <p className="text-xs text-gray-400">
            Powered by ADVENTIFY &mdash; Seventh-day Adventist Church
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Secure Baptism Certificate Verification System
          </p>
        </div>
      </footer>
    </div>
  );
}
