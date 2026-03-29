import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Invite } from '../types';
import ConfirmModal from '../components/ConfirmModal';

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
    mutationFn: (id: number) =>
      gql('mutation($id: Int!) { deleteInvite(id: $id) }', { id }),
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

  function getStatus(invite: Invite): { label: string; color: string } {
    if (invite.used_by) return { label: 'Used', color: 'bg-green-100 text-green-800' };
    if (new Date(invite.expires_at) < new Date()) return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    return { label: 'Pending', color: 'bg-blue-100 text-blue-800' };
  }

  if (isLoading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invites</h1>
        <button onClick={() => setShowCreate(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          Create Invite
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-4">New Invite</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <input className="border rounded p-2 w-full" type="email" value={email}
                placeholder="Restrict to specific email"
                onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires in (days)</label>
              <input className="border rounded p-2 w-full" type="number" min={1} max={90} value={days}
                onChange={(e) => setDays(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => create.mutate()}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Create</button>
            <button onClick={() => setShowCreate(false)}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => {
              const status = getStatus(inv);
              return (
                <tr key={inv.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>{status.label}</span>
                  </td>
                  <td className="px-4 py-3">{inv.email || '-'}</td>
                  <td className="px-4 py-3">{inv.creator_name || '-'}</td>
                  <td className="px-4 py-3">{new Date(inv.expires_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 flex gap-2">
                    {!inv.used_by && (
                      <button onClick={() => copyLink(inv.token)}
                        className="text-indigo-600 hover:underline">Copy Link</button>
                    )}
                    <button onClick={() => setConfirmDeleteId(inv.id)}
                      className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              );
            })}
            {invites.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No invites yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={confirmDeleteId !== null}
        message="Delete this invite?"
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId !== null) remove.mutate(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
