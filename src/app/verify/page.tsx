'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Church, QrCode, Search, ArrowRight } from 'lucide-react';

const verifySchema = z.object({
  bcn: z.string().min(10, 'Please enter a valid certificate number'),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export default function VerifyPage() {
  const router = useRouter();

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      bcn: '',
    },
  });

  const onSubmit = (data: VerifyFormValues) => {
    const bcn = data.bcn.trim().toUpperCase();
    router.push(`/verify/${bcn}`);
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

      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
            <QrCode className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verify Certificate
          </h1>
          <p className="text-gray-600">
            Enter a baptism certificate number to verify its authenticity
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bcn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="EUD-UKU-SEC-001-2024-000001"
                          className="font-mono uppercase"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Verify Certificate
                </Button>
              </form>
            </Form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 text-center mb-3">
                Certificate Number Format
              </p>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-center">
                <span className="text-emerald-600">DIV</span>-
                <span className="text-teal-600">UNI</span>-
                <span className="text-cyan-600">CON</span>-
                <span className="text-blue-600">CH</span>-
                <span className="text-indigo-600">YEAR</span>-
                <span className="text-purple-600">SERIAL</span>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                Division - Union - Conference - Church - Year - Serial
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Or scan a QR code from a printed certificate
          </p>
          <div className="inline-flex items-center gap-2 text-emerald-600">
            <ArrowRight className="h-4 w-4" />
            <span className="text-sm">Use your phone camera to scan</span>
          </div>
        </div>
      </main>
    </div>
  );
}
