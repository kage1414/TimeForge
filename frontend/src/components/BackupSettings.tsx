import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import ConfirmModal from './ConfirmModal';

interface BackupDestination {
  id: number;
  name: string;
  provider: 's3' | 'nextcloud';
  s3_endpoint: string | null;
  s3_region: string | null;
  s3_bucket: string | null;
  s3_access_key_id: string | null;
  s3_prefix: string | null;
  s3_force_path_style: boolean | null;
  nextcloud_base_url: string | null;
  nextcloud_username: string | null;
  nextcloud_path: string | null;
  last_run_at: string | null;
  last_run_status: 'ok' | 'error' | null;
  last_run_error: string | null;
}

const BACKUP_FIELDS = `
  id name provider
  s3_endpoint s3_region s3_bucket s3_access_key_id s3_prefix s3_force_path_style
  nextcloud_base_url nextcloud_username nextcloud_path
  last_run_at last_run_status last_run_error
`;

const QUERY = `query {
  backupConfigured
  backupDestinations { ${BACKUP_FIELDS} }
}`;

interface FormState {
  id: number | null;
  name: string;
  provider: 's3' | 'nextcloud';
  // s3
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3Prefix: string;
  s3PathStyle: boolean;
  // nextcloud
  ncUrl: string;
  ncUser: string;
  ncPass: string;
  ncPath: string;
}

const emptyForm: FormState = {
  id: null,
  name: '',
  provider: 's3',
  s3Endpoint: '',
  s3Region: 'us-east-1',
  s3Bucket: '',
  s3AccessKeyId: '',
  s3SecretAccessKey: '',
  s3Prefix: '',
  s3PathStyle: false,
  ncUrl: '',
  ncUser: '',
  ncPass: '',
  ncPath: '',
};

interface RestoreCounts {
  clients: number;
  projects: number;
  invoices: number;
  invoice_line_items: number;
  time_entries: number;
  credits: number;
  user_settings: number;
  exported_at: string | null;
}

interface BackupFile {
  filename: string;
  size: number;
  last_modified: string;
  exported_at: string | null;
}

