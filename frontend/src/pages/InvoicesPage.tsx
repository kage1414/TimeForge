import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { gql } from '../api/client';
import { Invoice, Client } from '../types';
import { statusTone } from '../lib/statusTone';
import {
  TFBadge,
  TFButton,
  TFCard,
  TFEmpty,
  TFLink,
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

const INVOICES_QUERY = `
  query($client_id: Int, $status: String) {
    invoices(client_id: $client_id, status: $status) {
      id client_id client_name invoice_number status
      issue_date due_date subtotal tax_rate tax_amount
      credits_applied total notes created_at updated_at
    }
  }
`;

const CLIENTS_QUERY = `query { clients { id name company } }`;

export default function InvoicesPage() {
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const vars: any = {};
  if (filterClient) vars.client_id = Number(filterClient);
  if (filterStatus) vars.status = filterStatus;

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', filterClient, filterStatus],
    queryFn: async () => (await gql<{ invoices: Invoice[] }>(INVOICES_QUERY, vars)).invoices,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await gql<{ clients: Client[] }>(CLIENTS_QUERY)).clients,
  });

  return (
    <div>
      <TFPageHeader
        title="Invoices"
        actions={
          <TFButton asChild>
            <Link to="/invoices/new">Create Invoice</Link>
          </TFButton>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <TFSelect
          className="max-w-xs"
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.company}
            </option>
          ))}
        </TFSelect>
        <TFSelect
          className="max-w-xs"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </TFSelect>
      </div>

      {isLoading ? (
        <TFLoading />
      ) : invoices.length === 0 ? (
        <TFEmpty>No invoices found.</TFEmpty>
      ) : (
        <TFCard padding="none" className="overflow-hidden">
          <TFTable>
            <TFTHead>
              <TFTr>
                <TFTh>Invoice #</TFTh>
                <TFTh>Client</TFTh>
                <TFTh>Date</TFTh>
                <TFTh>Due</TFTh>
                <TFTh className="text-right">Billed</TFTh>
                <TFTh className="text-right">Credits</TFTh>
                <TFTh className="text-right">Total</TFTh>
                <TFTh>Status</TFTh>
              </TFTr>
            </TFTHead>
            <TFTBody>
              {invoices.map((inv) => (
                <TFTr key={inv.id}>
                  <TFTd>
                    <TFLink asChild className="font-medium">
                      <Link to={`/invoices/${inv.id}`}>{inv.invoice_number}</Link>
                    </TFLink>
                  </TFTd>
                  <TFTd>
                    <TFLink asChild className="font-medium">
                      <Link to={`/invoices/${inv.id}`}>{inv.client_name}</Link>
                    </TFLink>
                  </TFTd>
                  <TFTd>{new Date(inv.issue_date).toLocaleDateString()}</TFTd>
                  <TFTd>{new Date(inv.due_date).toLocaleDateString()}</TFTd>
                  <TFTd className="text-right">${Number(inv.subtotal).toFixed(2)}</TFTd>
                  <TFTd className="text-right">
                    {Number(inv.credits_applied) > 0
                      ? `-$${Number(inv.credits_applied).toFixed(2)}`
                      : '-'}
                  </TFTd>
                  <TFTd className="text-right font-medium">${Number(inv.total).toFixed(2)}</TFTd>
                  <TFTd>
                    <TFBadge tone={statusTone(inv.status)}>{inv.status}</TFBadge>
                  </TFTd>
                </TFTr>
              ))}
            </TFTBody>
          </TFTable>
        </TFCard>
      )}
    </div>
  );
}
