import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import {
  TFBadge,
  TFButton,
  TFCard,
  TFCardTitle,
  TFCheckbox,
  TFConfirm,
  TFField,
  TFInput,
  TFSelect,
} from './tf';

type SchedulePreset = 'off' | 'daily' | 'every3days' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const SCHEDULE_LABELS: Record<SchedulePreset, string> = {
  off: 'Off (manual only)',
  daily: 'Daily',
  every3days: 'Every 3 days',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom (cron)',
};

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
  schedule_preset: SchedulePreset;
  schedule_cron: string | null;
  next_run_at: string | null;
  retention_days: number | null;
  retention_cron: string | null;
  retention_last_run_at: string | null;
  retention_last_error: string | null;
  retention_next_run_at: string | null;
}

const BACKUP_FIELDS = `
  id name provider
  s3_endpoint s3_region s3_bucket s3_access_key_id s3_prefix s3_force_path_style
  nextcloud_base_url nextcloud_username nextcloud_path
  last_run_at last_run_status last_run_error
  schedule_preset schedule_cron next_run_at
  retention_days retention_cron retention_last_run_at retention_last_error retention_next_run_at
`;

const QUERY = `query {
  backupConfigured
  backupDestinations { ${BACKUP_FIELDS} }
}`;

interface FormState {
  id: number | null;
  name: string;
  provider: 's3' | 'nextcloud';
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3Prefix: string;
  s3PathStyle: boolean;
  ncUrl: string;
  ncUser: string;
  ncPass: string;
  ncPath: string;
  schedulePreset: SchedulePreset;
  scheduleCron: string;
  retentionDays: string;
  retentionCron: string;
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
  schedulePreset: 'off',
  scheduleCron: '',
  retentionDays: '',
  retentionCron: '',
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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
      const schedule = {
        schedule_preset: form.schedulePreset,
        schedule_cron: form.schedulePreset === 'custom' ? form.scheduleCron || null : null,
        retention_days:
          form.retentionDays && Number(form.retentionDays) > 0
            ? Math.floor(Number(form.retentionDays))
            : null,
        retention_cron: form.retentionDays && form.retentionCron ? form.retentionCron : null,
      };
      if (form.id == null) {
        return gql(
          `mutation($input: CreateBackupDestinationInput!) {
            createBackupDestination(input: $input) { id }
          }`,
          { input: { name: form.name, provider: form.provider, ...payload, schedule } },
        );
      }
      return gql(
        `mutation($id: Int!, $input: UpdateBackupDestinationInput!) {
          updateBackupDestination(id: $id, input: $input) { id }
        }`,
        { id: form.id, input: { name: form.name, ...payload, schedule } },
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
        { id },
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
    const scheduleFields = {
      schedulePreset: d.schedule_preset || 'off',
      scheduleCron: d.schedule_cron || '',
      retentionDays: d.retention_days != null ? String(d.retention_days) : '',
      retentionCron: d.retention_cron || '',
    };
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
        ...scheduleFields,
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
        ...scheduleFields,
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
  const deletingDest = destinations.find((d) => d.id === confirmDeleteId) || null;

  const restoreSection = (
    <TFCard>
      <TFCardTitle className="mb-2">Restore from Backup</TFCardTitle>
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
          <TFField label="Destination">
            <TFSelect
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
            </TFSelect>
          </TFField>
          <TFField
            label="Backup"
            hint={selectedFile ? selectedFile.filename : undefined}
          >
            <TFSelect
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
            </TFSelect>
          </TFField>
        </div>
      )}

      {filesError && (
        <p className="text-sm text-red-600 mt-3">List failed: {filesError.message}</p>
      )}

      {destinations.length > 0 && (
        <div className="mt-4">
          <TFButton
            variant="danger"
            size="sm"
            onClick={() => setConfirmRestore(true)}
            disabled={typeof restoreDestId !== 'number' || !restoreFilename || restore.isPending}
          >
            {restore.isPending ? 'Restoring…' : 'Restore selected backup'}
          </TFButton>
        </div>
      )}

