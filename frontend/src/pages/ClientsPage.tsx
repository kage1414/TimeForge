import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Client } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const CLIENTS_QUERY = `query { clients { id name email address phone created_at updated_at } }`;

export default function ClientsPage() {
  const qc = useQueryClient();
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await gql<{ clients: Client[] }>(CLIENTS_QUERY)).clients,
  });

  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const save = useMutation({
    mutationFn: (c: Partial<Client>) => {
      if (c.id) {
        return gql(`mutation($id: Int!, $input: UpdateClientInput!) { updateClient(id: $id, input: $input) { id } }`,
          { id: c.id, input: { name: c.name, email: c.email, address: c.address, phone: c.phone } });
      }
      return gql(`mutation($input: CreateClientInput!) { createClient(input: $input) { id } }`,
        { input: { name: c.name, email: c.email, address: c.address, phone: c.phone } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setEditing(null);
      toast.success('Client saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      gql(`mutation($id: Int!) { deleteClient(id: $id) }`, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted');
    },
  });

  if (isLoading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button
          onClick={() => setEditing({ name: '', email: '', address: '', phone: '' })}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Add Client
        </button>
      </div>

      {editing && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-3">{editing.id ? 'Edit' : 'New'} Client</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="border rounded px-3 py-2" placeholder="Name *" value={editing.name || ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Email" value={editing.email || ''}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Phone" value={editing.phone || ''}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Address" value={editing.address || ''}
              onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => save.mutate(editing)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Save</button>
            <button onClick={() => setEditing(null)}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setEditing(c)} className="text-indigo-600 hover:underline mr-3">Edit</button>
                  <button onClick={() => setConfirmDeleteId(c.id)}
                    className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No clients yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={confirmDeleteId !== null}
        message="Delete this client?"
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId !== null) remove.mutate(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
