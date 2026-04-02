import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Adventify - Church Verification Platform',
  description: 'Digital verification platform for church certificates and introduction letters',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-blue-900">ADVENTIFY</h1>
              <div className="flex gap-4">
                <a href="/dashboard/clerk" className="text-blue-600 hover:text-blue-800">Clerk</a>
                <a href="/dashboard/pastor" className="text-blue-600 hover:text-blue-800">Pastor</a>
                <a href="/verify" className="text-blue-600 hover:text-blue-800">Verify</a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
