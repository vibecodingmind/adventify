'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Palette,
  Plus,
  Pencil,
  Trash2,
  Star,
  Eye,
  Loader2,
  Church,
  Globe,
} from 'lucide-react';

interface TemplateConfig {
  layout: 'classic' | 'modern' | 'elegant' | 'minimal';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: {
    title: number;
    subtitle: number;
    body: number;
    small: number;
  };
  borderWidth: number;
  borderRadius: number;
  showLogo: boolean;
  showQRCode: boolean;
  backgroundPattern?: string;
}

interface Template {
  id: string;
  name: string;
  description?: string | null;
  churchId?: string | null;
  config: string;
  previewData?: string | null;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: string;
  church?: { id: string; name: string } | null;
}

interface Church {
  id: string;
  name: string;
}

const LAYOUTS = [
  { value: 'classic', label: 'Classic', description: 'Traditional design with ornate borders' },
  { value: 'modern', label: 'Modern', description: 'Clean, minimal design with sans-serif fonts' },
  { value: 'elegant', label: 'Elegant', description: 'Decorative borders with serif fonts' },
  { value: 'minimal', label: 'Minimal', description: 'Simple, understated design' },
];

const FONTS = [
  { value: 'helvetica', label: 'Helvetica (Sans-serif)' },
  { value: 'times', label: 'Times (Serif)' },
  { value: 'courier', label: 'Courier (Monospace)' },
];

const DEFAULT_CONFIG: TemplateConfig = {
  layout: 'classic',
  primaryColor: '#1a365d',
  secondaryColor: '#2d5a87',
  accentColor: '#b8860b',
  fontFamily: 'helvetica',
  fontSize: { title: 28, subtitle: 12, body: 14, small: 10 },
  borderWidth: 3,
  borderRadius: 0,
  showLogo: true,
  showQRCode: true,
};

