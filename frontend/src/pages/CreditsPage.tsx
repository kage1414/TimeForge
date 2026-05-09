import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Credit, Client } from '../types';
import {
  TFBadge,
  TFButton,
  TFCard,
  TFConfirm,
  TFEmpty,
  TFInput,
  TFLoading,
  TFPageHeader,
  TFSelect,
  TFTable,
  TFTBody,
  TFTd,
  TFTh,
  TFTHead,
  TFTr,
} from '../components/tf';

const CREDITS_QUERY = `
  query {
    credits {
      id client_id client_name amount remaining_amount
      description source_invoice_id applied_invoice_id created_at
    }
  }
`;

const CLIENTS_QUERY = `query { clients { id name company } }`;

export default function CreditsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: credits = [], isLoading } = useQuery<Credit[]>({
    queryKey: ['credits'],
    queryFn: async () => (await gql<{ credits: Credit[] }>(CREDITS_QUERY)).credits,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await gql<{ clients: Client[] }>(CLIENTS_QUERY)).clients,
  });

  const create = useMutation({
    mutationFn: () =>
      gql(`mutation($input: CreateCreditInput!) { createCredit(input: $input) { id } }`, {
        input: {
          client_id: Number(clientId),
          amount: Number(amount),
          description,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] });
      toast.success('Credit created');
      setShowForm(false);
      setClientId('');
      setAmount('');
      setDescription('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => gql(`mutation($id: Int!) { deleteCredit(id: $id) }`, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] });
      toast.success('Credit deleted');
    },
  });

  return (
    <div>
      <TFPageHeader
        title="Credits"
        actions={
          <TFButton onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Credit'}
          </TFButton>
        }
      />

      {showForm && (
        <TFCard className="mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <TFSelect required value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select Client *</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.company}
                </option>
              ))}
            </TFSelect>
            <TFInput
              placeholder="Amount *"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <TFInput
              placeholder="Description *"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="md:col-span-3">
              <TFButton type="submit">Create Credit</TFButton>
            </div>
          </form>
        </TFCard>
      )}

      <p className="text-sm text-gray-500 mb-4">
        Credits represent prepayments or adjustments. Available credits are automatically applied
        when creating an invoice.
      </p>

      {isLoading ? (
        <TFLoading />
      ) : credits.length === 0 ? (
        <TFEmpty>No credits yet.</TFEmpty>
      ) : (
        <TFCard padding="none" className="overflow-hidden">
          <TFTable>
            <TFTHead>
              <TFTr>
                <TFTh>Client</TFTh>
                <TFTh>Description</TFTh>
                <TFTh className="text-right">Original</TFTh>
                <TFTh className="text-right">Remaining</TFTh>
                <TFTh>Status</TFTh>
                <TFTh>Created</TFTh>
                <TFTh className="text-right">Actions</TFTh>
              </TFTr>
            </TFTHead>
            <TFTBody>
              {credits.map((c) => (
                <TFTr key={c.id}>
                  <TFTd className="font-medium">{c.client_name}</TFTd>
                  <TFTd>{c.description}</TFTd>
                  <TFTd className="text-right">${Number(c.amount).toFixed(2)}</TFTd>
                  <TFTd className="text-right">${Number(c.remaining_amount).toFixed(2)}</TFTd>
                  <TFTd>
                    <TFBadge tone={Number(c.remaining_amount) > 0 ? 'success' : 'neutral'}>
                      {Number(c.remaining_amount) > 0 ? 'Available' : 'Used'}
                    </TFBadge>
                  </TFTd>
                  <TFTd>{new Date(c.created_at).toLocaleDateString()}</TFTd>
                  <TFTd className="text-right">
                    {Number(c.remaining_amount) > 0 && (
                      <TFButton
                        variant="linkDanger"
                        size="sm"
                        onClick={() => setConfirmDeleteId(c.id)}
                      >
                        Delete
                      </TFButton>
                    )}
                  </TFTd>
                </TFTr>
              ))}
            </TFTBody>
          </TFTable>
        </TFCard>
      )}

      <TFConfirm
        open={confirmDeleteId !== null}
        message="Delete this credit?"
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
