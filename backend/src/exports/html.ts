interface LineItem {
  description: string;
  quantity: number | string | null;
  rate: number | string | null;
  amount: number | string;
}

interface InvoiceData {
  invoice_number: string;
  issue_date: string | Date;
  due_date: string | Date;
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total: number | string;
  notes: string | null;
  client_name: string | null;
  client_company: string | null;
  client_email: string | null;
  client_address1: string | null;
  client_address2: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zip: string | null;
}

interface SettingsData {
  company: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  venmo: string | null;
  cashapp: string | null;
  paypal: string | null;
  zelle: string | null;
}

function n(v: any): number {
  return Number(v ?? 0);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString();
}

export function buildInvoiceHtml(
  invoice: InvoiceData,
  lineItems: LineItem[],
  settings: SettingsData,
): string {
  const lineRows = lineItems
    .map((li) => {
      const amount = n(li.amount);
      const isCredit = amount < 0;
      const colorStyle = isCredit ? 'color:#16a34a' : '';
      const rawDesc = li.description || '';
      const [first, ...rest] = rawDesc.split('\n');
      const dashIdx = first.indexOf(' - ');
      const name = dashIdx >= 0 ? first.slice(0, dashIdx) : first;
      const datePart = dashIdx >= 0 ? first.slice(dashIdx) : '';
      const descCell = `<strong>${escapeHtml(name)}</strong>${escapeHtml(datePart)}${
        rest.length ? '<br><em>' + rest.map(escapeHtml).join('<br>') + '</em>' : ''
      }`;
      const qtyCell = li.quantity == null || li.quantity === '' ? '' : n(li.quantity).toFixed(2);
      const rateCell =
        li.rate == null || li.rate === ''
          ? ''
          : isCredit
          ? `-$${Math.abs(n(li.rate)).toFixed(2)}`
          : `$${n(li.rate).toFixed(2)}`;
      const amountCell = isCredit ? `-$${Math.abs(amount).toFixed(2)}` : `$${amount.toFixed(2)}`;
      return `<tr${isCredit ? ' style="color:#16a34a"' : ''}>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;${colorStyle}">${descCell}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;${colorStyle}">${qtyCell}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;${colorStyle}">${rateCell}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;${colorStyle}">${amountCell}</td>
      </tr>`;
    })
    .join('');

  let totalsHtml = `
    <tr><td colspan="3" style="padding:8px;text-align:right;color:#6b7280">Subtotal</td>
      <td style="padding:8px;text-align:right">$${n(invoice.subtotal).toFixed(2)}</td></tr>`;
  if (n(invoice.tax_rate) > 0) {
    totalsHtml += `<tr><td colspan="3" style="padding:8px;text-align:right;color:#6b7280">Tax (${n(invoice.tax_rate)}%)</td>
      <td style="padding:8px;text-align:right">$${n(invoice.tax_amount).toFixed(2)}</td></tr>`;
  }
  totalsHtml += `<tr style="border-top:2px solid #111"><td colspan="3" style="padding:8px;text-align:right;font-weight:bold">Total:</td>
    <td style="padding:8px;text-align:right;font-weight:bold">$${n(invoice.total).toFixed(2)}</td></tr>`;
  totalsHtml += `<tr><td colspan="3" style="padding:8px;text-align:right;font-weight:700;font-size:1.1em">Amount Due (USD):</td>
    <td style="padding:8px;text-align:right;font-weight:700;font-size:1.1em">$${n(invoice.total).toFixed(2)}</td></tr>`;

  const fullName = [settings.first_name, settings.last_name].filter(Boolean).join(' ');
  const cityStateZip =
    [settings.city, settings.state].filter(Boolean).join(', ') +
    (settings.zip ? ` ${settings.zip}` : '');
  const paymentLines = [
    settings.venmo ? `Venmo: ${settings.venmo}` : '',
    settings.cashapp ? `Cash App: ${settings.cashapp}` : '',
    settings.paypal ? `PayPal: ${settings.paypal}` : '',
    settings.zelle ? `Zelle: ${settings.zelle}` : '',
  ].filter(Boolean);

  const dueDateLabel =
    new Date(invoice.issue_date).toDateString() === new Date(invoice.due_date).toDateString()
      ? 'Upon Receipt'
      : formatDate(invoice.due_date);

  const clientCityState =
    invoice.client_city || invoice.client_state || invoice.client_zip
      ? `<p style="margin:2px 0">${[invoice.client_city, invoice.client_state]
          .filter(Boolean)
          .join(', ')}${invoice.client_zip ? ` ${invoice.client_zip}` : ''}</p>`
      : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(
    invoice.invoice_number,
  )}</title>
    <style>@media print { body { margin: 20px; } }</style></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:40px;color:#111;font-size:14px">

    <div style="text-align:right;margin-bottom:32px">
      <h1 style="margin:0;font-size:36px;text-transform:uppercase;letter-spacing:2px">INVOICE</h1>
      ${
        paymentLines.length
          ? `<div style="margin:4px 0 16px;color:#6b7280;font-size:13px">${paymentLines
              .map((l) => `<p style="margin:2px 0">${escapeHtml(l)}</p>`)
              .join('')}</div>`
          : '<div style="margin-bottom:16px"></div>'
      }
      ${
        settings.company
          ? `<p style="margin:2px 0;font-weight:700;font-size:16px">${escapeHtml(settings.company)}</p>`
          : ''
      }
      ${fullName ? `<p style="margin:2px 0;font-weight:600">${escapeHtml(fullName)}</p>` : ''}
      ${settings.address1 ? `<p style="margin:2px 0">${escapeHtml(settings.address1)}</p>` : ''}
      ${settings.address2 ? `<p style="margin:2px 0">${escapeHtml(settings.address2)}</p>` : ''}
      ${cityStateZip ? `<p style="margin:2px 0">${escapeHtml(cityStateZip)}</p>` : ''}
      ${
        settings.phone
          ? `<p style="margin:8px 0 0;color:#6b7280">${escapeHtml(settings.phone)}</p>`
          : ''
      }
      ${settings.email ? `<p style="margin:2px 0;color:#6b7280">${escapeHtml(settings.email)}</p>` : ''}
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px" />

    <div style="display:flex;justify-content:space-between;margin-bottom:32px">
      <div>
        <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px">Bill To</p>
        ${
          invoice.client_company
            ? `<p style="margin:2px 0;font-weight:700">${escapeHtml(invoice.client_company)}</p>`
            : ''
        }
        ${
          invoice.client_name && invoice.client_name !== invoice.client_company
            ? `<p style="margin:2px 0;font-weight:${
                invoice.client_company ? '500' : '600'
              }">${escapeHtml(invoice.client_name)}</p>`
            : ''
        }
        ${
          invoice.client_address1
            ? `<p style="margin:2px 0">${escapeHtml(invoice.client_address1)}</p>`
            : ''
        }
        ${
          invoice.client_address2
            ? `<p style="margin:2px 0">${escapeHtml(invoice.client_address2)}</p>`
            : ''
        }
        ${clientCityState}
        ${
          invoice.client_email
            ? `<p style="margin:6px 0 0;color:#6b7280">${escapeHtml(invoice.client_email)}</p>`
            : ''
        }
      </div>
      <div style="text-align:right">
        <table style="margin-left:auto;border-collapse:collapse">
          <tr><td style="padding:4px 12px;font-size:14px;color:#6b7280;text-align:right">Invoice Number:</td>
            <td style="padding:4px 12px;font-size:14px;text-align:right;font-weight:500">${escapeHtml(
              invoice.invoice_number,
            )}</td></tr>
          <tr><td style="padding:4px 12px;font-size:14px;color:#6b7280;text-align:right">Invoice Date:</td>
            <td style="padding:4px 12px;font-size:14px;text-align:right">${formatDate(
              invoice.issue_date,
            )}</td></tr>
          <tr><td style="padding:4px 12px;font-size:14px;color:#6b7280;text-align:right">Payment Due:</td>
            <td style="padding:4px 12px;font-size:14px;text-align:right">${dueDateLabel}</td></tr>
          <tr style="font-weight:600"><td style="padding:4px 12px;font-size:14px;padding-top:8px;text-align:right">Amount Due (USD):</td>
            <td style="padding:4px 12px;font-size:14px;padding-top:8px;text-align:right">$${n(
              invoice.total,
            ).toFixed(2)}</td></tr>
        </table>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="text-align:left;padding:10px 8px;border-top:2px solid #111;border-bottom:2px solid #111;font-size:13px;color:#111">Services</th>
        <th style="text-align:right;padding:10px 8px;border-top:2px solid #111;border-bottom:2px solid #111;font-size:13px;color:#111">Hours</th>
        <th style="text-align:right;padding:10px 8px;border-top:2px solid #111;border-bottom:2px solid #111;font-size:13px;color:#111">Rate</th>
        <th style="text-align:right;padding:10px 8px;border-top:2px solid #111;border-bottom:2px solid #111;font-size:13px;color:#111">Amount</th>
      </tr></thead>
      <tbody>${lineRows}</tbody>
      <tfoot>${totalsHtml}</tfoot>
    </table>

    ${
      invoice.notes
        ? `<div style="margin-top:32px"><p style="font-weight:600;margin-bottom:4px;color:#6b7280">Notes</p><p style="color:#374151;white-space:pre-wrap">${escapeHtml(
            invoice.notes,
          )}</p></div>`
        : ''
    }
    </body></html>`;
}

export function buildInvoiceCsv(
  invoice: InvoiceData,
  lineItems: LineItem[],
): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows: string[][] = [['Description', 'Quantity (hrs)', 'Rate', 'Amount']];
  for (const li of lineItems) {
    rows.push([
      escape(li.description || ''),
      li.quantity == null || li.quantity === '' ? '' : Number(li.quantity).toFixed(2),
      li.rate == null || li.rate === '' ? '' : Number(li.rate).toFixed(2),
      Number(li.amount).toFixed(2),
    ]);
  }
  rows.push([]);
  rows.push(['Subtotal', '', '', Number(invoice.subtotal).toFixed(2)]);
  if (Number(invoice.tax_rate) > 0) {
    rows.push([
      `Tax (${Number(invoice.tax_rate)}%)`,
      '',
      '',
      Number(invoice.tax_amount).toFixed(2),
    ]);
  }
  rows.push(['Total', '', '', Number(invoice.total).toFixed(2)]);
  return rows.map((r) => r.join(',')).join('\n');
}
