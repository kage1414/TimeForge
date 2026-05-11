import type { TFBadgeTone } from '../components/tf/TFBadge';

// TimeForge-specific status → TFBadge tone mapping. Lives outside the TF library
// so the library stays free of app domain logic.
const STATUS_TONES: Record<string, TFBadgeTone> = {
  draft: 'neutral',
  sent: 'info',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'warning',
  ok: 'success',
  error: 'danger',
  pending: 'neutral',
  generating: 'info',
  ready: 'success',
  failed: 'danger',
  admin: 'purple',
  user: 'neutral',
};

export function statusTone(status: string | null | undefined): TFBadgeTone {
  if (!status) return 'neutral';
  return STATUS_TONES[status.toLowerCase()] ?? 'neutral';
}
