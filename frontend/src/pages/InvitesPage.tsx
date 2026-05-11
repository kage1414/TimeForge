import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Invite } from '../types';
import {
  TFBadge,
  TFBadgeTone,
  TFButton,
  TFCard,
  TFCardTitle,
  TFConfirm,
  TFEmpty,
  TFField,
  TFInput,
  TFLoading,
  TFPageHeader,
  TFTable,
  TFTBody,
  TFTd,
  TFTh,
  TFTHead,
  TFTr,
} from '../components/tf';

const INVITES_QUERY = `query { invites { id token email created_by creator_name used_by used_at expires_at created_at } }`;

export default function InvitesPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(7);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: invites = [], isLoading } = useQuery<Invite[]>({
    queryKey: ['invites'],
    queryFn: async () => (await gql<{ invites: Invite[] }>(INVITES_QUERY)).invites,
  });

  const create = useMutation({
    mutationFn: () =>
      gql('mutation($input: CreateInviteInput) { createInvite(input: $input) { id } }', {
        input: { email: email || null, expires_in_days: days },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites'] });
      setShowCreate(false);
      setEmail('');
      setDays(7);
      toast.success('Invite created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => gql('mutation($id: Int!) { deleteInvite(id: $id) }', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites'] });
      toast.success('Invite deleted');
    },
  });

  function copyLink(token: string) {
    const url = `${window.location.origin}/signup?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied');
  }

  function getStatus(invite: Invite): { label: string; tone: TFBadgeTone } {
    if (invite.used_by) return { label: 'Used', tone: 'success' };
    if (new Date(invite.expires_at) < new Date()) return { label: 'Expired', tone: 'danger' };
    return { label: 'Pending', tone: 'info' };
  }

  if (isLoading) return <TFLoading />;

  return (
    <div>
      <TFPageHeader
        title="Invites"
        actions={<TFButton onClick={() => setShowCreate(true)}>Create Invite</TFButton>}
      />

      {showCreate && (
        <TFCard className="mb-6">
          <TFCardTitle className="mb-4">New Invite</TFCardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TFField label="Email (optional)">
              <TFInput
                type="email"
                value={email}
                placeholder="Restrict to specific email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </TFField>
            <TFField label="Expires in (days)">
              <TFInput
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </TFField>
          </div>
          <div className="flex gap-2 mt-4">
            <TFButton onClick={() => create.mutate()}>Create</TFButton>
            <TFButton variant="muted" onClick={() => setShowCreate(false)}>
              Cancel
            </TFButton>
          </div>
        </TFCard>
      )}

      <TFCard padding="none" className="overflow-hidden">
        <TFTable>
          <TFTHead>
            <TFTr>
              <TFTh>Status</TFTh>
              <TFTh>Email</TFTh>
              <TFTh>Created By</TFTh>
              <TFTh>Expires</TFTh>
              <TFTh>Actions</TFTh>
            </TFTr>
          </TFTHead>
          <TFTBody>
            {invites.map((inv) => {
              const status = getStatus(inv);
              return (
                <TFTr key={inv.id}>
                  <TFTd>
                    <TFBadge tone={status.tone}>{status.label}</TFBadge>
                  </TFTd>
                  <TFTd>{inv.email || '-'}</TFTd>
                  <TFTd>{inv.creator_name || '-'}</TFTd>
                  <TFTd>{new Date(inv.expires_at).toLocaleDateString()}</TFTd>
                  <TFTd className="space-x-2">
                    {!inv.used_by && (
                      <TFButton variant="link" size="sm" onClick={() => copyLink(inv.token)}>
                        Copy Link
                      </TFButton>
                    )}
                    <TFButton
                      variant="linkDanger"
                      size="sm"
                      onClick={() => setConfirmDeleteId(inv.id)}
                    >
                      Delete
                    </TFButton>
                  </TFTd>
                </TFTr>
              );
            })}
            {invites.length === 0 && (
              <TFTr>
                <TFTd colSpan={5}>
                  <TFEmpty>No invites yet</TFEmpty>
                </TFTd>
              </TFTr>
            )}
          </TFTBody>
        </TFTable>
      </TFCard>

      <TFConfirm
        open={confirmDeleteId !== null}
        message="Delete this invite?"
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
