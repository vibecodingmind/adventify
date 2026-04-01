'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useUIStore } from '@/store';
import { Role } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Church,
  Users,
  FileText,
  Award,
  LogOut,
  Menu,
  Building2,
  Shield,
  BarChart3,
  Bell,
  Ban,
  FileBarChart,
  Palette,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LanguageSelector } from '@/components/language-selector';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Hierarchy', href: '/hierarchy', icon: Building2, minRole: Role.CONFERENCE_ADMIN },
  { name: 'Persons', href: '/persons', icon: Users, minRole: Role.CHURCH_CLERK },
  { name: 'Baptism Records', href: '/baptism-records', icon: FileText, minRole: Role.CHURCH_CLERK },
  { name: 'Certificates', href: '/certificates', icon: Award, minRole: Role.CHURCH_CLERK },
  { name: 'Templates', href: '/templates', icon: Palette, minRole: Role.CHURCH_CLERK },
  { name: 'Batch Operations', href: '/batch', icon: Layers, minRole: Role.CHURCH_CLERK },
  { name: 'Reports', href: '/reports', icon: FileBarChart, minRole: Role.CHURCH_CLERK },
  { name: 'Revocations', href: '/revocations', icon: Ban, minRole: Role.CHURCH_PASTOR },
  { name: 'Users', href: '/users', icon: Shield, minRole: Role.CONFERENCE_ADMIN },
  { name: 'Notifications', href: '/notifications', icon: Bell, minRole: Role.CHURCH_CLERK },
  { name: 'Audit Logs', href: '/audit-logs', icon: BarChart3, minRole: Role.CONFERENCE_ADMIN },
];

const roleHierarchy: Record<Role, number> = {
  GENERAL_CONFERENCE_ADMIN: 6,
  DIVISION_ADMIN: 5,
  UNION_ADMIN: 4,
  CONFERENCE_ADMIN: 3,
  CHURCH_PASTOR: 2,
  CHURCH_CLERK: 1,
  MEMBER: 0,
};

function hasAccess(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, token } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [hydrated, setHydrated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Wait for hydration
  useEffect(() => {
    // Use timeout to avoid synchronous setState warning
    const timer = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !token) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications?unread=true&limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.data.unreadCount || 0);
        }
      } catch {
        // Silent fail
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [hydrated, isAuthenticated, token]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const filteredNav = navigation.filter(
    (item) => !item.minRole || hasAccess(user.role, item.minRole)
  );

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleLabel = (role: Role) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-[0px]">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarContent
                user={user}
                filteredNav={filteredNav}
                pathname={pathname}
                onNavigate={() => setSidebarOpen(false)}
                onLogout={handleLogout}
                getRoleLabel={getRoleLabel}
                getInitials={getInitials}
              />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold text-emerald-700">ADVENTIFY</h1>
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-600 text-white text-xs">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
          <SidebarContent
            user={user}
            filteredNav={filteredNav}
            pathname={pathname}
            onNavigate={() => {}}
            onLogout={handleLogout}
            getRoleLabel={getRoleLabel}
            getInitials={getInitials}
            unreadCount={unreadCount}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-72">
          {/* Desktop top bar */}
          <div className="hidden lg:flex items-center justify-end px-8 py-3 bg-white border-b border-gray-200">
            <LanguageSelector />
          </div>
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  filteredNav,
  pathname,
  onNavigate,
  onLogout,
  getRoleLabel,
  getInitials,
  unreadCount,
}: {
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;
  filteredNav: typeof navigation;
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
  getRoleLabel: (role: Role) => string;
  getInitials: (name: string) => string;
  unreadCount?: number;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="h-10 w-10 bg-emerald-600 rounded-lg flex items-center justify-center">
          <Church className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-emerald-700">ADVENTIFY</h1>
          <p className="text-xs text-gray-500">Baptism Certificate Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          const isNotifications = item.href === '/notifications';
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.name}</span>
              {isNotifications && unreadCount && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-emerald-600 text-white">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.fullName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {getRoleLabel(user.role)}
            </p>
          </div>
        </div>

        {/* Scope Info */}
        {user.church && (
          <div className="px-2 mb-4 text-xs text-gray-500">
            <p className="font-medium text-gray-700">Church:</p>
            <p>{user.church.name}</p>
          </div>
        )}
        {user.conference && !user.church && (
          <div className="px-2 mb-4 text-xs text-gray-500">
            <p className="font-medium text-gray-700">Conference:</p>
            <p>{user.conference.name}</p>
          </div>
        )}
        {user.union && !user.conference && !user.church && (
          <div className="px-2 mb-4 text-xs text-gray-500">
            <p className="font-medium text-gray-700">Union:</p>
            <p>{user.union.name}</p>
          </div>
        )}
        {user.division && !user.union && !user.conference && !user.church && (
          <div className="px-2 mb-4 text-xs text-gray-500">
            <p className="font-medium text-gray-700">Division:</p>
            <p>{user.division.name}</p>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
