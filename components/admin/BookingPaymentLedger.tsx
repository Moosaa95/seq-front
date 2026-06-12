'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle, AlertCircle, Clock, CreditCard,
  Banknote, Building2, SmartphoneNfc, CalendarClock, Tag,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  useGetBookingPaymentsQuery,
  useRecordWalkInPaymentMutation,
} from '@/lib/store/api/adminApi';
import type { ApiBooking } from '@/lib/store/api/adminApi';
import { toast } from 'sonner';

interface Props {
  booking: ApiBooking;
  onClose: () => void;
  /** Renders as an inline section (no backdrop/overlay). */
  inline?: boolean;
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash:          <Banknote className="h-3.5 w-3.5" />,
  pos:           <SmartphoneNfc className="h-3.5 w-3.5" />,
  bank_transfer: <Building2 className="h-3.5 w-3.5" />,
  card:          <CreditCard className="h-3.5 w-3.5" />,
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', pos: 'POS', bank_transfer: 'Bank Transfer', card: 'Card',
};

function fmt(val: number | string | undefined, currency = '₦') {
  return `${currency}${parseFloat(String(val ?? 0)).toLocaleString(undefined, {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  })}`;
}

export default function BookingPaymentLedger({ booking, onClose, inline = false }: Props) {
  const { data, isLoading, refetch } = useGetBookingPaymentsQuery(booking.booking_id);
  const [recordPayment, { isLoading: submitting }] = useRecordWalkInPaymentMutation();

  // Pre-fill discount from existing booking discount
  const existingDiscountType = (booking.discount_type && booking.discount_type !== 'none') ? booking.discount_type : 'none';
  const existingDiscountValue = existingDiscountType !== 'none' ? (booking.discount_value ?? '') : '';

  const [form, setForm] = useState({
    payment_method: 'cash' as 'cash' | 'pos' | 'bank_transfer' | 'card',
    beneficiary_name: '',
    amount: '',
    notes: '',
    payment_due_date: '',
    discount_type: existingDiscountType as 'none' | 'fixed' | 'percentage',
    discount_value: String(existingDiscountValue),
    discount_reason: booking.discount_reason ?? '',
  });

  const currency = booking.currency || '₦';

  // Use server-computed totals when available (always fresh)
  const effectiveTotal  = data?.effective_total  ?? parseFloat((booking as any).effective_total  ?? booking.total_amount ?? '0');
  const amountPaid      = data?.amount_paid       ?? parseFloat((booking as any).amount_paid      ?? '0');
  const balanceRemaining= data?.balance_remaining ?? parseFloat((booking as any).balance_remaining ?? String(effectiveTotal));
  const paymentStatus   = data?.payment_status    ?? booking.payment_status;
  const paymentDueDate  = data?.payment_due_date  ?? (booking as any).payment_due_date;

  // Only show successful payments in history (filter out the auto-created pending entry)
  const successfulPayments = (data?.payments ?? []).filter(p => p.status === 'successful');

  // Discount preview (live, from form)
  const totalAmt = parseFloat(booking.total_amount);
  const discVal = parseFloat(form.discount_value) || 0;
  const discountAmt = form.discount_type === 'percentage'
    ? totalAmt * discVal / 100
    : form.discount_type === 'fixed' ? Math.min(discVal, totalAmt) : 0;
  const previewEffective = totalAmt - discountAmt;

  const amountNow = form.amount ? parseFloat(form.amount) : balanceRemaining;
  const isPartial = form.amount !== '' && amountNow < balanceRemaining - 0.01;
  const wouldOverpay = form.amount !== '' && amountNow > balanceRemaining + 0.01;

  // Detect if discount changed from what's already on the booking
  const discountChanged =
    form.discount_type !== (booking.discount_type ?? 'none') ||
    form.discount_value !== String(booking.discount_value ?? '');

  const handleSubmit = async () => {
    if (balanceRemaining <= 0) return;
    if (wouldOverpay) {
      toast.error(`Amount exceeds balance. Max: ${fmt(balanceRemaining, currency)}`);
      return;
    }
    try {
      const result = await recordPayment({
        bookingId: booking.booking_id,
        payment_method: form.payment_method,
        beneficiary_name: form.beneficiary_name,
        amount: amountNow,
        notes: form.notes || undefined,
        payment_due_date: form.payment_due_date || undefined,
        discount_type: form.discount_type,
        discount_value: form.discount_value ? parseFloat(form.discount_value) : undefined,
        discount_reason: form.discount_reason || undefined,
      }).unwrap();

      toast.success(result.message);
      refetch();
      setForm(f => ({ ...f, amount: '', notes: '', payment_due_date: '' }));
    } catch (err: any) {
      const msg = err?.data?.error || err?.data?.detail || 'Failed to record payment';
      toast.error(msg);
    }
  };

  const inner = (
    <div className={inline ? '' : 'bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto border border-gray-200 flex flex-col'}>
      {/* Header */}
      {!inline && (
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between z-10 rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">Payment Ledger</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {booking.name} · {booking.apartment_details?.title ?? '—'} · {booking.check_in} → {booking.check_out}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors ml-3 flex-shrink-0">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )}

      <div className={`${inline ? 'p-4' : 'p-5'} space-y-5 flex-1`}>

        {/* ── Balance Summary ── */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Summary</p>

          <div className="flex justify-between text-sm text-gray-500">
            <span>Total charge</span>
            <span className="font-medium text-gray-700">{fmt(parseFloat(booking.total_amount), currency)}</span>
          </div>

          {/* Show applied discount */}
          {(booking.discount_type && booking.discount_type !== 'none' && parseFloat((booking as any).discount_amount ?? '0') > 0) && (
            <div className="flex justify-between text-sm text-purple-600">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Discount ({booking.discount_type === 'percentage' ? `${booking.discount_value}%` : 'fixed'})
                {booking.discount_reason && <span className="text-purple-400 text-[11px]">· {booking.discount_reason}</span>}
              </span>
              <span>−{fmt((booking as any).discount_amount, currency)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-bold text-gray-800 border-t border-gray-200 pt-2">
            <span>Payable</span>
            <span>{fmt(effectiveTotal, currency)}</span>
          </div>

          <div className="flex justify-between text-sm text-emerald-700">
            <span>Paid so far</span>
            <span className="font-semibold">{fmt(amountPaid, currency)}</span>
          </div>

          {paymentStatus === 'paid' ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-1">
              <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-bold text-emerald-700">Fully paid — no balance outstanding</span>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-700">Balance due</p>
                  <p className="text-[10px] text-red-500">{booking.name} owes this amount</p>
                </div>
              </div>
              <span className="text-xl font-bold text-red-700">{fmt(balanceRemaining, currency)}</span>
            </div>
          )}

          {paymentDueDate && paymentStatus !== 'paid' && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
              <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Balance expected by <strong>{format(parseISO(paymentDueDate), 'EEE, MMM d yyyy')}</strong></span>
            </div>
          )}
        </div>

        {/* ── Payment History ── */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment History</p>
          {isLoading ? (
            <div className="text-center py-6 text-sm text-gray-400">Loading…</div>
          ) : !successfulPayments.length ? (
            <div className="text-center py-5 text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
              No payments recorded yet
            </div>
          ) : (
            <div className="space-y-2">
              {successfulPayments.map((p, i) => (
                <div key={p.id} className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mt-0.5 text-[10px] font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-900">{fmt(parseFloat(p.amount), p.currency)}</span>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                        {METHOD_ICONS[p.payment_method]}
                        {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        {p.paid_at ? format(parseISO(p.paid_at), 'MMM d yyyy · h:mm a') : format(parseISO(p.created_at), 'MMM d yyyy · h:mm a')}
                      </span>
                      {p.beneficiary_name && (
                        <span className="text-[11px] text-gray-500">· Received by <strong>{p.beneficiary_name}</strong></span>
                      )}
                    </div>
                    {p.notes && (
                      <p className="text-[11px] text-gray-500 mt-0.5 italic">{p.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Record New Payment ── */}
        {paymentStatus !== 'paid' && balanceRemaining > 0 && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Record Payment</p>

            {/* ── Discount ── always visible so admin can apply / adjust at any time */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Discount
                <span className="font-normal text-purple-400">(applies to total — change it any time)</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={form.discount_type}
                  onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as any, discount_value: '' }))}
                  className="px-2 py-1.5 border border-purple-300 rounded-lg text-xs bg-white text-gray-800 focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                >
                  <option value="none">No discount</option>
                  <option value="fixed">Fixed amount (₦)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
                {form.discount_type !== 'none' && (
                  <>
                    <input
                      type="number" min="0"
                      max={form.discount_type === 'percentage' ? '100' : undefined}
                      value={form.discount_value}
                      onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                      placeholder={form.discount_type === 'percentage' ? '% e.g. 10' : '₦ e.g. 5000'}
                      className="w-28 px-3 py-1.5 border border-purple-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={form.discount_reason}
                      onChange={e => setForm(f => ({ ...f, discount_reason: e.target.value }))}
                      placeholder="Reason e.g. loyalty, staff rate…"
                      className="flex-1 min-w-0 px-3 py-1.5 border border-purple-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    />
                  </>
                )}
              </div>
              {/* Live preview when discount is entered */}
              {form.discount_type !== 'none' && discountAmt > 0 && (
                <div className="text-xs text-purple-700 bg-purple-100 rounded-lg px-2.5 py-1.5 flex justify-between">
                  <span>New payable after discount</span>
                  <span className="font-bold">{fmt(previewEffective, currency)} <span className="font-normal text-purple-400">(saves {fmt(discountAmt, currency)})</span></span>
                </div>
              )}
              {discountChanged && (
                <p className="text-[10px] text-purple-500">Discount will update when you record this payment.</p>
              )}
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Method *</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['cash', 'pos', 'bank_transfer', 'card'] as const).map(m => (
                  <button
                    key={m} type="button"
                    onClick={() => setForm(f => ({ ...f, payment_method: m }))}
                    className={`py-2 px-1 rounded-xl text-[11px] font-semibold border-2 transition-all flex flex-col items-center gap-1 ${
                      form.payment_method === m
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    {METHOD_ICONS[m]}
                    {METHOD_LABELS[m].split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Amount Being Paid Now
                <span className="text-gray-400 font-normal ml-1">
                  (leave blank = full balance {fmt(balanceRemaining, currency)})
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">{currency}</span>
                <input
                  type="number" min="0.01" step="0.01" max={balanceRemaining}
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={balanceRemaining.toLocaleString()}
                  className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    wouldOverpay ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                />
              </div>
              {wouldOverpay && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">⚠ Exceeds balance — max is {fmt(balanceRemaining, currency)}</p>
              )}
              {isPartial && !wouldOverpay && (
                <div className="mt-1 flex justify-between text-[11px] font-medium bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 text-amber-700">
                  <span>After this payment, {booking.name} will still owe:</span>
                  <span className="font-bold">{fmt(balanceRemaining - amountNow, currency)}</span>
                </div>
              )}
            </div>

            {/* Received by */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Received By</label>
              <input
                type="text"
                value={form.beneficiary_name}
                onChange={e => setForm(f => ({ ...f, beneficiary_name: e.target.value }))}
                placeholder="Staff name who received this payment"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notes <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. First instalment, Bank ref: TXN123…"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Due date for remaining balance — only when partial */}
            {isPartial && !wouldOverpay && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <CalendarClock className="inline h-3.5 w-3.5 mr-1 text-amber-500" />
                  When is the remaining balance due?
                </label>
                <input
                  type="date"
                  value={form.payment_due_date}
                  onChange={e => setForm(f => ({ ...f, payment_due_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 border border-amber-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-amber-50"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || wouldOverpay}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
            >
              {submitting
                ? 'Recording…'
                : isPartial
                  ? `Record ${fmt(amountNow, currency)} — ${fmt(balanceRemaining - amountNow, currency)} left after`
                  : `Confirm Full Payment — ${fmt(amountNow, currency)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (inline) return inner;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          className="pointer-events-auto w-full max-w-lg"
        >
          {inner}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
