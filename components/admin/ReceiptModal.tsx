'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Calendar, User, MapPin, Clock, CheckCircle, CreditCard, Phone, Mail } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import type { ApiBooking } from '@/lib/store/api/adminApi';

export interface PaymentInfo {
  method?: string;
  reference?: string;
  status?: string;
  beneficiary?: string;
  paidAt?: string | null;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: ApiBooking;
  paymentInfo?: PaymentInfo;
}

function safeFmt(d: string | null | undefined, pattern = 'd MMM yyyy') {
  if (!d) return '—';
  try { return format(parseISO(d), pattern); } catch { return String(d); }
}

function moneyFmt(v: string | number, sym = '₦') {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return `${sym}0.00`;
  return `${sym}${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const METHOD_LABELS: Record<string, string> = {
  pos: 'POS Terminal', bank_transfer: 'Bank Transfer',
  cash: 'Cash', card: 'Card', paystack: 'Paystack (Online)',
};

/* ─── Build the full standalone receipt HTML ──────────────────────────── */
function buildReceiptHTML(booking: ApiBooking, paymentInfo?: PaymentInfo): string {
  const apt = booking.apartment_details;
  const houseRules: string | undefined = (apt as any)?.house_rules;
  const nights = booking.nights
    ?? (() => { try { return differenceInCalendarDays(parseISO(booking.check_out), parseISO(booking.check_in)); } catch { return 0; } })();

  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/SPL-LOGO.jpg` : '/SPL-LOGO.jpg';
  const now = (() => { try { return format(new Date(), "d MMM yyyy '·' h:mm a"); } catch { return new Date().toLocaleString(); } })();

  const checkIn   = safeFmt(booking.check_in,   'EEEE, d MMMM yyyy');
  const checkOut  = safeFmt(booking.check_out,  'EEEE, d MMMM yyyy');
  const arrivedAt = booking.checked_in_at ? safeFmt(booking.checked_in_at, "d MMM yyyy '·' h:mm a") : null;
  const paidAtFmt = paymentInfo?.paidAt ? safeFmt(paymentInfo.paidAt, "d MMM yyyy '·' h:mm a") : null;

  const statusBadgeClass = {
    confirmed: 'badge-confirmed', completed: 'badge-completed',
    pending: 'badge-pending', cancelled: 'badge-cancelled',
  }[booking.status] ?? 'badge-pending';

  const payStatus = paymentInfo?.status ?? booking.payment_status;
  const payMethod = paymentInfo?.method ? (METHOD_LABELS[paymentInfo.method] ?? paymentInfo.method) : null;

  const row = (label: string, value: string) => value
    ? `<div class="row"><span class="rl">${label}</span><span class="rv">${value}</span></div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Receipt – ${booking.booking_id}</title>
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;color:#1a1a1a;
      background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{width:100%;max-width:760px;margin:0 auto}
    @media print{body{margin:0}.page{max-width:100%}@page{margin:12mm 16mm;size:A4}}

    /* header */
    .hdr{background:#064e3b;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}
    .hdr-brand{display:flex;align-items:center;gap:14px}
    .logo{width:52px;height:52px;border-radius:10px;object-fit:contain;background:#fff;padding:4px;flex-shrink:0}
    .brand-name{color:#fff;font-size:19px;font-weight:900;letter-spacing:-.3px}
    .brand-sub{color:#6ee7b7;font-size:10px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;margin-top:3px}
    .hdr-right{text-align:right;color:#fff}
    .rl-label{font-size:9px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#6ee7b7}
    .ref-id{font-size:14px;font-weight:900;margin-top:3px;max-width:260px;word-break:break-all}
    .issued{font-size:10px;color:#a7f3d0;margin-top:3px}

    .accent{height:4px;background:linear-gradient(90deg,#10b981,#0d9488,#064e3b)}

    /* body */
    .body{padding:26px 32px}
    .section{margin-bottom:20px}

    /* status */
    .status-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px}
    .badge{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:30px;
      font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase}
    .badge-confirmed{background:#d1fae5;color:#065f46}
    .badge-completed{background:#dbeafe;color:#1e40af}
    .badge-pending{background:#fef3c7;color:#92400e}
    .badge-cancelled{background:#fee2e2;color:#991b1b}
    .badge-dot{width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block}
    .walkin{background:#f0fdf4;border:1px solid #86efac;color:#16a34a;
      font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;
      padding:4px 10px;border-radius:20px}

    /* section label */
    .sl{font-size:9px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;
      color:#10b981;margin-bottom:8px}

    /* info grid */
    .grid2{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
    .gcol{padding:15px 18px}
    .gcol+.gcol{border-left:1px solid #e5e7eb}
    .gcol-title{font-size:9px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#10b981;
      border-bottom:1px solid #f3f4f6;padding-bottom:7px;margin-bottom:10px}
    .row{display:flex;justify-content:space-between;align-items:flex-start;padding:3px 0;font-size:12px;gap:8px}
    .rl{color:#6b7280;flex-shrink:0}
    .rv{color:#111827;font-weight:600;text-align:right;word-break:break-all}

    /* stay table */
    table{width:100%;border-collapse:collapse}
    thead th{background:#f9fafb;font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:.8px;color:#6b7280;padding:9px 12px;text-align:left;border-bottom:1px solid #e5e7eb}
    thead th:last-child{text-align:right}
    tbody td{padding:11px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;vertical-align:top}
    tbody td:last-child{text-align:right;font-weight:700;color:#111827}
    tbody tr:last-child td{border-bottom:none}
    .td-sub{font-size:11px;color:#6b7280;margin-top:2px}
    .td-arrived{font-size:11px;color:#059669;margin-top:4px}

    /* totals */
    .sub-table{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px}
    .sub-row{display:flex;justify-content:space-between;padding:10px 16px;
      font-size:12px;border-bottom:1px solid #f3f4f6}
    .sub-row:last-child{border-bottom:none}
    .sub-total{background:#f0fdf4;font-weight:800;font-size:14px}
    .sub-total .sv{color:#059669;font-size:18px;font-weight:900}

    /* payment box */
    .pay-box{border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;margin-bottom:20px}
    .pay-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}
    .pay-item{}
    .pay-label{color:#9ca3af;font-size:10px;font-weight:600;text-transform:uppercase;
      letter-spacing:.8px;margin-bottom:3px}
    .pay-val{color:#111827;font-weight:700;font-size:12px}
    .pay-val.ok{color:#059669}
    .pay-val.fail{color:#dc2626}
    .pay-refs{border-top:1px dashed #e5e7eb;padding-top:10px;margin-top:8px;
      display:grid;grid-template-columns:1fr;gap:6px}
    .ref-label{color:#9ca3af;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
    .ref-val{font-family:'Courier New',monospace;font-size:11px;color:#374151;word-break:break-all}

    /* rules */
    .rules-box{border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:14px 18px;margin-bottom:20px}
    .rules-title{font-size:9px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#b45309;margin-bottom:8px}
    .rules-body{font-size:11.5px;color:#78350f;line-height:1.75;white-space:pre-line}

    /* special requests */
    .sreq{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;
      font-size:12px;color:#374151;line-height:1.6;margin-bottom:20px}

    /* footer */
    .footer{border-top:1px dashed #d1d5db;padding-top:16px;margin-top:4px;
      display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px}
    .footer-l{font-size:10px;color:#9ca3af;line-height:1.8}
    .footer-r{text-align:right}
    .footer-ty{font-size:12px;font-weight:800;color:#059669}
    .footer-sub{font-size:10px;color:#9ca3af;margin-top:2px}
    .footer-gen{font-size:9px;color:#d1d5db;margin-top:6px}
  </style>
</head>
<body><div class="page">

<div class="hdr">
  <div class="hdr-brand">
    <img src="${logoUrl}" class="logo" alt="Sequoia Projects"/>
    <div>
      <div class="brand-name">Sequoia Projects Ltd</div>
      <div class="brand-sub">Premium Real Estate · Abuja</div>
    </div>
  </div>
  <div class="hdr-right">
    <div class="rl-label">Official Receipt</div>
    <div class="ref-id">${booking.booking_id}</div>
    <div class="issued">Issued ${now}</div>
  </div>
</div>
<div class="accent"></div>

<div class="body">

  <div class="status-row">
    <span class="badge ${statusBadgeClass}">
      <span class="badge-dot"></span>${booking.status}
    </span>
    ${booking.is_walk_in ? '<span class="walkin">Walk-In Booking</span>' : ''}
  </div>

  <!-- Guest & Property -->
  <div class="section">
    <div class="sl">Guest &amp; Property Information</div>
    <div class="grid2">
      <div class="gcol">
        <div class="gcol-title">Guest Details</div>
        ${row('Full Name', booking.name)}
        ${row('Email', booking.email)}
        ${row('Phone', booking.phone)}
        ${row('Address', booking.address ?? '')}
        ${row('ID Type', booking.id_type ?? '')}
        ${row('Purpose', booking.purpose ?? '')}
      </div>
      <div class="gcol">
        <div class="gcol-title">Property Details</div>
        ${row('Unit', apt?.title ?? '')}
        ${row('Building', apt?.property_details?.name ?? '')}
        ${row('Location', apt?.location ?? '')}
        ${row('Guests', `${booking.guests} guest${booking.guests !== 1 ? 's' : ''}`)}
      </div>
    </div>
  </div>

  <!-- Stay details -->
  <div class="section">
    <div class="sl">Stay Details</div>
    <table>
      <thead><tr>
        <th>Description</th><th>Dates</th><th>Amount</th>
      </tr></thead>
      <tbody><tr>
        <td>
          <strong>${apt?.title ?? 'Apartment'}</strong>
          <div class="td-sub">${nights} night${nights !== 1 ? 's' : ''} accommodation</div>
        </td>
        <td>
          <div>Check-in: <strong>${checkIn}</strong></div>
          <div style="margin-top:3px">Check-out: <strong>${checkOut}</strong></div>
          ${arrivedAt ? `<div class="td-arrived">Arrived: ${arrivedAt}</div>` : ''}
        </td>
        <td>${moneyFmt(booking.total_amount, booking.currency)}</td>
      </tr></tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="sub-table">
    <div class="sub-row"><span style="color:#6b7280">Subtotal</span><span>${moneyFmt(booking.total_amount, booking.currency)}</span></div>
    <div class="sub-row"><span style="color:#6b7280">Payment Fee</span><span>₦0.00</span></div>
    <div class="sub-row sub-total"><span>Total Paid</span><span class="sv">${moneyFmt(booking.total_amount, booking.currency)}</span></div>
  </div>

  <!-- Payment info -->
  <div class="section">
    <div class="sl">Payment Information</div>
    <div class="pay-box">
      <div class="pay-grid">
        <div class="pay-item">
          <div class="pay-label">Status</div>
          <div class="pay-val ${payStatus === 'paid' || payStatus === 'successful' ? 'ok' : payStatus === 'failed' ? 'fail' : ''}">
            ${payStatus === 'paid' || payStatus === 'successful' ? '✓ Paid' : payStatus ?? 'Pending'}
          </div>
        </div>
        <div class="pay-item">
          <div class="pay-label">Amount</div>
          <div class="pay-val">${moneyFmt(booking.total_amount, booking.currency)}</div>
        </div>
        ${payMethod ? `
        <div class="pay-item">
          <div class="pay-label">Method</div>
          <div class="pay-val">${payMethod}</div>
        </div>` : ''}
        ${paymentInfo?.beneficiary ? `
        <div class="pay-item">
          <div class="pay-label">Beneficiary</div>
          <div class="pay-val">${paymentInfo.beneficiary}</div>
        </div>` : ''}
        ${paidAtFmt ? `
        <div class="pay-item">
          <div class="pay-label">Payment Date</div>
          <div class="pay-val">${paidAtFmt}</div>
        </div>` : ''}
      </div>
      ${paymentInfo?.reference ? `
      <div class="pay-refs">
        <div>
          <div class="ref-label">Payment Reference</div>
          <div class="ref-val">${paymentInfo.reference}</div>
        </div>
      </div>` : ''}
    </div>
  </div>

  ${booking.special_requests ? `
  <div class="section">
    <div class="sl">Special Requests</div>
    <div class="sreq">${booking.special_requests}</div>
  </div>` : ''}

  ${houseRules ? `
  <div class="section">
    <div class="sl" style="color:#b45309">⚠ House Rules &amp; Policies</div>
    <div class="rules-box">
      <div class="rules-body">${houseRules}</div>
    </div>
  </div>` : ''}

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

</div>
</div></body></html>`;
}

