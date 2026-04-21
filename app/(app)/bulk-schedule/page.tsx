'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '@/components/nexus/GlassCard';
import { NeonButton } from '@/components/nexus/NeonButton';
import { Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { scheduleBulkPosts, parseBulkCSV } from '@/lib/services/bulkScheduleService';

export default function BulkSchedulePage() {
  const { user } = useAuth();
  const [csvContent, setCsvContent] = useState('');
  const [parsedPosts, setParsedPosts] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const downloadTemplate = () => {
    const template = `text,image_url,platforms,schedule_date,hashtags
"Your post text here","https://example.com/image.jpg","twitter,instagram,linkedin","2026-04-08","#marketing #ai"
"Another post","","twitter","2026-04-09","#content"`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_schedule_template.csv';
    a.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      setCsvContent(csv);

      try {
        const { posts, validationErrors } = await parseBulkCSV(csv);
        setParsedPosts(posts);
        setErrors(validationErrors);
      } catch (error) {
        setErrors([error instanceof Error ? error.message : 'Failed to parse CSV']);
      }
    };
    reader.readAsText(file);
  };

  const handleScheduleAll = async () => {
    if (parsedPosts.length === 0) return;

    setUploading(true);
    try {
      const results = await scheduleBulkPosts(parsedPosts);
      setErrors([`Successfully scheduled ${results.successful} out of ${results.total} posts`]);
      setParsedPosts([]);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to schedule posts']);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Upload className="w-8 h-8 text-[var(--nexus-cyan)]" />
          Bulk Schedule
        </h1>
        <p className="text-muted-foreground mt-1">Schedule multiple posts at once using CSV</p>
      </div>

      <GlassCard className="p-6 border border-[var(--nexus-cyan)]/30">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Upload CSV File</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Download the template below, fill in your posts, and upload to schedule them all at once.
            </p>
          </div>

          <div className="flex gap-2">
            <NeonButton onClick={downloadTemplate} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download Template
            </NeonButton>
          </div>

          <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-[var(--nexus-cyan)]/50 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm font-medium">Click to upload CSV or drag and drop</p>
            </label>
          </div>
        </div>
      </GlassCard>

      {errors.length > 0 && (
        <GlassCard className={`p-4 border ${errors[0].includes('Successfully') ? 'border-[var(--nexus-success)]/30 bg-[var(--nexus-success)]/5' : 'border-[var(--nexus-error)]/30 bg-[var(--nexus-error)]/5'}`}>
          <div className="flex gap-2">
            {errors[0].includes('Successfully') ? (
              <CheckCircle2 className="w-5 h-5 text-[var(--nexus-success)]" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[var(--nexus-error)]" />
            )}
            <div className="flex-1">
              {errors.map((error, i) => (
                <p key={i} className="text-sm">{error}</p>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {parsedPosts.length > 0 && (
        <GlassCard className="p-6 border border-border/50">
          <h2 className="text-lg font-semibold mb-4">Preview ({parsedPosts.length} posts)</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
            {parsedPosts.map((post, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm mb-2">{post.text}</p>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-[var(--nexus-cyan)]/20 text-[var(--nexus-cyan)]">
                    {post.platforms.join(', ')}
                  </span>
                  <span className="px-2 py-1 rounded bg-muted/50 text-muted-foreground">
                    {new Date(post.schedule_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <NeonButton
            onClick={handleScheduleAll}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? 'Scheduling...' : `Schedule All ${parsedPosts.length} Posts`}
          </NeonButton>
        </GlassCard>
      )}
    </div>
  );
}
