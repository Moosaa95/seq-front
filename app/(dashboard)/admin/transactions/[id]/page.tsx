'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CreditCard, Calendar, DollarSign, User, Mail,
  Phone, Building2, CheckCircle, XCircle, Clock, RefreshCw, Printer,
} from 'lucide-react';
import { useGetPaymentQuery } from '@/lib/store/api/adminApi';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import type { ApiPayment } from '@/lib/store/api/adminApi';

function fmt(d: string | null | undefined, pattern = 'd MMM yyyy') {
  if (!d) return '—';
  try { return format(parseISO(d), pattern); } catch { return d; }
}
function fmtLong(d: string | null | undefined) {
  return fmt(d, 'EEEE, d MMMM yyyy');
}
function money(v: string | number, sym = '₦') {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return `${sym}${(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function printReceipt(tx: ApiPayment) {
  const b = tx.booking_details;
  const apt = b?.apartment_details;
  const houseRules = (apt as any)?.house_rules as string | undefined;
  const nights = b
    ? (() => { try { return differenceInCalendarDays(parseISO(b.check_out), parseISO(b.check_in)); } catch { return 0; } })()
    : 0;
  const logoUrl = `${window.location.origin}/SPL-LOGO.jpg`;
  const now = (() => { try { return format(new Date(), "d MMM yyyy '·' h:mm a"); } catch { return new Date().toLocaleString(); } })();

  const methodLabel = (m: string) =>
    ({ pos: 'POS Terminal', bank_transfer: 'Bank Transfer', cash: 'Cash', card: 'Card', paystack: 'Paystack (Online)' }[m] ?? m);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Receipt – ${b?.booking_id ?? 'Sequoia Projects'}</title>
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{width:100%;max-width:780px;margin:0 auto}
    @media print{body{margin:0}.page{max-width:100%}@page{margin:12mm 16mm;size:A4}}

    /* ── Header ── */
    .hdr{background:#064e3b;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}
    .hdr-brand{display:flex;align-items:center;gap:14px}
    .hdr-logo{width:52px;height:52px;border-radius:10px;object-fit:contain;background:#fff;padding:4px}
    .hdr-name{color:#fff;font-size:20px;font-weight:900;letter-spacing:-.3px}
    .hdr-sub{color:#6ee7b7;font-size:10px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;margin-top:3px}
    .hdr-right{text-align:right;color:#fff}
    .hdr-rl{font-size:9px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#6ee7b7}
    .hdr-id{font-size:15px;font-weight:900;margin-top:3px;word-break:break-all;max-width:280px}
    .hdr-date{font-size:10px;color:#a7f3d0;margin-top:3px}

    /* accent */
    .accent{height:4px;background:linear-gradient(90deg,#10b981,#0d9488,#064e3b)}

    /* ── body ── */
    .body{padding:28px 32px;display:flex;flex-direction:column;gap:20px}

    /* status banner */
    .status-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
    .badge{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:30px;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase}
    .badge-ok{background:#d1fae5;color:#065f46}
    .badge-fail{background:#fee2e2;color:#991b1b}
    .badge-pend{background:#fef3c7;color:#92400e}
    .walkin{background:#f0fdf4;border:1px solid #86efac;color:#16a34a;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:4px 10px;border-radius:20px}

    /* section label */
    .sl{font-size:9px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#10b981;margin-bottom:8px;display:flex;align-items:center;gap:6px}

    /* two-col grid */
    .grid2{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
    .gcol{padding:16px 18px}
    .gcol+.gcol{border-left:1px solid #e5e7eb}
    .gcol-title{font-size:9px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#10b981;border-bottom:1px solid #f3f4f6;padding-bottom:7px;margin-bottom:10px}
    .row{display:flex;justify-content:space-between;align-items:flex-start;padding:3px 0;font-size:12px}
    .rl{color:#6b7280}
    .rv{color:#111827;font-weight:600;text-align:right;max-width:58%;word-break:break-all}

    /* stay table */
    table{width:100%;border-collapse:collapse}
    thead th{background:#f9fafb;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;padding:9px 12px;text-align:left;border-bottom:1px solid #e5e7eb}
    thead th:last-child{text-align:right}
    tbody td{padding:11px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;vertical-align:top}
    tbody td:last-child{text-align:right;font-weight:600;color:#111827}
    tbody tr:last-child td{border-bottom:none}
    .td-sub{font-size:11px;color:#6b7280;margin-top:2px}

    /* totals */
    .subtotals{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}
    .sub-row{display:flex;justify-content:space-between;padding:10px 16px;font-size:12px;border-bottom:1px solid #f3f4f6}
    .sub-row:last-child{border-bottom:none}
    .sub-total{background:#f0fdf4;font-weight:800;font-size:14px}
    .sub-total span:last-child{color:#059669;font-size:18px;font-weight:900}

    /* payment box */
    .pay-box{border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}
    .pay-row{font-size:12px}
    .pay-label{color:#9ca3af;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px}
    .pay-val{color:#111827;font-weight:700}
    .pay-val.ok{color:#059669}
    .pay-val.fail{color:#dc2626}
    .ref-row{grid-column:1/-1;border-top:1px dashed #e5e7eb;padding-top:10px;margin-top:4px;font-size:11px}
    .ref-label{color:#9ca3af;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}
    .ref-val{font-family:'Courier New',monospace;color:#374151;word-break:break-all}

    /* house rules */
    .rules{border:1px solid #fde68a;border-radius:10px;background:#fffbeb;padding:14px 18px}
    .rules-title{font-size:9px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#b45309;margin-bottom:8px}
    .rules-body{font-size:11.5px;color:#78350f;line-height:1.75;white-space:pre-line}

    /* footer */
    .footer{border-top:1px dashed #d1d5db;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px}
    .footer-l{font-size:10px;color:#9ca3af;line-height:1.8}
    .footer-r{text-align:right}
    .footer-ty{font-size:12px;font-weight:800;color:#059669}
    .footer-sub{font-size:10px;color:#9ca3af;margin-top:2px}
    .footer-gen{font-size:9px;color:#d1d5db;margin-top:6px}
  </style>
</head>
<body><div class="page">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-brand">
      <img src="${logoUrl}" class="hdr-logo" alt="Sequoia Projects" />
      <div>
        <div class="hdr-name">Sequoia Projects Ltd</div>
        <div class="hdr-sub">Premium Real Estate · Abuja</div>
      </div>
    </div>
    <div class="hdr-right">
      <div class="hdr-rl">Official Receipt</div>
      ${b?.booking_id ? `<div class="hdr-id">${b.booking_id}</div>` : ''}
      <div class="hdr-date">Issued ${now}</div>
    </div>
  </div>
  <div class="accent"></div>

  <div class="body">

    <!-- Status row -->
    <div class="status-row">
      <span class="badge ${tx.status === 'successful' ? 'badge-ok' : tx.status === 'failed' ? 'badge-fail' : 'badge-pend'}">
        <span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block"></span>
        ${tx.status}
      </span>
      ${(b as any)?.is_walk_in ? '<span class="walkin">Walk-In Booking</span>' : ''}
    </div>

    <!-- Guest & Property -->
    <div>
      <div class="sl">Guest &amp; Property</div>
      <div class="grid2">
        <div class="gcol">
          <div class="gcol-title">Guest Information</div>
          ${b ? `
          <div class="row"><span class="rl">Full Name</span><span class="rv">${b.name}</span></div>
          <div class="row"><span class="rl">Email</span><span class="rv">${b.email}</span></div>
          <div class="row"><span class="rl">Phone</span><span class="rv">${b.phone}</span></div>
          ${(b as any).address ? `<div class="row"><span class="rl">Address</span><span class="rv">${(b as any).address}</span></div>` : ''}
          ${(b as any).id_type ? `<div class="row"><span class="rl">ID Type</span><span class="rv">${(b as any).id_type}</span></div>` : ''}
          ` : '<p style="color:#9ca3af;font-size:12px">No guest data</p>'}
        </div>
        <div class="gcol">
          <div class="gcol-title">Property Details</div>
          ${apt ? `
          <div class="row"><span class="rl">Unit</span><span class="rv">${apt.title}</span></div>
          ${apt.property_details ? `<div class="row"><span class="rl">Building</span><span class="rv">${apt.property_details.name}</span></div>` : ''}
          ${apt.location ? `<div class="row"><span class="rl">Location</span><span class="rv">${apt.location}</span></div>` : ''}
          ` : '<p style="color:#9ca3af;font-size:12px">No property data</p>'}
          ${b ? `
          <div class="row"><span class="rl">Guests</span><span class="rv">${b.guests} guest${b.guests !== 1 ? 's' : ''}</span></div>
          ${(b as any).purpose ? `<div class="row"><span class="rl">Purpose</span><span class="rv">${(b as any).purpose}</span></div>` : ''}
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Stay details -->
    ${b ? `
    <div>
      <div class="sl">Stay Details</div>
      <table>
        <thead><tr>
          <th>Description</th>
          <th>Dates</th>
          <th style="text-align:right">Amount</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>
              <strong>${apt?.title ?? 'Apartment'}</strong>
              <div class="td-sub">${nights} night${nights !== 1 ? 's' : ''} accommodation</div>
            </td>
            <td>
              <div>Check-in: <strong>${fmtLong(b.check_in)}</strong></div>
              <div style="margin-top:3px">Check-out: <strong>${fmtLong(b.check_out)}</strong></div>
              ${b.checked_in_at ? `<div style="margin-top:3px;color:#059669">Arrived: ${fmt(b.checked_in_at, "d MMM yyyy '·' h:mm a")}</div>` : ''}
            </td>
            <td>${money(b.total_amount, b.currency)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sub-totals -->
    <div>
      <div class="sl">Payment Summary</div>
      <div class="subtotals">
        <div class="sub-row"><span style="color:#6b7280">Subtotal</span><span>${money(tx.amount, tx.currency)}</span></div>
        <div class="sub-row"><span style="color:#6b7280">Payment Fee</span><span>₦0.00</span></div>
        <div class="sub-row sub-total"><span>Total Paid</span><span>${money(tx.amount, tx.currency)}</span></div>
      </div>
    </div>
    ` : ''}

    <!-- Payment details -->
    <div>
      <div class="sl">Payment Information</div>
      <div class="pay-box">
        <div class="pay-row">
          <div class="pay-label">Status</div>
          <div class="pay-val ${tx.status === 'successful' ? 'ok' : tx.status === 'failed' ? 'fail' : ''}">
            ${tx.status === 'successful' ? '✓ Successful' : tx.status === 'failed' ? '✗ Failed' : tx.status}
          </div>
        </div>
        <div class="pay-row">
          <div class="pay-label">Amount</div>
          <div class="pay-val">${money(tx.amount, tx.currency)}</div>
        </div>
        <div class="pay-row">
          <div class="pay-label">Method</div>
          <div class="pay-val">${methodLabel(tx.payment_method)}</div>
        </div>
        ${tx.beneficiary_name ? `
        <div class="pay-row">
          <div class="pay-label">Beneficiary</div>
          <div class="pay-val">${tx.beneficiary_name}</div>
        </div>` : ''}
        <div class="pay-row">
          <div class="pay-label">Transaction Date</div>
          <div class="pay-val">${fmt(tx.paid_at ?? tx.created_at, 'd MMM yyyy · h:mm a')}</div>
        </div>
        <div class="pay-row">
          <div class="pay-label">Currency</div>
          <div class="pay-val">${tx.currency}</div>
        </div>
        <div class="ref-row">
          <div class="ref-label">Payment Reference</div>
          <div class="ref-val">${tx.transaction_reference}</div>
        </div>
        ${b?.booking_id ? `
        <div class="ref-row" style="border-top:none;padding-top:4px">
          <div class="ref-label">Booking Reference</div>
          <div class="ref-val">${b.booking_id}</div>
        </div>` : ''}
      </div>
    </div>

    <!-- Special requests -->
    ${b?.special_requests ? `
    <div>
      <div class="sl">Special Requests</div>
      <p style="font-size:12px;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;line-height:1.6">${b.special_requests}</p>
    </div>` : ''}

    <!-- House rules -->
    ${houseRules ? `
    <div>
      <div class="sl" style="color:#b45309">⚠ House Rules &amp; Policies</div>
      <div class="rules">
        <div class="rules-body">${houseRules}</div>
      </div>
    </div>` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-l">
        <div>📞 +234 000 000 0000</div>
        <div>✉ info@sequoiaprojects.com</div>
        <div>📍 Abuja, Nigeria</div>
        <div class="footer-gen">Generated ${now}</div>
      </div>
      <div class="footer-r">
        <div class="footer-ty">Thank you for your business!</div>
        <div class="footer-sub">We look forward to serving you again.</div>
        <div class="footer-gen">Sequoia Projects Ltd · This is an official receipt.</div>
      </div>
    </div>

  </div><!-- /body -->
</div></body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:none';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch { /* already removed */ }
      }, 1000);
    }
  }, 600);
}

