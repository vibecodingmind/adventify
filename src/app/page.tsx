'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';
import { Church, Shield, FileText, Award, QrCode } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  // Wait for hydration
  useEffect(() => {
    const timer = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.push('/');
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Church className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-emerald-700">ADVENTIFY</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/verify" className="text-sm text-gray-600 hover:text-emerald-600 hidden sm:block">
                Verify Certificate
              </Link>
              <Link href="/login">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Seventh-day Adventist Church
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Global Baptism Certificate Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Securely manage, generate, and verify baptism certificates across the entire church hierarchy—from General Conference to local churches.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/verify">
              <Button size="lg" variant="outline" className="px-8">
                <QrCode className="h-4 w-4 mr-2" />
                Verify Certificate
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Comprehensive Certificate Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={FileText}
              title="Digital Records"
              description="Create and manage baptism records with complete member information and minister details."
            />
            <FeatureCard
              icon={Award}
              title="Certificate Generation"
              description="Generate professional PDF certificates with unique certificate numbers and QR codes."
            />
            <FeatureCard
              icon={QrCode}
              title="Instant Verification"
              description="Verify any certificate instantly by scanning the QR code or entering the certificate number."
            />
          </div>
        </div>
      </section>

      {/* Hierarchy Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Complete Church Hierarchy
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Role-based access control ensures each administrator sees only their scope of responsibility.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {['General Conference', 'Division', 'Union', 'Conference', 'Local Church'].map((level, index) => (
              <div key={level} className="flex items-center">
                <div className="bg-white px-6 py-3 rounded-lg shadow-md border border-gray-100">
                  <span className="font-medium text-gray-900">{level}</span>
                </div>
                {index < 4 && (
                  <div className="hidden sm:block w-8 h-0.5 bg-emerald-300 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-emerald-600">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">150+</div>
              <div className="text-emerald-100">Divisions</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1,000+</div>
              <div className="text-emerald-100">Unions</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5,000+</div>
              <div className="text-emerald-100">Conferences</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">85,000+</div>
              <div className="text-emerald-100">Local Churches</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Church className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">ADVENTIFY</span>
          </div>
          <p className="text-sm">
            Global Baptism Certificate Platform for the Seventh-day Adventist Church
          </p>
          <p className="text-xs mt-4 text-gray-500">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