export default function TemplatesPage() {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    churchId: '',
    layout: 'classic' as TemplateConfig['layout'],
    primaryColor: '#1a365d',
    secondaryColor: '#2d5a87',
    accentColor: '#b8860b',
    fontFamily: 'helvetica',
    borderWidth: 3,
    borderRadius: 0,
    showLogo: true,
    showQRCode: true,
  });

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  const fetchChurches = useCallback(async () => {
    try {
      const res = await fetch('/api/churches?limit=200');
      const data = await res.json();
      if (data.success) {
        setChurches(data.data);
      }
    } catch (error) {
      console.error('Error fetching churches:', error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchChurches()]).finally(() => setLoading(false));
  }, [fetchTemplates, fetchChurches]);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      churchId: '',
      layout: 'classic',
      primaryColor: '#1a365d',
      secondaryColor: '#2d5a87',
      accentColor: '#b8860b',
      fontFamily: 'helvetica',
      borderWidth: 3,
      borderRadius: 0,
      showLogo: true,
      showQRCode: true,
    });
    setEditingTemplate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    if (user?.churchId) {
      setForm((prev) => ({ ...prev, churchId: user.churchId || '' }));
    }
    setDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    const config = JSON.parse(template.config) as TemplateConfig;
    setForm({
      name: template.name,
      description: template.description || '',
      churchId: template.churchId || '',
      layout: config.layout,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      accentColor: config.accentColor,
      fontFamily: config.fontFamily,
      borderWidth: config.borderWidth,
      borderRadius: config.borderRadius,
      showLogo: config.showLogo,
      showQRCode: config.showQRCode,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) return;

    setSubmitting(true);
    const config: TemplateConfig = {
      layout: form.layout,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      accentColor: form.accentColor,
      fontFamily: form.fontFamily,
      fontSize: DEFAULT_CONFIG.fontSize,
      borderWidth: form.borderWidth,
      borderRadius: form.borderRadius,
      showLogo: form.showLogo,
      showQRCode: form.showQRCode,
    };

    try {
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates';
      const method = editingTemplate ? 'PATCH' : 'POST';

      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        churchId: form.churchId || undefined,
        config,
      };

      if (editingTemplate) {
        // For PATCH, only send changed fields
        // All fields are sent for simplicity
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setDialogOpen(false);
        resetForm();
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    try {
      const res = await fetch(`/api/templates/${deletingTemplate.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setDeleteDialogOpen(false);
        setDeletingTemplate(null);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleSetDefault = async (template: Template) => {
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });

      const data = await res.json();
      if (data.success) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const getLayoutPreviewStyle = (config: TemplateConfig) => {
    const layoutStyles: Record<string, React.CSSProperties> = {
      classic: {
        border: `${config.borderWidth}px solid ${config.primaryColor}`,
        borderColor: config.primaryColor,
        position: 'relative',
      },
      modern: {
        border: `${config.borderWidth}px solid ${config.secondaryColor}`,
        borderRadius: `${config.borderRadius}px`,
        background: `linear-gradient(135deg, ${config.primaryColor}08, ${config.secondaryColor}08)`,
      },
      elegant: {
        border: `${config.borderWidth}px double ${config.accentColor}`,
        borderColor: config.accentColor,
      },
      minimal: {
        borderBottom: `2px solid ${config.primaryColor}`,
      },
    };
    return layoutStyles[config.layout] || layoutStyles.classic;
  };

  const parseConfig = (configStr: string): TemplateConfig => {
    try {
      return JSON.parse(configStr) as TemplateConfig;
    } catch {
      return DEFAULT_CONFIG;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Palette className="h-7 w-7 text-emerald-600" />
            Certificate Templates
          </h1>
          <p className="text-gray-500 mt-1">
            Manage and customize certificate designs for your organization
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? 'Update the template configuration'
                  : 'Design a new certificate template'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Name & Description */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Classic Blue Certificate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-desc">Description</Label>
                  <Textarea
                    id="template-desc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of the template design"
                    rows={2}
                  />
                </div>
              </div>

              {/* Church Scope */}
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select
                  value={form.churchId || '__system__'}
                  onValueChange={(val) => setForm({ ...form, churchId: val === '__system__' ? '' : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__system__">
                      <span className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        System-wide (All Churches)
                      </span>
                    </SelectItem>
                    {churches.map((church) => (
                      <SelectItem key={church.id} value={church.id}>
                        <span className="flex items-center gap-2">
                          <Church className="h-3 w-3" />
                          {church.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  System templates are available to all churches
                </p>
              </div>

              {/* Layout Selection */}
              <div className="space-y-2">
                <Label>Layout Style</Label>
                <div className="grid grid-cols-2 gap-3">
                  {LAYOUTS.map((layout) => (
                    <button
                      key={layout.value}
                      type="button"
                      onClick={() => setForm({ ...form, layout: layout.value as TemplateConfig['layout'] })}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        form.layout === layout.value
                          ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm">{layout.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{layout.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-3">
                <Label>Colors</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={form.primaryColor}
                        onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.secondaryColor}
                        onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={form.secondaryColor}
                        onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.accentColor}
                        onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={form.accentColor}
                        onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Font */}
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select
                  value={form.fontFamily}
                  onValueChange={(val) => setForm({ ...form, fontFamily: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Border Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Border Width</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={form.borderWidth}
                    onChange={(e) => setForm({ ...form, borderWidth: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Border Radius</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={form.borderRadius}
                    onChange={(e) => setForm({ ...form, borderRadius: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Toggle Settings */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showLogo}
                    onChange={(e) => setForm({ ...form, showLogo: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Show Logo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showQRCode}
                    onChange={(e) => setForm({ ...form, showQRCode: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Show QR Code</span>
                </label>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div
                  className="w-full aspect-[210/297] bg-white relative overflow-hidden"
                  style={getLayoutPreviewStyle(form)}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <div
                      className="w-8 h-8 rounded mb-2"
                      style={{ backgroundColor: form.primaryColor }}
                    />
                    <div
                      className="w-32 h-3 rounded mb-1"
                      style={{ backgroundColor: form.primaryColor }}
                    />
                    <div
                      className="w-20 h-1 rounded mb-4"
                      style={{ backgroundColor: form.accentColor }}
                    />
                    <div
                      className="w-40 h-2 rounded mb-1"
                      style={{ backgroundColor: '#e5e7eb' }}
                    />
                    <div
                      className="w-24 h-4 rounded mb-3"
                      style={{ backgroundColor: form.secondaryColor, opacity: 0.3 }}
                    />
                    <div
                      className="w-48 h-2 rounded mb-1"
                      style={{ backgroundColor: '#e5e7eb' }}
                    />
                    <div
                      className="w-36 h-2 rounded mb-6"
                      style={{ backgroundColor: '#e5e7eb' }}
                    />
                    <div
                      className="w-32 h-2 rounded"
                      style={{ backgroundColor: '#e5e7eb' }}
                    />
                    {form.showQRCode && (
                      <div
                        className="w-8 h-8 rounded mt-4 border"
                        style={{ borderColor: form.secondaryColor }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSubmit}
                disabled={submitting || !form.name}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingTemplate ? (
                  'Update Template'
                ) : (
                  'Create Template'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingTemplate?.name}&quot;? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Template Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{viewingTemplate?.name}</DialogTitle>
              <DialogDescription>{viewingTemplate?.description}</DialogDescription>
            </DialogHeader>
            {viewingTemplate && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge variant={viewingTemplate.isSystem ? 'default' : 'secondary'}>
                    {viewingTemplate.isSystem ? 'System' : 'Church'}
                  </Badge>
                  {viewingTemplate.isDefault && (
                    <Badge className="bg-emerald-100 text-emerald-800">Default</Badge>
                  )}
                  {viewingTemplate.church && (
                    <Badge variant="outline">{viewingTemplate.church.name}</Badge>
                  )}
                </div>
                <div
                  className="w-full aspect-[210/297] bg-white relative overflow-hidden"
                  style={getLayoutPreviewStyle(parseConfig(viewingTemplate.config))}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <div
                      className="w-8 h-8 rounded mb-2"
                      style={{ backgroundColor: parseConfig(viewingTemplate.config).primaryColor }}
                    />
                    <div
                      className="w-32 h-3 rounded mb-1"
                      style={{ backgroundColor: parseConfig(viewingTemplate.config).primaryColor }}
                    />
                    <div
                      className="w-20 h-1 rounded mb-4"
                      style={{ backgroundColor: parseConfig(viewingTemplate.config).accentColor }}
                    />
                    <div className="w-40 h-2 rounded mb-1 bg-gray-200" />
                    <div
                      className="w-24 h-4 rounded mb-3"
                      style={{
                        backgroundColor: parseConfig(viewingTemplate.config).secondaryColor,
                        opacity: 0.3,
                      }}
                    />
                    <div className="w-48 h-2 rounded mb-1 bg-gray-200" />
                    <div className="w-36 h-2 rounded mb-6 bg-gray-200" />
                    <div className="w-32 h-2 rounded bg-gray-200" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Layout:</span>{' '}
                    <span className="font-medium capitalize">
                      {parseConfig(viewingTemplate.config).layout}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Font:</span>{' '}
                    <span className="font-medium capitalize">
                      {parseConfig(viewingTemplate.config).fontFamily}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Primary:</span>
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: parseConfig(viewingTemplate.config).primaryColor }}
                    />
                    <span className="font-mono text-xs">
                      {parseConfig(viewingTemplate.config).primaryColor}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Secondary:</span>
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: parseConfig(viewingTemplate.config).secondaryColor }}
                    />
                    <span className="font-mono text-xs">
                      {parseConfig(viewingTemplate.config).secondaryColor}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Templates Yet</h3>
            <p className="text-gray-500 mb-4">Create your first certificate template to get started</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const config = parseConfig(template.config);
            return (
              <Card key={template.id} className="overflow-hidden group">
                {/* Preview */}
                <div
                  className="aspect-[210/148] bg-white relative overflow-hidden cursor-pointer"
                  style={getLayoutPreviewStyle(config)}
                  onClick={() => {
                    setViewingTemplate(template);
                    setViewDialogOpen(true);
                  }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                    <div
                      className="w-6 h-6 rounded mb-2"
                      style={{ backgroundColor: config.primaryColor }}
                    />
                    <div
                      className="w-24 h-2 rounded mb-1"
                      style={{ backgroundColor: config.primaryColor }}
                    />
                    <div
                      className="w-16 h-1 rounded mb-3"
                      style={{ backgroundColor: config.accentColor }}
                    />
                    <div className="w-32 h-1.5 rounded mb-1 bg-gray-200" />
                    <div
                      className="w-20 h-3 rounded mb-2"
                      style={{ backgroundColor: config.secondaryColor, opacity: 0.3 }}
                    />
                    <div className="w-36 h-1.5 rounded mb-1 bg-gray-200" />
                    <div className="w-28 h-1.5 rounded bg-gray-200" />
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                    <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-70 transition-opacity" />
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm truncate">{template.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1">
                        {template.isSystem ? (
                          <Badge variant="secondary" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            System
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Church className="h-3 w-3 mr-1" />
                            {template.church?.name || 'Church'}
                          </Badge>
                        )}
                        {template.isDefault && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 pb-4">
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                    {template.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(template)}
                      className="flex-1"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {!template.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeletingTemplate(template);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    {!template.isDefault && !template.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(template)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        title="Set as default"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