export default function TransactionDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: transaction, isLoading: loading, error } = useGetPaymentQuery(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-r-transparent" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-semibold">Transaction not found</p>
          <p className="text-sm">{error && 'status' in error ? `Error: ${(error as any).status}` : "The transaction you're looking for doesn't exist."}</p>
        </div>
      </div>
    );
  }

  const b = transaction.booking_details;
  const apt = b?.apartment_details;

  const statusIcon = {
    successful: <CheckCircle className="h-6 w-6 text-emerald-600" />,
    failed:     <XCircle className="h-6 w-6 text-red-600" />,
    pending:    <Clock className="h-6 w-6 text-amber-500" />,
  }[transaction.status] ?? <RefreshCw className="h-6 w-6 text-gray-500" />;

  const statusColors: Record<string, string> = {
    successful: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    failed:     'bg-red-50 text-red-800 border-red-200',
    pending:    'bg-amber-50 text-amber-800 border-amber-200',
  };

  const methodLabel: Record<string, string> = {
    pos: 'POS Terminal', bank_transfer: 'Bank Transfer',
    cash: 'Cash', card: 'Card', paystack: 'Paystack (Online)',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

      {/* Page header */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{transaction.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main content ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Status card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Payment Status</h2>
              {statusIcon}
            </div>
            <div className={`flex items-center justify-between p-4 rounded-xl border ${statusColors[transaction.status] ?? 'bg-gray-50 border-gray-200'}`}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Current Status</p>
                <p className="text-2xl font-black capitalize">{transaction.status}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Amount</p>
                <p className="text-2xl font-black">₦{parseFloat(transaction.amount).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Payment Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: CreditCard, label: 'Reference', value: transaction.transaction_reference },
                { icon: DollarSign, label: 'Method', value: methodLabel[transaction.payment_method] ?? transaction.payment_method },
                { icon: Calendar,   label: 'Transaction Date', value: fmt(transaction.paid_at ?? transaction.created_at, "d MMM yyyy '·' h:mm a") },
                { icon: Clock,      label: 'Last Updated', value: fmt(transaction.updated_at, "d MMM yyyy '·' h:mm a") },
                ...(transaction.beneficiary_name ? [{ icon: User, label: 'Beneficiary', value: transaction.beneficiary_name }] : []),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-semibold text-gray-900 text-sm break-all">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related booking */}
          {b && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Related Booking</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: User,     label: 'Guest Name',          value: b.name },
                  { icon: Mail,     label: 'Email',               value: b.email },
                  { icon: Phone,    label: 'Phone',               value: b.phone },
                  { icon: Calendar, label: 'Check-in / Check-out', value: `${fmt(b.check_in)} – ${fmt(b.check_out)}` },
                  ...(apt ? [{ icon: Building2, label: 'Unit', value: `${apt.title}${apt.property_details ? ' · ' + apt.property_details.name : ''}` }] : []),
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="font-semibold text-gray-900 text-sm">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">

          {/* Quick actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/admin/bookings`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
              >
                <Building2 className="h-4 w-4" />
                View Booking
              </button>
              <button
                onClick={() => printReceipt(transaction)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-semibold"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
            </div>
          </div>

          {/* Payment summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Payment Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm pb-2 border-b border-gray-100">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold">₦{parseFloat(transaction.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm pb-2 border-b border-gray-100">
                <span className="text-gray-500">Payment Fee</span>
                <span className="font-semibold">₦0.00</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-emerald-600">₦{parseFloat(transaction.amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Additional info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Additional Info</h2>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Gateway</p>
                <p className="font-bold text-gray-900">Paystack</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Transaction ID</p>
                <p className="font-mono break-all text-gray-700">{transaction.id}</p>
              </div>
              {b?.booking_id && (
                <div>
                  <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Booking ID</p>
                  <p className="font-mono break-all text-gray-700">{b.booking_id}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