function formatBackupDate(file: BackupFile): string {
  const iso = file.exported_at || file.last_modified;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return file.filename;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupSettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [restoreDestId, setRestoreDestId] = useState<number | ''>('');
  const [restoreFilename, setRestoreFilename] = useState<string>('');
  const [confirmRestore, setConfirmRestore] = useState(false);

  const { data } = useQuery<{ backupConfigured: boolean; backupDestinations: BackupDestination[] }>({
    queryKey: ['backupDestinations'],
    queryFn: async () =>
      gql<{ backupConfigured: boolean; backupDestinations: BackupDestination[] }>(QUERY),
  });

  const configured = data?.backupConfigured ?? false;
  const destinations = data?.backupDestinations ?? [];

  const filesQuery = useQuery<{ backupDestinationFiles: BackupFile[] }>({
    queryKey: ['backupDestinationFiles', restoreDestId],
    enabled: typeof restoreDestId === 'number',
    queryFn: () =>
      gql<{ backupDestinationFiles: BackupFile[] }>(
        `query($id: Int!) {
          backupDestinationFiles(id: $id) { filename size last_modified exported_at }
        }`,
        { id: restoreDestId },
      ),
  });

  // Reset selected backup when destination changes (or when new files load).
  useEffect(() => {
    setRestoreFilename('');
  }, [restoreDestId]);

  const save = useMutation({
    mutationFn: async () => {
      const payload =
        form.provider === 's3'
          ? {
              s3: {
                endpoint: form.s3Endpoint || null,
                region: form.s3Region,
                bucket: form.s3Bucket,
                access_key_id: form.s3AccessKeyId,
                secret_access_key: form.s3SecretAccessKey,
                prefix: form.s3Prefix || null,
                force_path_style: form.s3PathStyle,
              },
            }
          : {
              nextcloud: {
                base_url: form.ncUrl,
                username: form.ncUser,
                password: form.ncPass,
                path: form.ncPath || null,
              },
            };
      if (form.id == null) {
        return gql(
          `mutation($input: CreateBackupDestinationInput!) {
            createBackupDestination(input: $input) { id }
          }`,
          { input: { name: form.name, provider: form.provider, ...payload } }
        );
      }
      return gql(
        `mutation($id: Int!, $input: UpdateBackupDestinationInput!) {
          updateBackupDestination(id: $id, input: $input) { id }
        }`,
        { id: form.id, input: { name: form.name, ...payload } }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backupDestinations'] });
      toast.success(form.id == null ? 'Destination added' : 'Destination updated');
      setForm(emptyForm);
      setShowForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      gql(`mutation($id: Int!) { deleteBackupDestination(id: $id) }`, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backupDestinations'] });
      toast.success('Destination deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testRun = useMutation({
    mutationFn: (id: number) =>
      gql(`mutation($id: Int!) { testBackupDestination(id: $id) }`, { id }),
    onSuccess: () => toast.success('Connection successful'),
    onError: (e: Error) => toast.error(`Test failed: ${e.message}`),
  });

  const backupNow = useMutation({
    mutationFn: (id: number) =>
      gql<{ runBackupDestination: { filename: string; bytes: number } }>(
        `mutation($id: Int!) { runBackupDestination(id: $id) { filename bytes } }`,
        { id }
      ),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['backupDestinations'] });
      const kb = (res.runBackupDestination.bytes / 1024).toFixed(1);
      toast.success(`Backup uploaded (${kb} KB): ${res.runBackupDestination.filename}`);
    },
    onError: (e: Error) => toast.error(`Backup failed: ${e.message}`),
  });

  const restore = useMutation({
    mutationFn: ({ destinationId, filename }: { destinationId: number; filename: string }) =>
      gql<{ restoreBackup: RestoreCounts }>(
        `mutation($destinationId: Int!, $filename: String!) {
          restoreBackup(destinationId: $destinationId, filename: $filename) {
            clients projects invoices invoice_line_items time_entries credits user_settings exported_at
          }
        }`,
        { destinationId, filename },
      ),
    onSuccess: (res) => {
      qc.invalidateQueries();
      const c = res.restoreBackup;
      const total =
        c.clients + c.projects + c.invoices + c.invoice_line_items + c.time_entries + c.credits;
      toast.success(
        `Restored ${total} rows (${c.clients} clients, ${c.projects} projects, ${c.invoices} invoices, ${c.time_entries} time entries, ${c.credits} credits)`,
      );
      setRestoreFilename('');
    },
    onError: (e: Error) => toast.error(`Restore failed: ${e.message}`),
  });

  function startEdit(d: BackupDestination) {
    if (d.provider === 's3') {
      setForm({
        ...emptyForm,
        id: d.id,
        name: d.name,
        provider: 's3',
        s3Endpoint: d.s3_endpoint || '',
        s3Region: d.s3_region || 'us-east-1',
        s3Bucket: d.s3_bucket || '',
        s3AccessKeyId: d.s3_access_key_id || '',
        s3SecretAccessKey: '',
        s3Prefix: d.s3_prefix || '',
        s3PathStyle: !!d.s3_force_path_style,
      });
    } else {
      setForm({
        ...emptyForm,
        id: d.id,
        name: d.name,
        provider: 'nextcloud',
        ncUrl: d.nextcloud_base_url || '',
        ncUser: d.nextcloud_username || '',
        ncPass: '',
        ncPath: d.nextcloud_path || '',
      });
    }
    setShowForm(true);
  }

  function startNew() {
    setForm(emptyForm);
    setShowForm(true);
  }

  function cancelForm() {
    setForm(emptyForm);
    setShowForm(false);
  }

  const files = filesQuery.data?.backupDestinationFiles ?? [];
  const filesError = filesQuery.error as Error | null;
  const selectedFile = files.find((f) => f.filename === restoreFilename) || null;

  const restoreSection = (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold mb-2">Restore from Backup</h2>
      <p className="text-sm text-gray-600 mb-3">
        Pick a backup from one of your destinations. Restoring will{' '}
        <strong className="text-red-600">replace all of your data</strong> (clients, projects,
        invoices, time entries, credits, and settings) with the contents of the chosen backup.
        Other users on this server are unaffected.
      </p>

      {destinations.length === 0 ? (
        <p className="text-sm text-gray-500">
          Add a backup destination above before you can restore.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
            <select
              className="border rounded p-2 w-full"
              value={restoreDestId}
              onChange={(e) =>
                setRestoreDestId(e.target.value === '' ? '' : Number(e.target.value))
              }
              disabled={restore.isPending}
            >
              <option value="">Select a destination…</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.provider === 's3' ? 'S3' : 'Nextcloud'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Backup</label>
            <select
              className="border rounded p-2 w-full disabled:bg-gray-50"
              value={restoreFilename}
              onChange={(e) => setRestoreFilename(e.target.value)}
              disabled={
                typeof restoreDestId !== 'number' ||
                filesQuery.isLoading ||
                restore.isPending ||
                files.length === 0
              }
            >
              <option value="">
                {typeof restoreDestId !== 'number'
                  ? 'Select a destination first'
                  : filesQuery.isLoading
                  ? 'Loading…'
                  : files.length === 0
                  ? 'No backups found'
                  : 'Select a backup…'}
              </option>
              {files.map((f) => (
                <option key={f.filename} value={f.filename}>
                  {formatBackupDate(f)} — {formatSize(f.size)}
                </option>
              ))}
            </select>
            {selectedFile && (
              <p className="text-xs text-gray-400 mt-1 truncate" title={selectedFile.filename}>
                {selectedFile.filename}
              </p>
            )}
          </div>
        </div>
      )}

      {filesError && (
        <p className="text-sm text-red-600 mt-3">List failed: {filesError.message}</p>
      )}

      {destinations.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setConfirmRestore(true)}
            disabled={
              typeof restoreDestId !== 'number' || !restoreFilename || restore.isPending
            }
            className="bg-red-600 text-white text-sm px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {restore.isPending ? 'Restoring…' : 'Restore selected backup'}
          </button>
        </div>
      )}

      <ConfirmModal
        open={confirmRestore}
        title="Restore from backup?"
        message={
          selectedFile
            ? `This will permanently replace all of your existing data with the backup from ${formatBackupDate(
                selectedFile,
              )}. This cannot be undone.`
            : 'This will permanently replace all of your existing data. This cannot be undone.'
        }
        confirmLabel="Replace my data"
        onConfirm={() => {
          setConfirmRestore(false);
          if (typeof restoreDestId === 'number' && restoreFilename) {
            restore.mutate({ destinationId: restoreDestId, filename: restoreFilename });
          }
        }}
        onCancel={() => setConfirmRestore(false)}
      />
    </div>
  );

  if (!configured) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-2">Backups</h2>
        <p className="text-sm text-gray-600">
          Backups are disabled. Set <code className="bg-gray-100 px-1 py-0.5 rounded">BACKUP_ENCRYPTION_KEY</code> in
          the backend environment (32 bytes hex, e.g. <code className="bg-gray-100 px-1 py-0.5 rounded">openssl rand -hex 32</code>).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Backups</h2>
        {!showForm && (
          <button
            type="button"
            onClick={startNew}
            className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded hover:bg-indigo-700"
          >
            Add Destination
          </button>
        )}
      </div>

      {destinations.length === 0 && !showForm && (
        <p className="text-sm text-gray-500">No backup destinations configured.</p>
      )}

      {destinations.length > 0 && (
        <ul className="divide-y border rounded">
          {destinations.map((d) => (
            <li key={d.id} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {d.provider === 's3' ? 'S3' : 'Nextcloud'}
                  </span>
                  {d.last_run_status === 'ok' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">last: ok</span>
                  )}
                  {d.last_run_status === 'error' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800">last: error</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {d.provider === 's3'
                    ? `${d.s3_bucket}${d.s3_prefix ? ` / ${d.s3_prefix}` : ''} @ ${d.s3_endpoint || `s3.${d.s3_region}.amazonaws.com`}`
                    : `${d.nextcloud_username}@${d.nextcloud_base_url}${d.nextcloud_path ? ` (${d.nextcloud_path})` : ''}`}
                </div>
                {d.last_run_at && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    Last run: {new Date(d.last_run_at).toLocaleString()}
                    {d.last_run_status === 'error' && d.last_run_error ? ` — ${d.last_run_error}` : ''}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => testRun.mutate(d.id)}
                  disabled={testRun.isPending}
                  className="text-sm border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => backupNow.mutate(d.id)}
                  disabled={backupNow.isPending}
                  className="text-sm bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {backupNow.isPending ? 'Backing up…' : 'Backup Now'}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(d)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete backup destination "${d.name}"?`)) remove.mutate(d.id);
                  }}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            if (form.id == null && form.provider === 's3' && !form.s3SecretAccessKey) {
              toast.error('Secret access key is required');
              return;
            }
            if (form.id == null && form.provider === 'nextcloud' && !form.ncPass) {
              toast.error('App password is required');
              return;
            }
            save.mutate();
          }}
          className="mt-4 border-t pt-4 space-y-3"
        >
          <h3 className="font-semibold">{form.id == null ? 'New backup destination' : 'Edit backup destination'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                required
                className="border rounded p-2 w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
              <select
                disabled={form.id != null}
                className="border rounded p-2 w-full disabled:bg-gray-50"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value as 's3' | 'nextcloud' })}
              >
                <option value="s3">S3 / S3-compatible</option>
                <option value="nextcloud">Nextcloud (WebDAV)</option>
              </select>
            </div>
          </div>

          {form.provider === 's3' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
                <input
                  className="border rounded p-2 w-full"
                  placeholder="Leave blank for AWS S3 (e.g. https://s3.us-west-002.backblazeb2.com)"
                  value={form.s3Endpoint}
                  onChange={(e) => setForm({ ...form, s3Endpoint: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                <input
                  required
                  className="border rounded p-2 w-full"
                  value={form.s3Region}
                  onChange={(e) => setForm({ ...form, s3Region: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bucket *</label>
                <input
                  required
                  className="border rounded p-2 w-full"
                  value={form.s3Bucket}
                  onChange={(e) => setForm({ ...form, s3Bucket: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Key ID *</label>
                <input
                  required
                  className="border rounded p-2 w-full"
                  value={form.s3AccessKeyId}
                  onChange={(e) => setForm({ ...form, s3AccessKeyId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret Access Key {form.id != null && <span className="text-gray-400 font-normal">(leave blank to keep)</span>}
                </label>
                <input
                  type="password"
                  className="border rounded p-2 w-full"
                  value={form.s3SecretAccessKey}
                  onChange={(e) => setForm({ ...form, s3SecretAccessKey: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                <input
                  className="border rounded p-2 w-full"
                  placeholder="e.g. timeforge/backups"
                  value={form.s3Prefix}
                  onChange={(e) => setForm({ ...form, s3Prefix: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="path-style"
                  checked={form.s3PathStyle}
                  onChange={(e) => setForm({ ...form, s3PathStyle: e.target.checked })}
                />
                <label htmlFor="path-style" className="text-sm text-gray-700">
                  Force path-style URLs (required for some non-AWS providers)
                </label>
              </div>
            </div>
          )}

          {form.provider === 'nextcloud' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Server URL *</label>
                <input
                  required
                  className="border rounded p-2 w-full"
                  placeholder="https://nextcloud.example.com"
                  value={form.ncUrl}
                  onChange={(e) => setForm({ ...form, ncUrl: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nextcloud root, or the full WebDAV URL from Files → Settings → "WebDAV" — both work.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  required
                  className="border rounded p-2 w-full"
                  value={form.ncUser}
                  onChange={(e) => setForm({ ...form, ncUser: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Password {form.id != null && <span className="text-gray-400 font-normal">(leave blank to keep)</span>}
                </label>
                <input
                  type="password"
                  className="border rounded p-2 w-full"
                  value={form.ncPass}
                  onChange={(e) => setForm({ ...form, ncPass: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remote folder</label>
                <input
                  className="border rounded p-2 w-full"
                  placeholder="Backups/timeforge"
                  value={form.ncPath}
                  onChange={(e) => setForm({ ...form, ncPath: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={cancelForm}
              className="px-4 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : form.id == null ? 'Add Destination' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
    {restoreSection}
    </div>
  );
}
