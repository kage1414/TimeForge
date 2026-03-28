import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Client } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const CLIENTS_QUERY = `query { clients { id name company email address1 address2 city state zip phone created_at updated_at } }`;

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
      const input = { name: c.name, company: c.company || null, email: c.email || null, address1: c.address1 || null, address2: c.address2 || null, city: c.city || null, state: c.state || null, zip: c.zip || null, phone: c.phone || null };
      if (c.id) {
        return gql(`mutation($id: Int!, $input: UpdateClientInput!) { updateClient(id: $id, input: $input) { id } }`,
          { id: c.id, input });
      }
      return gql(`mutation($input: CreateClientInput!) { createClient(input: $input) { id } }`,
        { input });
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
          onClick={() => setEditing({ name: '', company: '', email: '', address1: '', address2: '', city: '', state: '', zip: '', phone: '' })}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Add Client
        </button>
      </div>

      {editing && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-4">{editing.id ? 'Edit' : 'New'} Client</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input className="border rounded p-2 w-full" value={editing.name || ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input className="border rounded p-2 w-full" value={editing.company || ''}
                onChange={(e) => setEditing({ ...editing, company: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input className="border rounded p-2 w-full" type="email" value={editing.email || ''}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="border rounded p-2 w-full" value={editing.phone || ''}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input className="border rounded p-2 w-full" value={editing.address1 || ''}
                onChange={(e) => setEditing({ ...editing, address1: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input className="border rounded p-2 w-full" value={editing.address2 || ''}
                onChange={(e) => setEditing({ ...editing, address2: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input className="border rounded p-2 w-full" value={editing.city || ''}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input className="border rounded p-2 w-full" value={editing.state || ''}
                onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
              <input className="border rounded p-2 w-full" value={editing.zip || ''}
                onChange={(e) => setEditing({ ...editing, zip: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
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