/* ─── Iframe-based print (no popup blocker) ──────────────────────────── */
function triggerPrint(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  doc.open();
  doc.write(html);
  doc.close();

  // Give the browser time to load the logo image before printing
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

/* ─── Modal ──────────────────────────────────────────────────────────── */
export default function ReceiptModal({ isOpen, onClose, booking, paymentInfo }: ReceiptModalProps) {
  const apt = booking.apartment_details;
  const houseRules: string | undefined = (apt as any)?.house_rules;
  const nights = booking.nights
    ?? (() => { try { return differenceInCalendarDays(parseISO(booking.check_out), parseISO(booking.check_in)); } catch { return 0; } })();

  const payStatus = paymentInfo?.status ?? booking.payment_status;
  const payMethod = paymentInfo?.method ? (METHOD_LABELS[paymentInfo.method] ?? paymentInfo.method) : null;
  const paidAtFmt = paymentInfo?.paidAt ? safeFmt(paymentInfo.paidAt, "d MMM yyyy '·' h:mm a") : null;

  const handlePrint = () => {
    const html = buildReceiptHTML(booking, paymentInfo);
    triggerPrint(html);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto border border-gray-200 flex flex-col"
            >
              {/* Toolbar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 flex-shrink-0 sticky top-0 bg-white rounded-t-2xl z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Printer className="h-3.5 w-3.5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Booking Receipt</p>
                    <p className="text-xs text-gray-400">{booking.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Receipt
                  </button>
                  <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* ── On-screen preview ── */}
              <div className="p-6 space-y-5">

                {/* Header preview */}
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <div className="bg-emerald-800 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={typeof window !== 'undefined' ? `${window.location.origin}/SPL-LOGO.jpg` : '/SPL-LOGO.jpg'}
                        alt="Sequoia Projects"
                        className="w-11 h-11 rounded-lg object-contain bg-white p-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-white font-black text-base">Sequoia Projects Ltd</p>
                        <p className="text-emerald-300 text-[10px] font-semibold uppercase tracking-widest">Premium Real Estate · Abuja</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-300 text-[9px] font-bold uppercase tracking-[2px]">Official Receipt</p>
                      <p className="text-white font-black text-sm mt-0.5">{booking.booking_id}</p>
                    </div>
                  </div>
                  <div className="h-1" style={{ background: 'linear-gradient(90deg,#10b981,#0d9488,#064e3b)' }} />
                </div>

                {/* Status */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                    booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    booking.status === 'pending'   ? 'bg-amber-100 text-amber-800' :
                                                      'bg-red-100 text-red-800'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {booking.status}
                  </span>
                  {booking.is_walk_in && (
                    <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
                      Walk-In Booking
                    </span>
                  )}
                </div>

                {/* Guest & property */}
                <div className="grid grid-cols-2 gap-0 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-4 border-r border-gray-200">
                    <p className="text-[9px] font-bold uppercase tracking-[1.8px] text-emerald-600 border-b border-gray-100 pb-2 mb-3 flex items-center gap-1">
                      <User className="h-3 w-3" /> Guest Details
                    </p>
                    <div className="space-y-1.5">
                      <InfoRow label="Name" value={booking.name} />
                      <InfoRow label="Email" value={booking.email} />
                      <InfoRow label="Phone" value={booking.phone} />
                      {booking.address && <InfoRow label="Address" value={booking.address} />}
                      {booking.id_type && <InfoRow label="ID Type" value={booking.id_type} />}
                      {booking.purpose && <InfoRow label="Purpose" value={booking.purpose} />}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[1.8px] text-emerald-600 border-b border-gray-100 pb-2 mb-3 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Property Details
                    </p>
                    <div className="space-y-1.5">
                      {apt?.title && <InfoRow label="Unit" value={apt.title} />}
                      {apt?.property_details?.name && <InfoRow label="Building" value={apt.property_details.name} />}
                      {apt?.location && <InfoRow label="Location" value={apt.location} />}
                      <InfoRow label="Guests" value={`${booking.guests} guest${booking.guests !== 1 ? 's' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* Stay */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[1.8px] text-emerald-600 border-b border-gray-200">
                    <Calendar className="h-3 w-3" /> Stay Details
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Check-in</span>
                      <span className="font-semibold">{safeFmt(booking.check_in, 'EEE, d MMM yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Check-out</span>
                      <span className="font-semibold">{safeFmt(booking.check_out, 'EEE, d MMM yyyy')}</span>
                    </div>
                    {booking.checked_in_at && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-gray-500"><Clock className="h-3 w-3" /> Arrived</span>
                        <span className="font-semibold text-emerald-700">{safeFmt(booking.checked_in_at, "d MMM yyyy '·' h:mm a")}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration</span>
                      <span className="font-semibold">{nights} night{nights !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-50 border-t border-emerald-100 px-4 py-3">
                    <span className="text-sm font-bold text-emerald-800">Total Amount</span>
                    <span className="text-xl font-black text-emerald-700">{moneyFmt(booking.total_amount, booking.currency)}</span>
                  </div>
                </div>

                {/* Payment */}
                {(payStatus || payMethod || paidAtFmt || paymentInfo?.reference) && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[1.8px] text-emerald-600 border-b border-gray-200">
                      <CreditCard className="h-3 w-3" /> Payment Information
                    </div>
                    <div className="p-4 space-y-2 text-sm">
                      {payStatus && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status</span>
                          <span className={`font-bold ${payStatus === 'paid' || payStatus === 'successful' ? 'text-emerald-600' : payStatus === 'failed' ? 'text-red-600' : 'text-amber-600'}`}>
                            {payStatus === 'paid' || payStatus === 'successful' ? '✓ Paid' : payStatus}
                          </span>
                        </div>
                      )}
                      {payMethod && <InfoRow label="Method" value={payMethod} />}
                      {paymentInfo?.beneficiary && <InfoRow label="Beneficiary" value={paymentInfo.beneficiary} />}
                      {paidAtFmt && <InfoRow label="Date" value={paidAtFmt} />}
                      {paymentInfo?.reference && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Reference</p>
                          <p className="font-mono text-xs text-gray-700 break-all">{paymentInfo.reference}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Special requests */}
                {booking.special_requests && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[1.8px] text-emerald-600 mb-2">Special Requests</p>
                    <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 leading-relaxed">{booking.special_requests}</p>
                  </div>
                )}

                {/* House rules */}
                {houseRules && (
                  <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[1.8px] text-amber-700 mb-2">⚠ House Rules &amp; Policies</p>
                    <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-line">{houseRules}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-dashed border-gray-200 pt-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> +234 000 000 0000</div>
                    <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> info@sequoiaprojects.com</div>
                    <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Abuja, Nigeria</div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-700">Thank you for your business!</p>
                    <p className="text-xs text-gray-400 mt-0.5">Sequoia Projects Ltd</p>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="font-semibold text-gray-800 text-right break-all">{value}</span>
    </div>
  );
}
