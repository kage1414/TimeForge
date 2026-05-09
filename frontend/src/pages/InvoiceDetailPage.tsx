import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { gql } from "../api/client";
import { Invoice, UserSettings } from "../types";
import ConfirmModal from "../components/ConfirmModal";

const SETTINGS_QUERY = `query { userSettings { company first_name last_name email address1 address2 city state zip phone venmo cashapp paypal zelle smtp_host smtp_user default_email_template } }`;

const INVOICE_QUERY = `
  query($id: Int!) {
    invoice(id: $id) {
      id client_id client_name client_company client_email client_address1 client_address2 client_city client_state client_zip
      invoice_number status payment_method issue_date due_date
      subtotal tax_rate tax_amount total notes
      export_status export_error export_generated_at
      line_items { id description quantity rate amount time_entry_id }
      created_at updated_at
    }
  }
`;

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-yellow-100 text-yellow-800",
};

const statusTransitions: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: [],
  cancelled: ["draft"],
};

function SplitDropdown({
  label,
  buttonClass,
  items,
  disabled,
}: {
  label: string;
  buttonClass: string;
  items: { label: string; onClick: () => void }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={`flex items-center gap-1 px-3 py-2 rounded text-sm ${buttonClass} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {label}
        <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && !disabled && (
        <div className="absolute right-0 mt-1 bg-white border rounded-md shadow-lg z-50 min-w-[140px] py-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
    "Cash",
    ...(settings?.venmo ? [`Venmo (${settings.venmo})`] : []),
    ...(settings?.cashapp ? [`Cash App (${settings.cashapp})`] : []),
    ...(settings?.paypal ? [`PayPal (${settings.paypal})`] : []),
    ...(settings?.zelle ? [`Zelle (${settings.zelle})`] : []),
    "Other",
  ];
  const [selected, setSelected] = useState(methods[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Mark as Paid</h2>
          <p className="text-sm text-gray-500 mt-0.5">Total: ${Number(total).toFixed(2)}</p>
        </div>
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment received via</label>
          <div className="flex flex-col gap-2">
            {methods.map((m) => (
              <label key={m} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment_method"
                  value={m}
                  checked={selected === m}
                  onChange={() => setSelected(m)}
                  className="accent-indigo-600"
                />
                <span className="text-sm">{m}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button
            onClick={() => onConfirm(selected)}
            className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["invoice", id],
    queryFn: async () =>
      (await gql<{ invoice: Invoice }>(INVOICE_QUERY, { id: Number(id) }))
        .invoice,
    refetchInterval: (q) => {
      const inv = q.state.data as Invoice | undefined;
      if (inv && (inv.export_status === "pending" || inv.export_status === "generating")) {
        return 2000;
      }
      return false;
    },
  });

  const exportReady = invoice?.export_status === "ready";
  const exportBusy =
    invoice?.export_status === "pending" || invoice?.export_status === "generating";

  async function downloadExport(kind: "pdf" | "csv") {
    if (!invoice) return;
    const token = localStorage.getItem("auth_token");
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
      const a = document.createElement("a");
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
      gql(
        `mutation($id: Int!) { regenerateInvoiceExports(id: $id) { id export_status } }`,
        { id: Number(id) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      toast.success("Regenerating invoice export...");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["userSettings"],
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
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendInvoice = useMutation({
    mutationFn: async ({
      to,
      body,
      attachPdf,
    }: {
      to: string;
      body: string;
      attachPdf: boolean;
    }) => {
      return gql(
        `mutation($id: Int!, $to: String!, $body: String, $attachPdf: Boolean) { sendInvoice(id: $id, to: $to, body: $body, attachPdf: $attachPdf) }`,
        { id: Number(id), to, body: body || null, attachPdf },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice sent");
      setShowSendModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteInvoice = useMutation({
    mutationFn: () =>
      gql(`mutation($id: Int!) { deleteInvoice(id: $id) }`, { id: Number(id) }),
    onSuccess: () => {
      toast.success("Invoice deleted");
      navigate("/invoices");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportPdf = () => downloadExport("pdf");
  const exportCsv = () => downloadExport("csv");

  if (isLoading) return <div className="text-center py-12">Loading...</div>;
  if (!invoice)
    return <div className="text-center py-12">Invoice not found</div>;

  const nextStatuses = statusTransitions[invoice.status] || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            to="/invoices"
            className="text-indigo-600 hover:underline text-sm"
          >
            &larr; Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold mt-1">
            Invoice {invoice.invoice_number}
          </h1>
        </div>
        <div className="flex gap-2">
          {settings?.smtp_host && settings?.smtp_user && (
            <button
              disabled={!exportReady}
              title={exportBusy ? "Generating export..." : invoice.export_status === "failed" ? `Export failed: ${invoice.export_error || "unknown error"}` : undefined}
              onClick={() => {
                setSendTo(invoice.client_email || "");
                const name = settings?.first_name
                  ? `${settings.first_name}${settings.last_name ? " " + settings.last_name : ""}`
                  : "";
                const dueStr = new Date(invoice.issue_date).toDateString() === new Date(invoice.due_date).toDateString()
                  ? "upon receipt"
                  : "by " + new Date(invoice.due_date).toLocaleDateString();
                if (settings?.default_email_template) {
                  setSendBody(
                    settings.default_email_template
                      .replace(/\{\{client_name\}\}/g, invoice.client_name)
                      .replace(/\{\{invoice_number\}\}/g, invoice.invoice_number)
                      .replace(/\{\{total\}\}/g, `$${Number(invoice.total).toFixed(2)}`)
                      .replace(/\{\{due_date\}\}/g, dueStr)
                      .replace(/\{\{your_name\}\}/g, name)
                      .replace(/\{\{client_first_name\}\}/g, invoice.client_name.split(" ")[0] || "")
                      .replace(/\{\{client_last_name\}\}/g, invoice.client_name.split(" ").slice(1).join(" ") || ""),
                  );
                } else {
                  setSendBody(
                    `Hi ${invoice.client_name},\n\nPlease find attached invoice #${invoice.invoice_number} for $${Number(invoice.total).toFixed(2)}.\n\nPayment is due ${dueStr}.\n\nThank you for your business!\n\n${name}`,
                  );
                }
                setShowSendModal(true);
              }}
              className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Email
            </button>
          )}
          <SplitDropdown
            label={
              exportBusy
                ? "Generating..."
                : invoice.export_status === "failed"
                ? "Export Failed"
                : "Export"
            }
            buttonClass="bg-gray-600 text-white hover:bg-gray-700"
            disabled={!exportReady}
            items={[
              { label: "Export PDF", onClick: exportPdf },
              { label: "Export CSV", onClick: exportCsv },
            ]}
          />
          {invoice.export_status === "failed" && (
            <button
              onClick={() => regenerateExports.mutate()}
              className="bg-amber-600 text-white px-3 py-2 rounded text-sm hover:bg-amber-700"
            >
              Retry
            </button>
          )}
          {nextStatuses.length > 0 && (
            <SplitDropdown
              label="Mark"
              buttonClass="bg-indigo-600 text-white hover:bg-indigo-700"
              items={nextStatuses.map((s) => ({
                label: s.charAt(0).toUpperCase() + s.slice(1),
                onClick: () => {
                  if (s === "paid") {
                    setShowPaymentModal(true);
                  } else {
                    updateStatus.mutate({ status: s });
                  }
                },
              }))}
            />
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-2">Invoice Details</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Status</dt>
            <dd>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${statusColors[invoice.status]}`}
              >
                {invoice.status}
              </span>
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
                ? "Upon Receipt"
                : new Date(invoice.due_date).toLocaleDateString()}
            </dd>
          </dl>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-2">Client</h2>
          {invoice.client_company && (
            <p className="font-medium">{invoice.client_company}</p>
          )}
          {invoice.client_name && invoice.client_name !== invoice.client_company && (
            <p className={invoice.client_company ? "text-sm" : "font-medium"}>
              {invoice.client_name}
            </p>
          )}
          {invoice.client_email && (
            <p className="text-sm text-gray-500">{invoice.client_email}</p>
          )}
          {invoice.client_address1 && (
            <p className="text-sm text-gray-500">{invoice.client_address1}</p>
          )}
          {invoice.client_address2 && (
            <p className="text-sm text-gray-500">{invoice.client_address2}</p>
          )}
          {(invoice.client_city ||
            invoice.client_state ||
            invoice.client_zip) && (
            <p className="text-sm text-gray-500">
              {[invoice.client_city, invoice.client_state]
                .filter(Boolean)
                .join(", ")}
              {invoice.client_zip ? ` ${invoice.client_zip}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Line Items</h2>
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
              const creditClass = isCredit ? " text-green-600" : "";
              return (
                <tr
                  key={li.id}
                  className={`border-b last:border-0${creditClass}`}
                >
                  <td className="py-2">
                    {(() => {
                      const [first, ...rest] = li.description.split("\n");
                      const dashIdx = first.indexOf(" - ");
                      const name =
                        dashIdx >= 0 ? first.slice(0, dashIdx) : first;
                      const date = dashIdx >= 0 ? first.slice(dashIdx) : "";
                      return (
                        <>
                          <span className="font-semibold">{name}</span>
                          {date && <span>{date}</span>}
                          {rest.length > 0 && (
                            <>
                              <br />
                              <span className="italic">{rest.join("\n")}</span>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td className="py-2 text-right">
                    {li.quantity == null ? "" : Number(li.quantity).toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    {li.rate == null
                      ? ""
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
              <span className="text-gray-500">
                Tax ({Number(invoice.tax_rate)}%)
              </span>
              <span>${Number(invoice.tax_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-1 font-bold text-lg border-t mt-2 pt-2">
            <span>Total</span>
            <span>${Number(invoice.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-2">Notes</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {invoice.notes}
          </p>
        </div>
      )}

      {settings &&
        (settings.venmo ||
          settings.cashapp ||
          settings.paypal ||
          settings.zelle) && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="font-semibold mb-2">Payment Methods</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {settings.venmo && (
                <div>
                  <span className="text-gray-500">Venmo:</span> {settings.venmo}
                </div>
              )}
              {settings.cashapp && (
                <div>
                  <span className="text-gray-500">Cash App:</span>{" "}
                  {settings.cashapp}
                </div>
              )}
              {settings.paypal && (
                <div>
                  <span className="text-gray-500">PayPal:</span>{" "}
                  {settings.paypal}
                </div>
              )}
              {settings.zelle && (
                <div>
                  <span className="text-gray-500">Zelle:</span> {settings.zelle}
                </div>
              )}
            </div>
          </div>
        )}

      {showPaymentModal && invoice && (
        <PaymentModal
          total={invoice.total}
          settings={settings}
          onConfirm={(method) => {
            updateStatus.mutate({ status: "paid", payment_method: method });
            setShowPaymentModal(false);
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        message="Delete this invoice? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteInvoice.mutate();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showSendModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowSendModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">
              Send Invoice #{invoice.invoice_number}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendInvoice.mutate({ to: sendTo, body: sendBody, attachPdf });
              }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                required
                className="border rounded p-2 w-full mb-4"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder="client@example.com"
              />
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Body
              </label>
              <textarea
                className="border rounded p-2 w-full mb-4 h-40 text-sm"
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
              />
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachPdf}
                  onChange={(e) => setAttachPdf(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Attach invoice PDF
                </span>
              </label>
              <p className="text-xs text-gray-400 mb-4">
                The invoice details will be included below your message. Draft
                invoices will be marked as "sent" automatically.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendInvoice.isPending || (attachPdf && !exportReady)}
                  className="bg-green-600 text-white px-4 py-2 text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {sendInvoice.isPending
                    ? "Sending..."
                    : attachPdf && !exportReady
                    ? exportBusy
                      ? "Generating export..."
                      : "Export not ready"
                    : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
