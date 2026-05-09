import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Client } from '../types';
import {
  TFBadge,
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
  TFTable,
  TFTBody,
  TFTd,
  TFTh,
  TFTHead,
  TFTr,
} from '../components/tf';

const CLIENTS_QUERY = `query { clients { id name company email address1 address2 city state zip phone is_active created_at updated_at } }`;

function EditClientModal({ client, onClose }: { client: Partial<Client>; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Client>>({ is_active: true, ...client });
  const [validationError, setValidationError] = useState('');

  const save = useMutation({
    mutationFn: (c: Partial<Client>) => {
      const input = {
        name: c.name || null,
        company: c.company || null,
        email: c.email || null,
        address1: c.address1 || null,
        address2: c.address2 || null,
        city: c.city || null,
        state: c.state || null,
        zip: c.zip || null,
        phone: c.phone || null,
        ...(c.id ? { is_active: c.is_active } : {}),
      };
      if (c.id) {
        return gql(`mutation($id: Int!, $input: UpdateClientInput!) { updateClient(id: $id, input: $input) { id } }`,
          { id: c.id, input });
      }
      return gql(`mutation($input: CreateClientInput!) { createClient(input: $input) { id } }`, { input });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client saved');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (field: keyof Client, value: any) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <TFDialog open onOpenChange={(o) => !o && onClose()}>
      <TFDialogContent size="lg">
        <TFDialogHeader>
          <div className="flex items-center justify-between w-full">
            <TFDialogTitle>{form.id ? 'Edit Client' : 'New Client'}</TFDialogTitle>
            {form.id && (
              <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  form.is_active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${form.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                />
                {form.is_active ? 'Active' : 'Inactive'}
              </button>
            )}
          </div>
        </TFDialogHeader>
        <TFDialogBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TFField
              label={
                <>
                  Name <span className="text-gray-400 font-normal">(or company required)</span>
                </>
              }
            >
              <TFInput value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
            </TFField>
            <TFField
              label={
                <>
                  Company <span className="text-gray-400 font-normal">(or name required)</span>
                </>
              }
            >
              <TFInput value={form.company || ''} onChange={(e) => set('company', e.target.value)} />
            </TFField>
            <TFField label="Email">
              <TFInput type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
            </TFField>
            <TFField label="Phone">
              <TFInput value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
            </TFField>
            <TFField label="Address Line 1">
              <TFInput value={form.address1 || ''} onChange={(e) => set('address1', e.target.value)} />
            </TFField>
            <TFField label="Address Line 2">
              <TFInput value={form.address2 || ''} onChange={(e) => set('address2', e.target.value)} />
            </TFField>
            <TFField label="City">
              <TFInput value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
            </TFField>
            <TFField label="State">
              <TFInput value={form.state || ''} onChange={(e) => set('state', e.target.value)} />
            </TFField>
            <TFField label="Zip">
              <TFInput value={form.zip || ''} onChange={(e) => set('zip', e.target.value)} />
            </TFField>
          </div>
          {validationError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mt-3">
              {validationError}
            </p>
          )}
        </TFDialogBody>
        <TFDialogFooter>
          <TFButton variant="muted" onClick={onClose}>
            Cancel
          </TFButton>
          <TFButton
            onClick={() => {
              if (!form.name && !form.company) {
                setValidationError('A name or company is required.');
                return;
              }
              setValidationError('');
              save.mutate(form);
            }}
            disabled={save.isPending}
          >
            Save
          </TFButton>
        </TFDialogFooter>
      </TFDialogContent>
    </TFDialog>
  );
}

export default function ClientsPage() {
  const qc = useQueryClient();
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await gql<{ clients: Client[] }>(CLIENTS_QUERY)).clients,
  });

  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const remove = useMutation({
    mutationFn: (id: number) => gql(`mutation($id: Int!) { deleteClient(id: $id) }`, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted');
    },
  });

  const visibleClients = showInactive ? clients : clients.filter((c) => c.is_active !== false);

  if (isLoading) return <TFLoading />;

  return (
    <div>
      <TFPageHeader
        title="Clients"
        actions={
          <>
            <TFCheckbox
              id="clients-show-inactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              label="Show inactive"
            />
            <TFButton
              onClick={() =>
                setEditing({
                  name: '',
                  company: '',
                  email: '',
                  address1: '',
                  address2: '',
                  city: '',
                  state: '',
                  zip: '',
                  phone: '',
                })
              }
            >
              Add Client
            </TFButton>
          </>
        }
      />

      <TFCard padding="none" className="overflow-hidden">
        <TFTable>
          <TFTHead>
            <TFTr>
              <TFTh>Name</TFTh>
              <TFTh>Email</TFTh>
              <TFTh>Phone</TFTh>
              <TFTh>Status</TFTh>
              <TFTh>Actions</TFTh>
            </TFTr>
          </TFTHead>
          <TFTBody>
            {visibleClients.map((c) => (
              <TFTr key={c.id} className={c.is_active === false ? 'opacity-50' : ''}>
                <TFTd className="font-medium">{c.name || c.company}</TFTd>
                <TFTd>{c.email}</TFTd>
                <TFTd>{c.phone}</TFTd>
                <TFTd>
                  <TFBadge tone={c.is_active !== false ? 'success' : 'neutral'}>
                    {c.is_active !== false ? 'Active' : 'Inactive'}
                  </TFBadge>
                </TFTd>
                <TFTd>
                  <TFButton variant="link" size="sm" onClick={() => setEditing(c)}>
                    Edit
                  </TFButton>
                  <TFButton
                    variant="linkDanger"
                    size="sm"
                    className="ml-3"
                    onClick={() => setConfirmDeleteId(c.id)}
                  >
                    Delete
                  </TFButton>
                </TFTd>
              </TFTr>
            ))}
            {visibleClients.length === 0 && (
              <TFTr>
                <TFTd colSpan={5}>
                  <TFEmpty>No clients</TFEmpty>
                </TFTd>
              </TFTr>
            )}
          </TFTBody>
        </TFTable>
      </TFCard>

      {editing && <EditClientModal client={editing} onClose={() => setEditing(null)} />}

      <TFConfirm
        open={confirmDeleteId !== null}
        message="Delete this client?"
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
