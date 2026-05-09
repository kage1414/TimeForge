import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { TimeEntry, Project, UserSettings } from '../types';
import {
  TFBadge,
  TFBadgeTone,
  TFButton,
  TFCard,
  TFCheckbox,
  TFConfirm,
  TFDialog,
  TFDialogBody,
  TFDialogContent,
  TFDialogFooter,
  TFDialogHeader,
  TFDialogTitle,
  TFEmpty,
  TFField,
  TFInput,
  TFLoading,
  TFPageHeader,
  TFRadio,
  TFRadioGroup,
  TFSelect,
  TFTable,
  TFTBody,
  TFTd,
  TFTh,
  TFTHead,
  TFTr,
} from '../components/tf';

function ElapsedTime({
  startTime,
  rate,
  showEarnings,
}: {
  startTime: string;
  rate?: number;
  showEarnings?: boolean;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.floor((now - new Date(startTime).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const earnings = rate != null ? (elapsed / 3600) * rate : null;

  return (
    <span className="font-mono text-green-700">
      {pad(h)}:{pad(m)}:{pad(s)}
      {showEarnings && earnings != null && (
        <span className="ml-2 text-green-600">${earnings.toFixed(2)}</span>
      )}
    </span>
  );
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const TIME_ENTRIES_QUERY = `
  query($project_id: Int, $unbilled: Boolean) {
    timeEntries(project_id: $project_id, unbilled: $unbilled) {
      id project_id project_name client_name client_id default_rate
      description start_time end_time duration_minutes is_billable
      invoice_id rate_override flat_amount created_at updated_at
    }
  }
`;

const PROJECTS_QUERY = `query { projects { id name client_name is_active } }`;
const USER_SETTINGS_QUERY = `query { userSettings { show_earnings_on_timer resume_window_minutes } }`;

interface StartModalState {
  open: boolean;
  useCurrentTime: boolean;
  projectId: string;
  description: string;
  rateOverride: string;
  startTime: string;
}

const emptyStartModal: StartModalState = {
  open: false,
  useCurrentTime: true,
  projectId: '',
  description: '',
  rateOverride: '',
  startTime: '',
};

interface EditModalState {
  open: boolean;
  id: number;
  projectId: string;
  description: string;
  rateOverride: string;
  startTime: string;
  endTime: string;
  isBillable: boolean;
}

const emptyEditModal: EditModalState = {
  open: false,
  id: 0,
  projectId: '',
  description: '',
  rateOverride: '',
  startTime: '',
  endTime: '',
  isBillable: true,
};

interface AddModalState {
  open: boolean;
  projectId: string;
  description: string;
  isTimeBased: boolean;
  startTime: string;
  endTime: string;
  rateOverride: string;
  flatAmount: string;
  isBillable: boolean;
}

const emptyAddModal: AddModalState = {
  open: false,
  projectId: '',
  description: '',
  isTimeBased: true,
  startTime: '',
  endTime: '',
  rateOverride: '',
  flatAmount: '',
  isBillable: true,
};

function entryStatus(e: TimeEntry): { label: string; tone: TFBadgeTone } {
  if (e.invoice_id) return { label: 'Billed', tone: 'success' };
  if (!e.is_billable) return { label: 'Not Billable', tone: 'neutral' };
  return { label: 'Unbilled', tone: 'warning' };
}

export default function TimeEntriesPage() {
  const qc = useQueryClient();
  const [filterProject, setFilterProject] = useState('');
  const [showUnbilled, setShowUnbilled] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [startModal, setStartModal] = useState<StartModalState>(emptyStartModal);
  const [editModal, setEditModal] = useState<EditModalState>(emptyEditModal);
  const [addModal, setAddModal] = useState<AddModalState>(emptyAddModal);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => (await gql<{ projects: Project[] }>(PROJECTS_QUERY)).projects,
  });

  const { data: userSettings } = useQuery<
    Pick<UserSettings, 'show_earnings_on_timer' | 'resume_window_minutes'>
  >({
    queryKey: ['userSettings'],
    queryFn: async () =>
      (
        await gql<{
          userSettings: Pick<UserSettings, 'show_earnings_on_timer' | 'resume_window_minutes'>;
        }>(USER_SETTINGS_QUERY)
      ).userSettings,
  });

  const resumeWindowMinutes = userSettings?.resume_window_minutes ?? 60;

  function canResume(e: TimeEntry): boolean {
    if (e.invoice_id) return false;
    if (!e.end_time) return false;
    const minutesSinceEnd = (Date.now() - new Date(e.end_time).getTime()) / 60000;
    return minutesSinceEnd <= resumeWindowMinutes;
  }

  const vars: any = {};
  if (filterProject) vars.project_id = Number(filterProject);
  if (showUnbilled) vars.unbilled = true;

  const { data: entries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ['timeEntries', filterProject, showUnbilled],
    queryFn: async () =>
      (await gql<{ timeEntries: TimeEntry[] }>(TIME_ENTRIES_QUERY, vars)).timeEntries,
  });

  const startTimer = useMutation({
    mutationFn: () =>
      gql(`mutation($input: CreateTimeEntryInput!) { createTimeEntry(input: $input) { id } }`, {
        input: {
          project_id: Number(startModal.projectId),
          description: startModal.description || null,
          start_time: startModal.useCurrentTime
            ? new Date().toISOString()
            : new Date(startModal.startTime).toISOString(),
          is_billable: true,
          rate_override: startModal.rateOverride ? Number(startModal.rateOverride) : null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success('Timer started');
      setStartModal(emptyStartModal);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addEntry = useMutation({
    mutationFn: () =>
      gql(`mutation($input: CreateTimeEntryInput!) { createTimeEntry(input: $input) { id } }`, {
        input: {
          project_id: Number(addModal.projectId),
          description: addModal.description || null,
          start_time: addModal.startTime ? new Date(addModal.startTime).toISOString() : null,
          end_time: addModal.endTime ? new Date(addModal.endTime).toISOString() : null,
          is_billable: addModal.isBillable,
          rate_override:
            addModal.isTimeBased && addModal.rateOverride ? Number(addModal.rateOverride) : null,
          flat_amount:
            !addModal.isTimeBased && addModal.flatAmount ? Number(addModal.flatAmount) : null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success('Time entry added');
      setAddModal(emptyAddModal);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEntry = useMutation({
    mutationFn: () =>
      gql(
        `mutation($id: Int!, $input: UpdateTimeEntryInput!) { updateTimeEntry(id: $id, input: $input) { id } }`,
        {
          id: editModal.id,
          input: {
            project_id: Number(editModal.projectId),
            description: editModal.description || null,
            start_time: new Date(editModal.startTime).toISOString(),
            end_time: editModal.endTime ? new Date(editModal.endTime).toISOString() : null,
            is_billable: editModal.isBillable,
            rate_override: editModal.rateOverride ? Number(editModal.rateOverride) : null,
          },
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success('Entry updated');
      setEditModal(emptyEditModal);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stopTimer = useMutation({
    mutationFn: (id: number) =>
      gql(`mutation($id: Int!) { stopTimeEntry(id: $id) { id } }`, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success('Timer stopped');
    },
  });

  const removeEntry = useMutation({
    mutationFn: (id: number) =>
      gql(`mutation($id: Int!) { deleteTimeEntry(id: $id) }`, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success('Entry deleted');
    },
  });

  const creditEntry = useMutation({
    mutationFn: (id: number) =>
      gql(`mutation($id: Int!) { creditTimeEntry(id: $id) { id } }`, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] });
      toast.success('Credit created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resumeEntry = useMutation({
    mutationFn: ({ id }: { id: number; name: string; desc: string; duration: string }) =>
      gql(`mutation($id: Int!) { restartTimeEntry(id: $id) { id } }`, { id }),
    onSuccess: (_data, { name, desc, duration }) => {
      qc.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success(`Resumed: ${name}${desc ? ` - ${desc}` : ''} (was ${duration})`, {
        duration: 4000,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { timeZone: 'UTC' });
  }

  function openEditModal(e: TimeEntry) {
    setEditModal({
      open: true,
      id: e.id,
      projectId: String(e.project_id),
      description: e.description || '',
      rateOverride: e.rate_override ? String(e.rate_override) : '',
      startTime: e.start_time ? toLocalDatetime(e.start_time) : '',
      endTime: e.end_time ? toLocalDatetime(e.end_time) : '',
      isBillable: e.is_billable,
    });
  }

  const running = entries.filter((e) => !e.end_time && e.flat_amount == null);
  const completed = entries.filter((e) => e.end_time || e.flat_amount != null);
  const hasRunning = running.length > 0;

  return (
    <div>
      <TFPageHeader
        title="Time Tracking"
        actions={
          <>
            <TFButton
              onClick={() =>
                setAddModal({
                  ...emptyAddModal,
                  open: true,
                  startTime: toLocalDatetime(new Date().toISOString()),
                  endTime: toLocalDatetime(new Date().toISOString()),
                })
              }
            >
              Add Entry
            </TFButton>
            <TFButton
              variant="success"
              onClick={() =>
                setStartModal({
                  ...emptyStartModal,
                  open: true,
                  startTime: toLocalDatetime(new Date().toISOString()),
                })
              }
              disabled={hasRunning || addModal.open}
            >
              Start Timer
            </TFButton>
          </>
        }
      />

      {running.length > 0 && (
        <TFCard className="bg-green-50 border border-green-200 mb-6">
          <h2 className="text-lg font-semibold mb-3 text-green-800">Running Timers</h2>
          {running.map((e) => (
            <div
              key={e.id}
              className="flex justify-between items-center py-2 border-b border-green-200 last:border-0"
            >
              <div>
                <span className="font-medium">{e.project_name}</span>
                {e.description && <span className="text-gray-600 ml-2">- {e.description}</span>}
                <span className="text-sm text-gray-500 ml-2">
                  Started: {e.start_time ? formatTime(e.start_time) : '—'}
                </span>
                <span className="ml-3">
                  <ElapsedTime
                    startTime={e.start_time ?? new Date().toISOString()}
                    rate={e.rate_override ?? e.default_rate}
                    showEarnings={userSettings?.show_earnings_on_timer}
                  />
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <TFButton variant="link" size="sm" onClick={() => openEditModal(e)}>
                  Edit
                </TFButton>
                <TFButton variant="danger" size="sm" onClick={() => stopTimer.mutate(e.id)}>
                  Stop
                </TFButton>
              </div>
            </div>
          ))}
        </TFCard>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <TFSelect
          className="max-w-xs"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </TFSelect>
        <TFCheckbox
          id="te-show-unbilled"
          label="Unbilled only"
          checked={showUnbilled}
          onChange={(e) => setShowUnbilled(e.target.checked)}
        />
      </div>

      {isLoading ? (
        <TFLoading />
      ) : completed.length === 0 ? (
        <TFEmpty>No time entries found.</TFEmpty>
      ) : (
        <TFCard padding="none" className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block">
            <TFTable>
              <TFTHead>
                <TFTr>
                  <TFTh>Project</TFTh>
                  <TFTh>Description</TFTh>
                  <TFTh>Start</TFTh>
                  <TFTh>End</TFTh>
                  <TFTh>Duration</TFTh>
                  <TFTh>Rate</TFTh>
                  <TFTh>Amount</TFTh>
                  <TFTh>Status</TFTh>
                  <TFTh className="text-right">Actions</TFTh>
                </TFTr>
              </TFTHead>
              <TFTBody>
                {[...completed]
                  .sort(
                    (a, b) =>
                      new Date(b.start_time ?? 0).getTime() -
                      new Date(a.start_time ?? 0).getTime(),
                  )
                  .map((e) => {
                    const isFlat = e.flat_amount != null;
                    const rate = e.rate_override ?? e.default_rate;
                    const amount = isFlat
                      ? Number(e.flat_amount)
                      : (e.duration_minutes / 60) * Number(rate);
                    const status = entryStatus(e);
                    return (
                      <TFTr key={e.id}>
                        <TFTd className="font-medium">{e.project_name}</TFTd>
                        <TFTd className="max-w-[160px] truncate" title={e.description || ''}>
                          {e.description || '-'}
                        </TFTd>
                        <TFTd>
                          {e.start_time
                            ? isFlat
                              ? formatDate(e.start_time)
                              : formatTime(e.start_time)
                            : '—'}
                        </TFTd>
                        <TFTd>
                          {e.end_time
                            ? isFlat
                              ? formatDate(e.end_time)
                              : formatTime(e.end_time)
                            : '—'}
                        </TFTd>
                        <TFTd>{isFlat ? '—' : formatDuration(e.duration_minutes)}</TFTd>
                        <TFTd>{isFlat ? '—' : `$${Number(rate).toFixed(2)}/hr`}</TFTd>
                        <TFTd>${amount.toFixed(2)}</TFTd>
                        <TFTd>
                          <TFBadge tone={status.tone}>{status.label}</TFBadge>
                        </TFTd>
                        <TFTd className="text-right space-x-2">
                          <TFButton variant="link" size="sm" onClick={() => openEditModal(e)}>
                            Edit
                          </TFButton>
                          {!hasRunning && e.duration_minutes > 0 && canResume(e) && (
                            <TFButton
                              variant="link"
                              size="sm"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() =>
                                resumeEntry.mutate({
                                  id: e.id,
                                  name: e.project_name,
                                  desc: e.description || '',
                                  duration: formatDuration(e.duration_minutes),
                                })
                              }
                            >
                              Resume
                            </TFButton>
                          )}
                          {e.duration_minutes > 0 && (
                            <TFButton
                              variant="link"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() =>
                                setConfirmAction({
                                  message: `Create a $${amount.toFixed(2)} credit for this entry?`,
                                  onConfirm: () => creditEntry.mutate(e.id),
                                })
                              }
                            >
                              Credit
                            </TFButton>
                          )}
                          {!e.invoice_id && (
                            <TFButton
                              variant="linkDanger"
                              size="sm"
                              onClick={() =>
                                setConfirmAction({
                                  message: 'Delete this time entry?',
                                  onConfirm: () => removeEntry.mutate(e.id),
                                })
                              }
                            >
                              Delete
                            </TFButton>
                          )}
                        </TFTd>
                      </TFTr>
                    );
                  })}
              </TFTBody>
            </TFTable>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y">
            {[...completed]
              .sort(
                (a, b) =>
                  new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime(),
              )
              .map((e) => {
                const isFlat = e.flat_amount != null;
                const rate = e.rate_override ?? e.default_rate;
                const amount = isFlat
                  ? Number(e.flat_amount)
                  : (e.duration_minutes / 60) * Number(rate);
                const status = entryStatus(e);
                const tooltip = [
                  e.description ? `Description: ${e.description}` : null,
                  e.start_time
                    ? `Start: ${isFlat ? formatDate(e.start_time) : formatTime(e.start_time)}`
                    : null,
                  e.end_time
                    ? `End: ${isFlat ? formatDate(e.end_time) : formatTime(e.end_time)}`
                    : null,
                  !isFlat ? `Rate: $${Number(rate).toFixed(2)}/hr` : null,
                  !isFlat ? `Duration: ${formatDuration(e.duration_minutes)}` : null,
                  `Client: ${e.client_name}`,
                ]
                  .filter(Boolean)
                  .join('\n');
                return (
                  <div key={e.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-sm truncate">{e.project_name}</span>
                          <TFBadge tone={status.tone} size="sm">
                            {status.label}
                          </TFBadge>
                          <TFButton
                            variant="ghost"
                            size="xs"
                            title={tooltip}
                            className="text-gray-400 hover:text-gray-600 shrink-0 px-1 py-1"
                            onClick={(ev) => {
                              ev.preventDefault();
                              alert(tooltip);
                            }}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </TFButton>
                        </div>
                        {e.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{e.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>
                            {e.start_time ? new Date(e.start_time).toLocaleDateString() : '—'}
                          </span>
                          <span className="font-medium text-gray-700">
                            {isFlat ? 'Flat' : formatDuration(e.duration_minutes)}
                          </span>
                          <span className="font-semibold text-gray-900">
                            ${amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
                        <TFButton variant="link" size="xs" onClick={() => openEditModal(e)}>
                          Edit
                        </TFButton>
                        {!hasRunning && e.duration_minutes > 0 && canResume(e) && (
                          <TFButton
                            variant="link"
                            size="xs"
                            className="text-orange-600 hover:text-orange-700"
                            onClick={() =>
                              resumeEntry.mutate({
                                id: e.id,
                                name: e.project_name,
                                desc: e.description || '',
                                duration: formatDuration(e.duration_minutes),
                              })
                            }
                          >
                            Resume
                          </TFButton>
                        )}
                        {e.duration_minutes > 0 && (
                          <TFButton
                            variant="link"
                            size="xs"
                            className="text-green-600 hover:text-green-700"
                            onClick={() =>
                              setConfirmAction({
                                message: `Create a $${amount.toFixed(2)} credit for this entry?`,
                                onConfirm: () => creditEntry.mutate(e.id),
                              })
                            }
                          >
                            Credit
                          </TFButton>
                        )}
                        {!e.invoice_id && (
                          <TFButton
                            variant="linkDanger"
                            size="xs"
                            onClick={() =>
                              setConfirmAction({
                                message: 'Delete this time entry?',
                                onConfirm: () => removeEntry.mutate(e.id),
                              })
                            }
                          >
                            Delete
                          </TFButton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </TFCard>
      )}

      {/* Start Timer Modal */}
      <TFDialog open={startModal.open} onOpenChange={(o) => !o && setStartModal(emptyStartModal)}>
        <TFDialogContent>
          <TFDialogHeader>
            <TFDialogTitle>Start Timer</TFDialogTitle>
          </TFDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTimer.mutate();
            }}
          >
            <TFDialogBody>
              <div className="space-y-4">
                <TFField label="Project" required>
                  <TFSelect
                    required
                    value={startModal.projectId}
                    onChange={(e) => setStartModal({ ...startModal, projectId: e.target.value })}
                  >
                    <option value="">Select Project</option>
                    {projects
                      .filter((p) => p.is_active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.client_name})
                        </option>
                      ))}
                  </TFSelect>
                </TFField>
                <TFField label="Description">
                  <TFInput
                    value={startModal.description}
                    onChange={(e) =>
                      setStartModal({ ...startModal, description: e.target.value })
                    }
                  />
                </TFField>
                <TFField label="Rate Override ($/hr)">
                  <TFInput
                    type="number"
                    step="0.01"
                    value={startModal.rateOverride}
                    onChange={(e) =>
                      setStartModal({ ...startModal, rateOverride: e.target.value })
                    }
                  />
                </TFField>
                <TFField label="Start Time">
                  <TFRadioGroup orientation="horizontal" className="mb-2">
                    <TFRadio
                      id="start-time-now"
                      name="start-time-mode"
                      checked={startModal.useCurrentTime}
                      onChange={() => setStartModal({ ...startModal, useCurrentTime: true })}
                      label="Use current time"
                    />
                    <TFRadio
                      id="start-time-manual"
                      name="start-time-mode"
                      checked={!startModal.useCurrentTime}
                      onChange={() => setStartModal({ ...startModal, useCurrentTime: false })}
                      label="Set manually"
                    />
                  </TFRadioGroup>
                  {!startModal.useCurrentTime && (
                    <TFInput
                      type="datetime-local"
                      required
                      value={startModal.startTime}
                      onChange={(e) =>
                        setStartModal({ ...startModal, startTime: e.target.value })
                      }
                    />
                  )}
                </TFField>
              </div>
            </TFDialogBody>
            <TFDialogFooter>
              <TFButton type="button" variant="outline" onClick={() => setStartModal(emptyStartModal)}>
                Cancel
              </TFButton>
              <TFButton type="submit" variant="success">
                Start
              </TFButton>
            </TFDialogFooter>
          </form>
        </TFDialogContent>
      </TFDialog>

      {/* Edit Entry Modal */}
      <TFDialog open={editModal.open} onOpenChange={(o) => !o && setEditModal(emptyEditModal)}>
        <TFDialogContent>
          <TFDialogHeader>
            <TFDialogTitle>Edit Time Entry</TFDialogTitle>
          </TFDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                editModal.endTime &&
                new Date(editModal.endTime) <= new Date(editModal.startTime)
              ) {
                toast.error('End time must be after start time');
                return;
              }
              updateEntry.mutate();
            }}
          >
            <TFDialogBody>
              <div className="space-y-4">
                <TFField label="Project" required>
                  <TFSelect
                    required
                    value={editModal.projectId}
                    onChange={(e) => setEditModal({ ...editModal, projectId: e.target.value })}
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.client_name})
                      </option>
                    ))}
                  </TFSelect>
                </TFField>
                <TFField label="Description">
                  <TFInput
                    value={editModal.description}
                    onChange={(e) => setEditModal({ ...editModal, description: e.target.value })}
                  />
                </TFField>
                <TFField label="Start Time" required>
                  <TFInput
                    type="datetime-local"
                    required
                    value={editModal.startTime}
                    onChange={(e) => setEditModal({ ...editModal, startTime: e.target.value })}
                  />
                </TFField>
                <TFField label="End Time">
                  <TFInput
                    type="datetime-local"
                    value={editModal.endTime}
                    onChange={(e) => setEditModal({ ...editModal, endTime: e.target.value })}
                  />
                </TFField>
                <TFField label="Rate Override ($/hr)">
                  <TFInput
                    type="number"
                    step="0.01"
                    value={editModal.rateOverride}
                    onChange={(e) =>
                      setEditModal({ ...editModal, rateOverride: e.target.value })
                    }
                  />
                </TFField>
                <TFCheckbox
                  id="edit-billable"
                  label="Billable"
                  checked={editModal.isBillable}
                  onChange={(e) => setEditModal({ ...editModal, isBillable: e.target.checked })}
                />
              </div>
            </TFDialogBody>
            <TFDialogFooter>
              <TFButton type="button" variant="outline" onClick={() => setEditModal(emptyEditModal)}>
                Cancel
              </TFButton>
              <TFButton type="submit">Save</TFButton>
            </TFDialogFooter>
          </form>
        </TFDialogContent>
      </TFDialog>

      {/* Add Entry Modal */}
      <TFDialog open={addModal.open} onOpenChange={(o) => !o && setAddModal(emptyAddModal)}>
        <TFDialogContent>
          <TFDialogHeader>
            <TFDialogTitle>Add Entry</TFDialogTitle>
          </TFDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                addModal.isTimeBased &&
                addModal.startTime &&
                addModal.endTime &&
                new Date(addModal.endTime) <= new Date(addModal.startTime)
              ) {
                toast.error('End time must be after start time');
                return;
              }
              if (
                !addModal.isTimeBased &&
                addModal.startTime &&
                addModal.endTime &&
                new Date(addModal.endTime) < new Date(addModal.startTime)
              ) {
                toast.error('End date must be on or after start date');
                return;
              }
              addEntry.mutate();
            }}
          >
            <TFDialogBody>
              <div className="space-y-4">
                <TFField label="Project" required>
                  <TFSelect
                    required
                    value={addModal.projectId}
                    onChange={(e) => setAddModal({ ...addModal, projectId: e.target.value })}
                  >
                    <option value="">Select Project</option>
                    {projects
                      .filter((p) => p.is_active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.client_name})
                        </option>
                      ))}
                  </TFSelect>
                </TFField>
                <TFField label="Description">
                  <TFInput
                    value={addModal.description}
                    onChange={(e) => setAddModal({ ...addModal, description: e.target.value })}
                  />
                </TFField>
                <TFCheckbox
                  id="add-time-based"
                  label="Time-based entry"
                  checked={addModal.isTimeBased}
                  onChange={(e) =>
                    setAddModal({
                      ...addModal,
                      isTimeBased: e.target.checked,
                      startTime: '',
                      endTime: '',
                    })
                  }
                />
                {addModal.isTimeBased ? (
                  <>
                    <TFField label="Start Time">
                      <TFInput
                        type="datetime-local"
                        value={addModal.startTime}
                        onChange={(e) => setAddModal({ ...addModal, startTime: e.target.value })}
                      />
                    </TFField>
                    <TFField label="End Time">
                      <TFInput
                        type="datetime-local"
                        value={addModal.endTime}
                        onChange={(e) => setAddModal({ ...addModal, endTime: e.target.value })}
                      />
                    </TFField>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <TFField
                      label={
                        <>
                          Start Date{' '}
                          <span className="text-gray-400 font-normal">(optional)</span>
                        </>
                      }
                    >
                      <TFInput
                        type="date"
                        value={addModal.startTime}
                        onChange={(e) => setAddModal({ ...addModal, startTime: e.target.value })}
                      />
                    </TFField>
                    <TFField
                      label={
                        <>
                          End Date <span className="text-gray-400 font-normal">(optional)</span>
                        </>
                      }
                    >
                      <TFInput
                        type="date"
                        value={addModal.endTime}
                        onChange={(e) => setAddModal({ ...addModal, endTime: e.target.value })}
                      />
                    </TFField>
                  </div>
                )}
                {addModal.isTimeBased ? (
                  <TFField label="Rate ($/hr)">
                    <TFInput
                      type="number"
                      step="0.01"
                      placeholder="Leave blank to use project default"
                      value={addModal.rateOverride}
                      onChange={(e) =>
                        setAddModal({ ...addModal, rateOverride: e.target.value })
                      }
                    />
                  </TFField>
                ) : (
                  <TFField label="Amount ($)" required>
                    <TFInput
                      type="number"
                      step="0.01"
                      required
                      value={addModal.flatAmount}
                      onChange={(e) => setAddModal({ ...addModal, flatAmount: e.target.value })}
                    />
                  </TFField>
                )}
                <TFCheckbox
                  id="add-billable"
                  label="Billable"
                  checked={addModal.isBillable}
                  onChange={(e) => setAddModal({ ...addModal, isBillable: e.target.checked })}
                />
              </div>
            </TFDialogBody>
            <TFDialogFooter>
              <TFButton type="button" variant="outline" onClick={() => setAddModal(emptyAddModal)}>
                Cancel
              </TFButton>
              <TFButton type="submit">Add Entry</TFButton>
            </TFDialogFooter>
          </form>
        </TFDialogContent>
      </TFDialog>

      <TFConfirm
        open={!!confirmAction}
        message={confirmAction?.message || ''}
        confirmLabel="Yes"
        confirmVariant="primary"
        onConfirm={() => {
          confirmAction?.onConfirm();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
