'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  Phone,
  Mail,
  Bell,
  BellOff,
  Send,
  CheckCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: NotificationType;
  channel: string;
  title: string;
  message: string;
  status: NotificationStatus;
  recipient: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  sentBy?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
}

interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    unreadCount: number;
  };
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case NotificationType.SMS:
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case NotificationType.WHATSAPP:
      return <Phone className="h-4 w-4 text-green-500" />;
    case NotificationType.EMAIL:
      return <Mail className="h-4 w-4 text-orange-500" />;
    case NotificationType.IN_APP:
      return <Bell className="h-4 w-4 text-purple-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

function getStatusBadge(status: NotificationStatus) {
  switch (status) {
    case NotificationStatus.PENDING:
      return (
        <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    case NotificationStatus.SENT:
      return (
        <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
          <Send className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    case NotificationStatus.DELIVERED:
      return (
        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
          <CheckCheck className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    case NotificationStatus.FAILED:
      return (
        <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const { token } = useAuthStore();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Send dialog state
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendType, setSendType] = useState<string>('');
  const [sendUserId, setSendUserId] = useState('');
  const [sendTitle, setSendTitle] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sending, setSending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (typeFilter !== 'ALL') {
        params.set('type', typeFilter);
      }

      const res = await fetch(`/api/notifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: NotificationsResponse = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
        setTotalPages(data.data.pagination.totalPages);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [token, page, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingId(notificationId);
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, status: NotificationStatus.DELIVERED, deliveredAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    } finally {
      setMarkingId(null);
    }
  };

  const handleSendNotification = async () => {
    if (!sendType || !sendTitle || !sendMessage) return;
    setSending(true);
    try {
      const body: Record<string, string> = {
        userId: sendUserId,
        type: sendType,
        title: sendTitle,
        message: sendMessage,
      };
      if (sendRecipient) body.recipient = sendRecipient;
      if (sendSubject) body.subject = sendSubject;

      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSendDialogOpen(false);
        resetSendForm();
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    } finally {
      setSending(false);
    }
  };

  const resetSendForm = () => {
    setSendType('');
    setSendUserId('');
    setSendTitle('');
    setSendMessage('');
    setSendRecipient('');
    setSendSubject('');
  };

  const { user } = useAuthStore();
  const canSend =
    user &&
    ['CHURCH_CLERK', 'CHURCH_PASTOR', 'CONFERENCE_ADMIN', 'UNION_ADMIN', 'DIVISION_ADMIN', 'GENERAL_CONFERENCE_ADMIN'].includes(
      user.role
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('notifications.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('common.showing')} {total} {t('common.results')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
          {canSend && (
            <Dialog open={sendDialogOpen} onOpenChange={(open) => {
              setSendDialogOpen(open);
              if (!open) resetSendForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Send className="h-4 w-4 mr-2" />
                  {t('notifications.send')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('notifications.sendNotification')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>{t('common.type')}</Label>
                    <Select value={sendType} onValueChange={setSendType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('notifications.selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMS">{t('notifications.sms')}</SelectItem>
                        <SelectItem value="WHATSAPP">{t('notifications.whatsapp')}</SelectItem>
                        <SelectItem value="EMAIL">{t('notifications.email')}</SelectItem>
                        <SelectItem value="IN_APP">{t('notifications.inApp')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>User ID</Label>
                    <Input
                      value={sendUserId}
                      onChange={(e) => setSendUserId(e.target.value)}
                      placeholder="Enter user ID..."
                    />
                  </div>
                  {(sendType === 'SMS' || sendType === 'WHATSAPP' || sendType === 'EMAIL') && (
                    <div className="space-y-2">
                      <Label>{t('notifications.recipient')}</Label>
                      <Input
                        value={sendRecipient}
                        onChange={(e) => setSendRecipient(e.target.value)}
                        placeholder={
                          sendType === 'EMAIL'
                            ? 'email@example.com'
                            : '+1234567890'
                        }
                      />
                    </div>
                  )}
                  {sendType === 'EMAIL' && (
                    <div className="space-y-2">
                      <Label>{t('notifications.subject')}</Label>
                      <Input
                        value={sendSubject}
                        onChange={(e) => setSendSubject(e.target.value)}
                        placeholder={t('notifications.enterSubject')}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>{t('notifications.title')}</Label>
                    <Input
                      value={sendTitle}
                      onChange={(e) => setSendTitle(e.target.value)}
                      placeholder="Notification title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('notifications.message')}</Label>
                    <Textarea
                      value={sendMessage}
                      onChange={(e) => setSendMessage(e.target.value)}
                      placeholder={t('notifications.enterMessage')}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t('common.cancel')}</Button>
                  </DialogClose>
                  <Button
                    onClick={handleSendNotification}
                    disabled={sending || !sendType || !sendTitle || !sendMessage}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Send className="h-4 w-4 mr-2" />
                    {t('common.send')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filter and Stats */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-gray-700">
                  {t('notifications.filterByType')}
                </span>
              </div>
              <Select value={typeFilter} onValueChange={(val) => {
                setTypeFilter(val);
                setPage(1);
              }}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('notifications.allNotifications')}</SelectItem>
                  <SelectItem value="SMS">{t('notifications.sms')}</SelectItem>
                  <SelectItem value="WHATSAPP">{t('notifications.whatsapp')}</SelectItem>
                  <SelectItem value="EMAIL">{t('notifications.email')}</SelectItem>
                  <SelectItem value="IN_APP">{t('notifications.inApp')}</SelectItem>
                </SelectContent>
              </Select>
              {unreadCount > 0 && (
                <Badge className="bg-emerald-600 text-white">
                  {unreadCount} {t('notifications.unread')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <BellOff className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-lg font-medium">{t('notifications.noNotifications')}</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>{t('common.type')}</TableHead>
                      <TableHead>{t('common.name')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('notifications.message')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('common.date')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notification) => (
                      <TableRow
                        key={notification.id}
                        className={cn(
                          'cursor-pointer hover:bg-gray-50',
                          notification.status === NotificationStatus.SENT && 'bg-blue-50/50'
                        )}
                      >
                        <TableCell className="pl-4">
                          {getTypeIcon(notification.type)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {t(`notifications.type.${notification.type}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm text-gray-900">
                              {notification.title}
                            </p>
                            {notification.recipient && (
                              <p className="text-xs text-gray-500">
                                {notification.recipient}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="text-sm text-gray-600 max-w-xs truncate">
                            {notification.message}
                          </p>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(notification.status)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {notification.status === NotificationStatus.SENT && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markingId === notification.id}
                            >
                              {markingId === notification.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCheck className="h-3 w-3 mr-1" />
                              )}
                              <span className="text-xs">{t('notifications.markAsRead')}</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile view */}
              <div className="sm:hidden divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4',
                      notification.status === NotificationStatus.SENT && 'bg-blue-50/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getTypeIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {t(`notifications.type.${notification.type}`)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(notification.status)}
                            <span className="text-xs text-gray-400">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {notification.status === NotificationStatus.SENT && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markingId === notification.id}
                          className="shrink-0"
                        >
                          {markingId === notification.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCheck className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {t('common.showing')} {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} {t('common.of')} {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {t('common.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      {t('common.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
