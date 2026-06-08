'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';
import { useCreateDisputeMutation } from '@/lib/store/api/disputesApi';
import type { ApiBooking } from '@/lib/store/api/adminApi';

interface RaiseDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: ApiBooking;
}

const DISPUTE_TYPES = [
  { value: 'no_show',        label: 'No Show',         desc: 'Guest did not show up' },
  { value: 'cancellation',   label: 'Cancellation',    desc: 'Dispute about cancellation' },
  { value: 'early_checkout', label: 'Early Checkout',  desc: 'Guest left before check-out date' },
  { value: 'damage',         label: 'Property Damage', desc: 'Damage caused to property' },
  { value: 'refund',         label: 'Refund Request',  desc: 'Guest requesting a refund' },
  { value: 'other',          label: 'Other',           desc: 'Other dispute type' },
] as const;

export default function RaiseDisputeModal({ isOpen, onClose, booking }: RaiseDisputeModalProps) {
  const [createDispute, { isLoading, isSuccess, error }] = useCreateDisputeMutation();
  const [disputeType, setDisputeType] = useState<typeof DISPUTE_TYPES[number]['value']>('other');
  const [description, setDescription] = useState('');

  const errorMsg = error
    ? 'data' in (error as any)
      ? (error as any).data?.detail || (error as any).data?.message || 'Failed to raise dispute'
      : 'Failed to raise dispute'
    : null;

  const handleClose = () => {
    setDisputeType('other');
    setDescription('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    try {
      await createDispute({
        booking_ref: booking.booking_id,
        dispute_type: disputeType,
        description: description.trim(),
      }).unwrap();
      setTimeout(handleClose, 1500);
    } catch {
      // error handled by RTK
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto border border-gray-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="font-bold text-gray-900">Raise Dispute</h3>
                </div>
                <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Booking info */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Booking</p>
                  <p className="text-sm font-semibold text-gray-900">{booking.name}</p>
                  <p className="text-xs text-gray-600">
                    {booking.apartment_details?.title} · {booking.check_in} → {booking.check_out}
                  </p>
                </div>

                {/* Dispute type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Dispute Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DISPUTE_TYPES.map(dt => (
                      <button
                        key={dt.value}
                        type="button"
                        onClick={() => setDisputeType(dt.value)}
                        className={`p-2.5 rounded-xl border-2 text-left transition-colors ${
                          disputeType === dt.value
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className={`text-xs font-bold ${disputeType === dt.value ? 'text-amber-800' : 'text-gray-800'}`}>
                          {dt.label}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{dt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">Description *</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder="Describe the dispute in detail..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none placeholder:text-gray-400"
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                {isSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Dispute raised successfully!
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button" onClick={handleClose}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || isSuccess || !description.trim()}
                    className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Raising…' : isSuccess ? 'Raised!' : 'Raise Dispute'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
