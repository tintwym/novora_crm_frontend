import { DragEvent, FormEvent, useRef, useState } from 'react';
import { Permission } from '@/shared';
import { canPreview, dealsApi, MAX_UPLOAD_BYTES, type DealAttachment } from './dealsApi';
import { ApiClientError } from '../../utils/api';
import { formatBytes } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';
import { useAuthStore } from '../../store/authStore';
import { Button, ErrorAlert, Field, Modal, Panel } from '../../components/ui';
import { IconDownload, IconQuotes } from '../../components/icons/Icons';

interface Props {
  dealId: string;
  attachments: DealAttachment[];
  onChange: () => Promise<void> | void;
}

export function AttachmentsPanel({ dealId, attachments, onChange }: Props) {
  const canEdit = usePermission(Permission.MANAGE_DEALS);
  const isManager = usePermission(Permission.VIEW_ALL_DEALS);
  const userId = useAuthStore((s) => s.user?.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState({ fileName: '', fileUrl: '' });
  const [removing, setRemoving] = useState<DealAttachment | null>(null);
  const [busy, setBusy] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    const tooBig = list.filter((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig.length > 0) {
      setError(`${tooBig.map((f) => f.name).join(', ')} ${tooBig.length === 1 ? 'is' : 'are'} over the 10 MB limit.`);
      return;
    }
    setError(null);
    try {
      for (const [i, file] of list.entries()) {
        setUploading(list.length > 1 ? `Uploading ${i + 1} of ${list.length}…` : `Uploading ${file.name}…`);
        await dealsApi.uploadAttachment(dealId, file);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
      if (inputRef.current) inputRef.current.value = '';
      await onChange();
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!canEdit || uploading) return;
    void uploadFiles(e.dataTransfer.files);
  }

  async function onAddLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await dealsApi.addAttachment(dealId, link);
      setLink({ fileName: '', fileUrl: '' });
      setShowLink(false);
      await onChange();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to add link');
    }
  }

  async function open(file: DealAttachment) {
    setError(null);
    const target = canPreview(file) ? window.open('', '_blank') : null;
    try {
      await dealsApi.downloadAttachment(file, target);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Download failed');
    }
  }

  async function onRemove() {
    if (!removing) return;
    setBusy(true);
    setError(null);
    try {
      await dealsApi.removeAttachment(removing.id);
      setRemoving(null);
      await onChange();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to remove file');
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  }

  const canRemove = (file: DealAttachment) => canEdit && (isManager || file.uploadedBy === userId);

  return (
    <Panel title="Attachments" description="Proposals, contracts and other files for this deal.">
      {canEdit && (
        <div className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
              dragging
                ? 'border-brand-400 bg-brand-50/60 dark:border-brand-600 dark:bg-brand-950/30'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              className="sr-only"
              id={`deal-upload-${dealId}`}
              onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
              disabled={Boolean(uploading)}
            />
            {uploading ? (
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300" role="status">
                {uploading}
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Drag files here or{' '}
                  <label htmlFor={`deal-upload-${dealId}`} className="link-brand cursor-pointer font-medium">
                    choose files
                  </label>
                </p>
                <p className="mt-1 text-xs text-slate-400">Up to 10 MB each</p>
              </>
            )}
          </div>
          {showLink ? (
            <form onSubmit={onAddLink} className="space-y-1 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <Field label="Name" htmlFor="deal-link-name">
                <Field.Input
                  id="deal-link-name"
                  required
                  value={link.fileName}
                  onChange={(e) => setLink((l) => ({ ...l, fileName: e.target.value }))}
                  placeholder="e.g. Signed contract"
                />
              </Field>
              <Field label="Link" htmlFor="deal-link-url">
                <Field.Input
                  id="deal-link-url"
                  required
                  type="url"
                  value={link.fileUrl}
                  onChange={(e) => setLink((l) => ({ ...l, fileUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowLink(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="secondary">
                  Add link
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowLink(true)}
              className="text-xs font-medium text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"
            >
              + Add a link instead (Google Drive, Dropbox…)
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3">
          <ErrorAlert message={error} />
        </div>
      )}

      <ul className={`space-y-1 text-sm ${canEdit ? 'mt-4 border-t border-slate-100 pt-3 dark:border-slate-800' : ''}`}>
        {attachments.length === 0 && <li className="py-1 text-slate-500 dark:text-slate-400">No attachments yet</li>}
        {attachments.map((file) => (
          <li
            key={file.id}
            className="group flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {file.uploaded ? <IconQuotes size={15} /> : <span className="text-xs font-semibold">↗</span>}
            </span>
            <div className="min-w-0 flex-1">
              {file.uploaded ? (
                <button
                  type="button"
                  onClick={() => void open(file)}
                  className="link-brand block max-w-full truncate text-left"
                  title={canPreview(file) ? 'Open' : 'Download'}
                >
                  {file.fileName}
                </button>
              ) : (
                <a href={file.fileUrl ?? '#'} target="_blank" rel="noreferrer noopener" className="link-brand block truncate">
                  {file.fileName}
                </a>
              )}
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {[
                  file.uploaded ? formatBytes(file.sizeBytes) : 'Link',
                  file.uploader?.name,
                  new Date(file.createdAt).toLocaleDateString(),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {file.uploaded && (
              <button
                type="button"
                onClick={() => void dealsApi.downloadAttachment(file).catch(() => setError('Download failed'))}
                aria-label={`Download ${file.fileName}`}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <IconDownload size={15} />
              </button>
            )}
            {canRemove(file) && (
              <button
                type="button"
                onClick={() => setRemoving(file)}
                aria-label={`Remove ${file.fileName}`}
                className="rounded-md px-1.5 py-1 text-xs font-medium text-red-600 opacity-70 hover:bg-red-50 hover:opacity-100 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      <Modal
        open={removing !== null}
        onClose={() => {
          if (!busy) setRemoving(null);
        }}
        title={`Remove ${removing?.fileName ?? 'file'}?`}
        description={
          removing?.uploaded
            ? 'The file will be permanently deleted from this deal.'
            : 'The link will be removed from this deal. The file it points to is not affected.'
        }
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={busy} onClick={() => setRemoving(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void onRemove()}>
            {busy ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </Modal>
    </Panel>
  );
}
