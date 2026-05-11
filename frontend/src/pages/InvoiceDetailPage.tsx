import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Invoice, UserSettings } from '../types';
import { statusTone } from '../lib/statusTone';
import {
  TFBadge,
  TFButton,
  TFButtonMenu,
  TFCard,
  TFCardTitle,
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
  TFLink,
  TFLoading,
  TFRadio,
  TFRadioGroup,
  TFTextarea,
} from '../components/tf';

const SETTINGS_QUERY = `query { userSettings { company first_name last_name email address1 address2 city state zip phone venmo cashapp paypal zelle smtp_host smtp_user default_email_template } }`;

const INVOICE_QUERY = `
  query($id: Int!) {
    invoice(id: $id) {
      id client_id client_name client_company client_email client_address1 client_address2 client_city client_state client_zip
      client_default_email_template
      invoice_number status payment_method issue_date due_date
      subtotal tax_rate tax_amount total notes
      export_status export_error export_generated_at
      line_items { id description quantity rate amount time_entry_id }
      created_at updated_at
    }
  }
`;

const statusTransitions: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid: [],
  cancelled: ['draft'],
};

function PaymentModal({
  total,
  settings,
  onConfirm,
  onClose,
}: {
  total: number;
  settings: UserSettings | undefined;
  onConfirm: (method: string) => void;
  onClose: () => void;
}) {
  const methods = [
    'Cash',
    ...(settings?.venmo ? [`Venmo (${settings.venmo})`] : []),
    ...(settings?.cashapp ? [`Cash App (${settings.cashapp})`] : []),
    ...(settings?.paypal ? [`PayPal (${settings.paypal})`] : []),
    ...(settings?.zelle ? [`Zelle (${settings.zelle})`] : []),
    'Other',
  ];
  const [selected, setSelected] = useState(methods[0]);

  return (
    <TFDialog open onOpenChange={(o) => !o && onClose()}>
      <TFDialogContent size="sm">
        <TFDialogHeader>
          <TFDialogTitle>Mark as Paid</TFDialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">Total: ${Number(total).toFixed(2)}</p>
        </TFDialogHeader>
        <TFDialogBody>
          <p className="block text-sm font-medium text-gray-700 mb-2">Payment received via</p>
          <TFRadioGroup>
            {methods.map((m) => (
              <TFRadio
                key={m}
                id={`pm-${m}`}
                name="payment_method"
                value={m}
                checked={selected === m}
                onChange={() => setSelected(m)}
                label={m}
              />
            ))}
          </TFRadioGroup>
        </TFDialogBody>
        <TFDialogFooter>
          <TFButton variant="muted" onClick={onClose}>
            Cancel
          </TFButton>
          <TFButton variant="success" onClick={() => onConfirm(selected)}>
            Confirm
          </TFButton>
        </TFDialogFooter>
      </TFDialogContent>
    </TFDialog>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sendCc, setSendCc] = useState('');
  const [ccSelf, setCcSelf] = useState(false);
  const [attachPdf, setAttachPdf] = useState(true);

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['invoice', id],
    queryFn: async () =>
      (await gql<{ invoice: Invoice }>(INVOICE_QUERY, { id: Number(id) })).invoice,
    refetchInterval: (q) => {
      const inv = q.state.data as Invoice | undefined;
      if (inv && (inv.export_status === 'pending' || inv.export_status === 'generating')) {
        return 2000;
      }
      return false;
    },
  });

  const exportReady = invoice?.export_status === 'ready';
  const exportBusy =
    invoice?.export_status === 'pending' || invoice?.export_status === 'generating';

  async function downloadExport(kind: 'pdf' | 'csv') {
    if (!invoice) return;
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/export.${kind}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to download ${kind.toUpperCase()}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoice_number}.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || `Failed to download ${kind.toUpperCase()}`);
    }
  }

  const regenerateExports = useMutation({
    mutationFn: () =>
      gql(`mutation($id: Int!) { regenerateInvoiceExports(id: $id) { id export_status } }`, {
        id: Number(id),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      toast.success('Regenerating invoice export...');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['userSettings'],
    queryFn: async () =>
      (await gql<{ userSettings: UserSettings }>(SETTINGS_QUERY)).userSettings,
  });

  const updateStatus = useMutation({
    mutationFn: ({ status, payment_method }: { status: string; payment_method?: string }) =>
      gql(
        `mutation($id: Int!, $status: String!, $payment_method: String) { updateInvoiceStatus(id: $id, status: $status, payment_method: $payment_method) { id } }`,
        { id: Number(id), status, payment_method },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendInvoice = useMutation({
    mutationFn: async ({
      to,
      cc,
      body,
      attachPdf,
    }: {
      to: string;
      cc: string[];
      body: string;
      attachPdf: boolean;
    }) =>
      gql(
        `mutation($id: Int!, $to: String!, $cc: [String!], $body: String, $attachPdf: Boolean) { sendInvoice(id: $id, to: $to, cc: $cc, body: $body, attachPdf: $attachPdf) }`,
        { id: Number(id), to, cc: cc.length ? cc : null, body: body || null, attachPdf },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice sent');
      setShowSendModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteInvoice = useMutation({
    mutationFn: () =>
      gql(`mutation($id: Int!) { deleteInvoice(id: $id) }`, { id: Number(id) }),
    onSuccess: () => {
      toast.success('Invoice deleted');
      navigate('/invoices');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <TFLoading />;
  if (!invoice) return <TFEmpty>Invoice not found</TFEmpty>;

  const nextStatuses = statusTransitions[invoice.status] || [];

  function openSendModal() {
    setSendTo(invoice!.client_email || '');
    const name = settings?.first_name
      ? `${settings.first_name}${settings.last_name ? ' ' + settings.last_name : ''}`
      : '';
    const dueStr =
      new Date(invoice!.issue_date).toDateString() === new Date(invoice!.due_date).toDateString()
        ? 'upon receipt'
        : 'by ' + new Date(invoice!.due_date).toLocaleDateString();
    const template = invoice!.client_default_email_template || settings?.default_email_template;
    if (template) {
      setSendBody(
        template
          .replace(/\{\{client_name\}\}/g, invoice!.client_name)
          .replace(/\{\{invoice_number\}\}/g, invoice!.invoice_number)
          .replace(/\{\{total\}\}/g, `$${Number(invoice!.total).toFixed(2)}`)
          .replace(/\{\{due_date\}\}/g, dueStr)
          .replace(/\{\{your_name\}\}/g, name)
          .replace(/\{\{client_first_name\}\}/g, invoice!.client_name.split(' ')[0] || '')
          .replace(
            /\{\{client_last_name\}\}/g,
            invoice!.client_name.split(' ').slice(1).join(' ') || '',
          ),
      );
    } else {
      setSendBody(
        `Hi ${invoice!.client_name},\n\nPlease find attached invoice #${invoice!.invoice_number} for $${Number(
          invoice!.total,
        ).toFixed(2)}.\n\nPayment is due ${dueStr}.\n\nThank you for your business!\n\n${name}`,
      );
    }
    setShowSendModal(true);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <TFLink asChild>
            <Link to="/invoices">&larr; Back to Invoices</Link>
          </TFLink>
          <h1 className="text-2xl font-bold mt-1">Invoice {invoice.invoice_number}</h1>
        </div>
        <div className="flex gap-2">
          {settings?.smtp_host && settings?.smtp_user && (
            <TFButton
              variant="success"
              size="sm"
              disabled={!exportReady}
              title={
                exportBusy
                  ? 'Generating export...'
                  : invoice.export_status === 'failed'
                  ? `Export failed: ${invoice.export_error || 'unknown error'}`
                  : undefined
              }
              onClick={openSendModal}
            >
              Send Email
            </TFButton>
          )}
          <TFButtonMenu
            trigger={{
              children: exportBusy
                ? 'Generating...'
                : invoice.export_status === 'failed'
                ? 'Export Failed'
                : 'Export',
              variant: 'secondary',
              size: 'sm',
              disabled: !exportReady,
            }}
            items={[
              { label: 'Export PDF', onSelect: () => downloadExport('pdf') },
              { label: 'Export CSV', onSelect: () => downloadExport('csv') },
            ]}
          />
          {invoice.export_status === 'failed' && (
            <TFButton variant="warning" size="sm" onClick={() => regenerateExports.mutate()}>
              Retry
            </TFButton>
          )}
          {nextStatuses.length > 0 && (
            <TFButtonMenu
              trigger={{ children: 'Mark', variant: 'primary', size: 'sm' }}
              items={nextStatuses.map((s) => ({
                label: s.charAt(0).toUpperCase() + s.slice(1),
                onSelect: () => {
                  if (s === 'paid') setShowPaymentModal(true);
                  else updateStatus.mutate({ status: s });
                },
              }))}
            />
          )}
          <TFButton variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            Delete
          </TFButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <TFCard>
          <TFCardTitle className="mb-2">Invoice Details</TFCardTitle>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Status</dt>
            <dd>
              <TFBadge tone={statusTone(invoice.status)}>{invoice.status}</TFBadge>
            </dd>
            {invoice.payment_method && (
              <>
                <dt className="text-gray-500">Payment</dt>
                <dd>{invoice.payment_method}</dd>
              </>
            )}
            <dt className="text-gray-500">Issue Date</dt>
            <dd>{new Date(invoice.issue_date).toLocaleDateString()}</dd>
            <dt className="text-gray-500">Due Date</dt>
            <dd>
              {new Date(invoice.issue_date).toDateString() ===
              new Date(invoice.due_date).toDateString()
                ? 'Upon Receipt'
                : new Date(invoice.due_date).toLocaleDateString()}
            </dd>
          </dl>
        </TFCard>
        <TFCard>
          <TFCardTitle className="mb-2">Client</TFCardTitle>
          {invoice.client_company && <p className="font-medium">{invoice.client_company}</p>}
          {invoice.client_name && invoice.client_name !== invoice.client_company && (
            <p className={invoice.client_company ? 'text-sm' : 'font-medium'}>
              {invoice.client_name}
            </p>
          )}
          {invoice.client_email && <p className="text-sm text-gray-500">{invoice.client_email}</p>}
          {invoice.client_address1 && (
            <p className="text-sm text-gray-500">{invoice.client_address1}</p>
          )}
          {invoice.client_address2 && (
            <p className="text-sm text-gray-500">{invoice.client_address2}</p>
          )}
          {(invoice.client_city || invoice.client_state || invoice.client_zip) && (
            <p className="text-sm text-gray-500">
              {[invoice.client_city, invoice.client_state].filter(Boolean).join(', ')}
              {invoice.client_zip ? ` ${invoice.client_zip}` : ''}
            </p>
          )}
        </TFCard>
      </div>

      <TFCard className="mb-6">
        <TFCardTitle className="mb-3">Line Items</TFCardTitle>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Description</th>
              <th className="pb-2 text-right">Qty (hrs)</th>
              <th className="pb-2 text-right">Rate</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.line_items || []).map((li) => {
              const isCredit = Number(li.amount) < 0;
              const creditClass = isCredit ? ' text-green-600' : '';
              return (
                <tr key={li.id} className={`border-b last:border-0${creditClass}`}>
                  <td className="py-2">
                    {(() => {
                      const [first, ...rest] = li.description.split('\n');
                      const dashIdx = first.indexOf(' - ');
                      const name = dashIdx >= 0 ? first.slice(0, dashIdx) : first;
                      const date = dashIdx >= 0 ? first.slice(dashIdx) : '';
                      return (
                        <>
                          <span className="font-semibold">{name}</span>
                          {date && <span>{date}</span>}
                          {rest.length > 0 && (
                            <>
                              <br />
                              <span className="italic">{rest.join('\n')}</span>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td className="py-2 text-right">
                    {li.quantity == null ? '' : Number(li.quantity).toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    {li.rate == null
                      ? ''
                      : isCredit
                      ? `-$${Math.abs(Number(li.rate)).toFixed(2)}`
                      : `$${Number(li.rate).toFixed(2)}`}
                  </td>
                  <td className="py-2 text-right">
                    {isCredit
                      ? `-$${Math.abs(Number(li.amount)).toFixed(2)}`
                      : `$${Number(li.amount).toFixed(2)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-t mt-4 pt-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Subtotal</span>
            <span>${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          {Number(invoice.tax_rate) > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Tax ({Number(invoice.tax_rate)}%)</span>
              <span>${Number(invoice.tax_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-1 font-bold text-lg border-t mt-2 pt-2">
            <span>Total</span>
            <span>${Number(invoice.total).toFixed(2)}</span>
          </div>
        </div>
      </TFCard>

      {invoice.notes && (
        <TFCard className="mb-6">
          <TFCardTitle className="mb-2">Notes</TFCardTitle>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
        </TFCard>
      )}

      {settings && (settings.venmo || settings.cashapp || settings.paypal || settings.zelle) && (
        <TFCard className="mb-6">
          <TFCardTitle className="mb-2">Payment Methods</TFCardTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {settings.venmo && (
              <div>
                <span className="text-gray-500">Venmo:</span> {settings.venmo}
              </div>
            )}
            {settings.cashapp && (
              <div>
                <span className="text-gray-500">Cash App:</span> {settings.cashapp}
              </div>
            )}
            {settings.paypal && (
              <div>
                <span className="text-gray-500">PayPal:</span> {settings.paypal}
              </div>
            )}
            {settings.zelle && (
              <div>
                <span className="text-gray-500">Zelle:</span> {settings.zelle}
              </div>
            )}
          </div>
        </TFCard>
      )}

      {showPaymentModal && invoice && (
        <PaymentModal
          total={invoice.total}
          settings={settings}
          onConfirm={(method) => {
            updateStatus.mutate({ status: 'paid', payment_method: method });
            setShowPaymentModal(false);
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      <TFConfirm
        open={showDeleteConfirm}
        message="Delete this invoice? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteInvoice.mutate();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <TFDialog open={showSendModal} onOpenChange={setShowSendModal}>
        <TFDialogContent>
          <TFDialogHeader>
            <TFDialogTitle>Send Invoice #{invoice.invoice_number}</TFDialogTitle>
          </TFDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const ccList = sendCc
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
              if (ccSelf && settings?.email && !ccList.includes(settings.email)) {
                ccList.push(settings.email);
              }
              sendInvoice.mutate({ to: sendTo, cc: ccList, body: sendBody, attachPdf });
            }}
          >
            <TFDialogBody>
              <TFField label="Recipient Email" required>
                <TFInput
                  type="email"
                  required
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="client@example.com"
                />
              </TFField>
              <div className="mt-4">
                <TFField
                  label="CC"
                  hint="Comma-separate multiple addresses."
                >
                  <TFInput
                    type="text"
                    value={sendCc}
                    onChange={(e) => setSendCc(e.target.value)}
                    placeholder="optional@example.com"
                  />
                </TFField>
              </div>
              {settings?.email && (
                <div className="mt-2">
                  <TFCheckbox
                    id="cc-self"
                    label={`CC me (${settings.email})`}
                    checked={ccSelf}
                    onChange={(e) => setCcSelf(e.target.checked)}
                  />
                </div>
              )}
              <div className="mt-4">
                <TFField label="Email Body">
                  <TFTextarea
                    className="h-40"
                    value={sendBody}
                    onChange={(e) => setSendBody(e.target.value)}
                  />
                </TFField>
              </div>
              <div className="mt-4">
                <TFCheckbox
                  id="attach-pdf"
                  label="Attach invoice PDF"
                  checked={attachPdf}
                  onChange={(e) => setAttachPdf(e.target.checked)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                The invoice details will be included below your message. Draft invoices will be
                marked as "sent" automatically.
              </p>
            </TFDialogBody>
            <TFDialogFooter>
              <TFButton type="button" variant="muted" onClick={() => setShowSendModal(false)}>
                Cancel
              </TFButton>
              <TFButton
                type="submit"
                variant="success"
                disabled={sendInvoice.isPending || (attachPdf && !exportReady)}
              >
                {sendInvoice.isPending
                  ? 'Sending...'
                  : attachPdf && !exportReady
                  ? exportBusy
                    ? 'Generating export...'
                    : 'Export not ready'
                  : 'Send'}
              </TFButton>
            </TFDialogFooter>
          </form>
        </TFDialogContent>
      </TFDialog>
    </div>
  );
}