      <TFConfirm
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
    </TFCard>
  );

  if (!configured) {
    return (
      <TFCard>
        <TFCardTitle className="mb-2">Backups</TFCardTitle>
        <p className="text-sm text-gray-600">
          Backups are disabled. Set{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded">BACKUP_ENCRYPTION_KEY</code> in the
          backend environment (32 bytes hex, e.g.{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded">openssl rand -hex 32</code>).
        </p>
      </TFCard>
    );
  }

  return (
    <div className="space-y-6">
      <TFCard>
        <div className="flex items-center justify-between mb-4">
          <TFCardTitle>Backups</TFCardTitle>
          {!showForm && (
            <TFButton size="sm" onClick={startNew}>
              Add Destination
            </TFButton>
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
                    <TFBadge tone="neutral" size="sm">
                      {d.provider === 's3' ? 'S3' : 'Nextcloud'}
                    </TFBadge>
                    {d.last_run_status === 'ok' && (
                      <TFBadge tone="success" size="sm">
                        last: ok
                      </TFBadge>
                    )}
                    {d.last_run_status === 'error' && (
                      <TFBadge tone="danger" size="sm">
                        last: error
                      </TFBadge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {d.provider === 's3'
                      ? `${d.s3_bucket}${d.s3_prefix ? ` / ${d.s3_prefix}` : ''} @ ${
                          d.s3_endpoint || `s3.${d.s3_region}.amazonaws.com`
                        }`
                      : `${d.nextcloud_username}@${d.nextcloud_base_url}${
                          d.nextcloud_path ? ` (${d.nextcloud_path})` : ''
                        }`}
                  </div>
                  {d.last_run_at && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Last run: {new Date(d.last_run_at).toLocaleString()}
                      {d.last_run_status === 'error' && d.last_run_error
                        ? ` — ${d.last_run_error}`
                        : ''}
                    </div>
                  )}
                  {d.schedule_preset && d.schedule_preset !== 'off' && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Schedule: {SCHEDULE_LABELS[d.schedule_preset]}
                      {d.schedule_preset === 'custom' && d.schedule_cron
                        ? ` (${d.schedule_cron})`
                        : ''}
                      {d.next_run_at
                        ? ` — next ${new Date(d.next_run_at).toLocaleString()}`
                        : ''}
                    </div>
                  )}
                  {d.retention_days != null && d.retention_days > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Retention: delete after {d.retention_days} day
                      {d.retention_days === 1 ? '' : 's'}
                      {d.retention_next_run_at
                        ? ` — next check ${new Date(d.retention_next_run_at).toLocaleString()}`
                        : ''}
                      {d.retention_last_error ? ` — last error: ${d.retention_last_error}` : ''}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <TFButton
                    variant="outline"
                    size="sm"
                    onClick={() => testRun.mutate(d.id)}
                    disabled={testRun.isPending}
                  >
                    Test
                  </TFButton>
                  <TFButton
                    size="sm"
                    onClick={() => backupNow.mutate(d.id)}
                    disabled={backupNow.isPending}
                  >
                    {backupNow.isPending ? 'Backing up…' : 'Backup Now'}
                  </TFButton>
                  <TFButton variant="link" size="sm" onClick={() => startEdit(d)}>
                    Edit
                  </TFButton>
                  <TFButton
                    variant="linkDanger"
                    size="sm"
                    onClick={() => setConfirmDeleteId(d.id)}
                  >
                    Delete
                  </TFButton>
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
            <h3 className="font-semibold">
              {form.id == null ? 'New backup destination' : 'Edit backup destination'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TFField label="Name" required>
                <TFInput
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </TFField>
              <TFField label="Provider" required>
                <TFSelect
                  disabled={form.id != null}
                  value={form.provider}
                  onChange={(e) =>
                    setForm({ ...form, provider: e.target.value as 's3' | 'nextcloud' })
                  }
                >
                  <option value="s3">S3 / S3-compatible</option>
                  <option value="nextcloud">Nextcloud (WebDAV)</option>
                </TFSelect>
              </TFField>
            </div>

            {form.provider === 's3' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TFField label="Endpoint" className="md:col-span-2">
                  <TFInput
                    placeholder="Leave blank for AWS S3 (e.g. https://s3.us-west-002.backblazeb2.com)"
                    value={form.s3Endpoint}
                    onChange={(e) => setForm({ ...form, s3Endpoint: e.target.value })}
                  />
                </TFField>
                <TFField label="Region" required>
                  <TFInput
                    required
                    value={form.s3Region}
                    onChange={(e) => setForm({ ...form, s3Region: e.target.value })}
                  />
                </TFField>
                <TFField label="Bucket" required>
                  <TFInput
                    required
                    value={form.s3Bucket}
                    onChange={(e) => setForm({ ...form, s3Bucket: e.target.value })}
                  />
                </TFField>
                <TFField label="Access Key ID" required>
                  <TFInput
                    required
                    value={form.s3AccessKeyId}
                    onChange={(e) => setForm({ ...form, s3AccessKeyId: e.target.value })}
                  />
                </TFField>
                <TFField
                  label={
                    <>
                      Secret Access Key{' '}
                      {form.id != null && (
                        <span className="text-gray-400 font-normal">(leave blank to keep)</span>
                      )}
                    </>
                  }
                >
                  <TFInput
                    type="password"
                    value={form.s3SecretAccessKey}
                    onChange={(e) => setForm({ ...form, s3SecretAccessKey: e.target.value })}
                  />
                </TFField>
                <TFField label="Prefix">
                  <TFInput
                    placeholder="e.g. timeforge/backups"
                    value={form.s3Prefix}
                    onChange={(e) => setForm({ ...form, s3Prefix: e.target.value })}
                  />
                </TFField>
                <div className="flex items-center pt-6">
                  <TFCheckbox
                    id="path-style"
                    label="Force path-style URLs (required for some non-AWS providers)"
                    checked={form.s3PathStyle}
                    onChange={(e) => setForm({ ...form, s3PathStyle: e.target.checked })}
                  />
                </div>
              </div>
            )}

            {form.provider === 'nextcloud' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TFField
                  label="Server URL"
                  required
                  className="md:col-span-2"
                  hint="Nextcloud root, or the full WebDAV URL from Files → Settings → &quot;WebDAV&quot; — both work."
                >
                  <TFInput
                    required
                    placeholder="https://nextcloud.example.com"
                    value={form.ncUrl}
                    onChange={(e) => setForm({ ...form, ncUrl: e.target.value })}
                  />
                </TFField>
                <TFField label="Username" required>
                  <TFInput
                    required
                    value={form.ncUser}
                    onChange={(e) => setForm({ ...form, ncUser: e.target.value })}
                  />
                </TFField>
                <TFField
                  label={
                    <>
                      App Password{' '}
                      {form.id != null && (
                        <span className="text-gray-400 font-normal">(leave blank to keep)</span>
                      )}
                    </>
                  }
                >
                  <TFInput
                    type="password"
                    value={form.ncPass}
                    onChange={(e) => setForm({ ...form, ncPass: e.target.value })}
                  />
                </TFField>
                <TFField label="Remote folder" className="md:col-span-2">
                  <TFInput
                    placeholder="Backups/timeforge"
                    value={form.ncPath}
                    onChange={(e) => setForm({ ...form, ncPath: e.target.value })}
                  />
                </TFField>
              </div>
            )}

            <div className="border-t pt-4 mt-2">
              <h4 className="font-semibold text-sm mb-3">Schedule</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TFField label="Frequency">
                  <TFSelect
                    value={form.schedulePreset}
                    onChange={(e) =>
                      setForm({ ...form, schedulePreset: e.target.value as SchedulePreset })
                    }
                  >
                    {(Object.keys(SCHEDULE_LABELS) as SchedulePreset[]).map((p) => (
                      <option key={p} value={p}>
                        {SCHEDULE_LABELS[p]}
                      </option>
                    ))}
                  </TFSelect>
                </TFField>
                {form.schedulePreset === 'custom' && (
                  <TFField
                    label="Cron expression"
                    hint="Standard 5-field cron (min hour day month weekday). Example: 0 2 * * * runs at 02:00 daily."
                  >
                    <TFInput
                      placeholder="0 2 * * *"
                      value={form.scheduleCron}
                      onChange={(e) => setForm({ ...form, scheduleCron: e.target.value })}
                    />
                  </TFField>
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="font-semibold text-sm mb-3">Retention</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TFField
                  label="Delete backups older than (days)"
                  hint="Leave blank to keep backups forever."
                >
                  <TFInput
                    type="number"
                    min="1"
                    placeholder="e.g. 30"
                    value={form.retentionDays}
                    onChange={(e) => setForm({ ...form, retentionDays: e.target.value })}
                  />
                </TFField>
                {form.retentionDays && Number(form.retentionDays) > 0 && (
                  <TFField
                    label="Retention check schedule (cron)"
                    hint="Optional. Defaults to 03:00 daily."
                  >
                    <TFInput
                      placeholder="0 3 * * *"
                      value={form.retentionCron}
                      onChange={(e) => setForm({ ...form, retentionCron: e.target.value })}
                    />
                  </TFField>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <TFButton type="button" variant="outline" onClick={cancelForm}>
                Cancel
              </TFButton>
              <TFButton type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : form.id == null ? 'Add Destination' : 'Save Changes'}
              </TFButton>
            </div>
          </form>
        )}
      </TFCard>
      {restoreSection}

      <TFConfirm
        open={confirmDeleteId !== null}
        title="Delete destination?"
        message={
          deletingDest
            ? `Delete backup destination "${deletingDest.name}"? Existing backups stored remotely are not affected.`
            : 'Delete backup destination?'
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteId !== null) remove.mutate(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
