'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Search,
  Filter,
  MapPin,
  User,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  LayoutGrid,
  List,
  Lock,
  Unlock,
  Wrench,
  X,
} from 'lucide-react';
import AdminBookingModal from '@/components/admin/AdminBookingModal';
import CancellationModal from '@/components/admin/bookings/CancellationModal';
import BookingsCalendar from '@/components/admin/BookingsCalendar';
import RaiseDisputeModal from '@/components/admin/RaiseDisputeModal';
import ReceiptModal from '@/components/admin/ReceiptModal';
import BookingPaymentLedger from '@/components/admin/BookingPaymentLedger';
import type { ApiBooking } from '@/lib/store/api/adminApi';
import { useGetBookingsQuery, useUpdateBookingStatusMutation, useLockApartmentMutation, useUnlockApartmentMutation } from '@/lib/store/api/adminApi';
import { useGetApartmentsQuery } from '@/lib/store/api/propertyApi';
import { useGetBlockedDatesQuery, useCreateBlockedDateMutation, useDeleteBlockedDateMutation, useSyncExternalCalendarMutation } from '@/lib/store/api/calendarApi';
import { format as dateFnsFormat } from 'date-fns';
import { toast } from 'sonner';

type ViewMode = 'calendar' | 'list' | 'rooms';

export default function BookingsManagement() {
  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [walkInApartment, setWalkInApartment] = useState<any>(null);
  const [walkInCheckIn, setWalkInCheckIn] = useState<string | undefined>(undefined);
  const [disputeBooking, setDisputeBooking] = useState<ApiBooking | null>(null);
  const [receiptBooking, setReceiptBooking] = useState<ApiBooking | null>(null);
  const [paymentLedgerBooking, setPaymentLedgerBooking] = useState<ApiBooking | null>(null);

  // Load view preference from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('bookingsViewMode') as ViewMode;
    if (savedView === 'calendar' || savedView === 'list') {
      setViewMode(savedView);
    }
  }, []);

  // Save view preference to localStorage when changed
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('bookingsViewMode', mode);
  };

  // RTK Query hooks
  const { data: bookingsData, isLoading, error, refetch } = useGetBookingsQuery({ page_size: 100 });
  const { data: apartmentsData } = useGetApartmentsQuery({ page_size: 200, ordering: "title" });
  const { data: blockedDatesData } = useGetBlockedDatesQuery();
  const [updateBookingStatus] = useUpdateBookingStatusMutation();
  const [lockApartment] = useLockApartmentMutation();
  const [unlockApartment] = useUnlockApartmentMutation();
  const [createBlockedDate] = useCreateBlockedDateMutation();
  const [deleteBlockedDate] = useDeleteBlockedDateMutation();
  const [syncExternalCalendar, { isLoading: isSyncing }] = useSyncExternalCalendarMutation();
  const [syncingCalendarId, setSyncingCalendarId] = useState<string | null>(null);

  // Permanent lock state
  const [lockingId, setLockingId] = useState<string | null>(null);

  // Date-range block modal state
  const [blockModalAptId, setBlockModalAptId] = useState<string | null>(null);
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  // Legacy lock modal (kept for permanent locks)
  const [lockReason, setLockReason] = useState('');
  const [lockModalAptId, setLockModalAptId] = useState<string | null>(null);

  // iCal unlock confirmation
  const [icalUnlockTarget, setIcalUnlockTarget] = useState<{ id: string; label: string; calendarId: string | null } | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const bookings = bookingsData?.results || [];
  const apartments = (apartmentsData?.results || []).slice().sort((a, b) => a.title.localeCompare(b.title));
  const blockedDates = blockedDatesData?.results || [];

  const handleStatusUpdate = async (
    bookingId: string,
    newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  ) => {
    try {
      await updateBookingStatus({ bookingId, status: newStatus }).unwrap();
      toast.success(`Booking ${newStatus} successfully`);
    } catch (error) {
      console.error('Failed to update booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Bookings refreshed');
  };

  const handleLock = async (aptId: string, reason: string) => {
    setLockingId(aptId);
    try {
      await lockApartment({ id: aptId, reason }).unwrap();
      toast.success('Room locked for maintenance.');
      setLockModalAptId(null);
      setLockReason('');
    } catch {
      toast.error('Failed to lock room.');
    } finally {
      setLockingId(null);
    }
  };

  const handleUnlock = async (aptId: string) => {
    setLockingId(aptId);
    try {
      await unlockApartment(aptId).unwrap();
      toast.success('Room unlocked — now available for booking.');
    } catch {
      toast.error('Failed to unlock room.');
    } finally {
      setLockingId(null);
    }
  };

  const handleBlockDates = async () => {
    if (!blockModalAptId || !blockStartDate || !blockEndDate) return;
    if (blockEndDate <= blockStartDate) {
      toast.error('End date must be after start date.');
      return;
    }
    setIsBlocking(true);
    try {
      await createBlockedDate({
        apartment_id: blockModalAptId,
        start_date: blockStartDate,
        end_date: blockEndDate,
        notes: blockReason || undefined,
      }).unwrap();
      toast.success('Dates blocked — guests cannot book during this period.');
      setBlockModalAptId(null);
      setBlockStartDate('');
      setBlockEndDate('');
      setBlockReason('');
    } catch {
      toast.error('Failed to block dates.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    try {
      await deleteBlockedDate(blockId).unwrap();
      toast.success('Date block removed.');
    } catch {
      toast.error('Failed to remove block.');
    }
  };

  const handleConfirmIcalUnlock = async () => {
    if (!icalUnlockTarget) return;
    setIsUnlocking(true);
    try {
      await deleteBlockedDate(icalUnlockTarget.id).unwrap();
      toast.success('Dates unlocked — those dates are now bookable on this platform.');
      setIcalUnlockTarget(null);
    } catch {
      toast.error('Failed to unlock dates.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleResync = async (calendarId: string) => {
    setSyncingCalendarId(calendarId);
    try {
      const result = await syncExternalCalendar(calendarId).unwrap();
      toast.success(`Re-synced — ${result.created} added, ${result.updated} updated.`);
    } catch {
      toast.error('Re-sync failed.');
    } finally {
      setSyncingCalendarId(null);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.apartment_details?.title ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || booking.payment_status === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const paymentSummary = {
    paid: bookings.filter(b => b.payment_status === 'paid').length,
    partial: bookings.filter(b => b.payment_status === 'partial').length,
    unpaid: bookings.filter(b => b.payment_status === 'unpaid' || b.payment_status === 'pending').length,
    totalOutstanding: bookings
      .filter(b => b.payment_status !== 'paid')
      .reduce((sum, b) => sum + parseFloat((b as any).balance_remaining || b.total_amount || '0'), 0),
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      partial: 'bg-amber-100 text-amber-800 border border-amber-200',
      unpaid: 'bg-red-100 text-red-700 border border-red-200',
      pending: 'bg-red-100 text-red-700 border border-red-200',
      refunded: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: 'Paid in Full',
      partial: 'Part Paid',
      unpaid: 'Unpaid',
      pending: 'Unpaid',
      refunded: 'Refunded',
    };
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const fmt = (val: string | number | undefined, currency: string) =>
    `${currency}${parseFloat(String(val ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#403D3D' }}>Bookings</h1>
          <p className="text-gray-500 text-sm mt-0.5">View and manage all property bookings</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="flex rounded-lg p-1 flex-shrink-0" style={{ backgroundColor: '#403D3D20' }}>
            <button
              onClick={() => handleViewModeChange('calendar')}
              title="Calendar view"
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
              style={{ color: viewMode === 'calendar' ? '#403D3D' : '#403D3D99' }}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              title="List view"
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
              style={{ color: viewMode === 'list' ? '#403D3D' : '#403D3D99' }}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => handleViewModeChange('rooms')}
              title="Rooms view"
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${viewMode === 'rooms' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
              style={{ color: viewMode === 'rooms' ? '#403D3D' : '#403D3D99' }}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rooms</span>
            </button>
          </div>

          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create </span>Booking
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 sm:flex sm:items-center sm:gap-2 sm:px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline text-sm font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* Payment Summary Strip */}
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setPaymentFilter('all')}
          className={`rounded-xl border p-3 text-left transition-all ${paymentFilter === 'all' ? 'ring-2 ring-gray-400' : 'hover:border-gray-300'} bg-white`}
        >
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">All Bookings</p>
          <p className="text-2xl font-bold mt-0.5" style={{ color: '#403D3D' }}>{bookings.length}</p>
        </button>
        <button
          onClick={() => setPaymentFilter('paid')}
          className={`rounded-xl border p-3 text-left transition-all ${paymentFilter === 'paid' ? 'ring-2 ring-emerald-500' : 'hover:border-emerald-200'} bg-white`}
        >
          <p className="text-[11px] text-emerald-600 uppercase tracking-wide font-semibold">Paid in Full</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">{paymentSummary.paid}</p>
        </button>
        <button
          onClick={() => setPaymentFilter('partial')}
          className={`rounded-xl border p-3 text-left transition-all ${paymentFilter === 'partial' ? 'ring-2 ring-amber-500' : 'hover:border-amber-200'} bg-white`}
        >
          <p className="text-[11px] text-amber-600 uppercase tracking-wide font-semibold">Part Paid</p>
          <p className="text-2xl font-bold text-amber-600 mt-0.5">{paymentSummary.partial}</p>
        </button>
        <button
          onClick={() => setPaymentFilter('unpaid')}
          className={`rounded-xl border p-3 text-left transition-all ${paymentFilter === 'unpaid' ? 'ring-2 ring-red-400' : 'hover:border-red-200'} bg-white`}
        >
          <p className="text-[11px] text-red-600 uppercase tracking-wide font-semibold">Unpaid</p>
          <p className="text-2xl font-bold text-red-600 mt-0.5">{paymentSummary.unpaid}</p>
          {paymentSummary.totalOutstanding > 0 && (
            <p className="text-[10px] text-red-400 mt-0.5">₦{paymentSummary.totalOutstanding.toLocaleString()} outstanding</p>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-semibold">Error loading bookings</p>
          <p className="text-sm">{'message' in error ? (error as any).message : 'Something went wrong'}</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white sm:min-w-[160px]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white sm:min-w-[160px]"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid in Full</option>
            <option value="partial">Part Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading bookings...</p>
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <BookingsCalendar
          bookings={filteredBookings}
          apartments={apartments}
          blockedDates={blockedDates}
          onStatusChange={handleStatusUpdate}
          onWalkInBook={(apt, date) => {
            setWalkInApartment(apt);
            setWalkInCheckIn(date);
            setIsBookingModalOpen(true);
          }}
          onRaiseDispute={setDisputeBooking}
          onPrintReceipt={setReceiptBooking}
        />
      ) : viewMode === 'rooms' ? (
        /* Rooms / Block-Dates View */
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
              <Lock className="h-4 w-4 flex-shrink-0" />
              Block specific date ranges per room — guests cannot book during blocked periods. Use "Permanent Lock" for long-term maintenance.
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apartments.map((apt) => {
              const aptBlocks = blockedDates.filter(bd => bd.apartment === apt.id && !bd.external_calendar);
              const icalBlocks = blockedDates.filter(bd => bd.apartment === apt.id && !!bd.external_calendar);
              return (
                <div key={apt.id} className={`bg-white rounded-xl border p-4 shadow-sm flex flex-col gap-3 ${apt.is_locked ? 'border-red-300 bg-red-50/20' : 'border-gray-200'}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#403D3D' }}>{apt.title}</p>
                      <p className="text-xs text-gray-400 truncate">{apt.property_details?.name}</p>
                    </div>
                    {apt.is_locked ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">Active</span>
                    )}
                  </div>

                  {/* Permanent lock reason */}
                  {apt.is_locked && apt.lock_reason && (
                    <p className="text-xs text-red-600 italic bg-red-50 rounded-lg px-2 py-1 border border-red-100">{apt.lock_reason}</p>
                  )}

                  {/* Admin date-range blocks */}
                  {aptBlocks.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Admin Blocks</p>
                      {aptBlocks.map(bd => (
                        <div key={bd.id} className="flex items-center justify-between gap-2 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-orange-800">
                              {dateFnsFormat(new Date(bd.start_date + 'T00:00:00'), 'MMM d')} – {dateFnsFormat(new Date(bd.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                            </p>
                            {bd.notes && <p className="text-[10px] text-orange-600 truncate">{bd.notes}</p>}
                          </div>
                          <button onClick={() => handleRemoveBlock(bd.id)} className="p-1 rounded hover:bg-orange-100 text-orange-500 flex-shrink-0" title="Remove">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* iCal (Airbnb / external) blocks */}
                  {icalBlocks.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                          Synced from External Calendar ({icalBlocks.length})
                        </p>
                      </div>
                      {icalBlocks.map(bd => {
                        const source = bd.external_calendar_details?.source_display ?? 'External';
                        const label = `${dateFnsFormat(new Date(bd.start_date + 'T00:00:00'), 'MMM d')} – ${dateFnsFormat(new Date(bd.end_date + 'T00:00:00'), 'MMM d, yyyy')}`;
                        return (
                          <div key={bd.id} className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-red-800">{label}</p>
                                <p className="text-[10px] text-red-500 mt-0.5">
                                  Locked by {source} sync — guests cannot book these dates
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {bd.external_calendar && (
                                  <button
                                    onClick={() => handleResync(bd.external_calendar!)}
                                    disabled={syncingCalendarId === bd.external_calendar}
                                    className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                                  >
                                    {syncingCalendarId === bd.external_calendar ? '…' : '↻ Re-sync'}
                                  </button>
                                )}
                                <button
                                  onClick={() => setIcalUnlockTarget({ id: bd.id, label, calendarId: bd.external_calendar })}
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-red-300 text-red-700 hover:bg-red-100 transition-colors flex items-center gap-1"
                                >
                                  <Unlock className="h-3 w-3" />
                                  Unlock
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-1">
                    <button
                      onClick={() => { setBlockModalAptId(apt.id.toString()); setBlockStartDate(''); setBlockEndDate(''); setBlockReason(''); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Block Dates
                    </button>
                    {apt.is_locked ? (
                      <button
                        onClick={() => handleUnlock(apt.id.toString())}
                        disabled={lockingId === apt.id.toString()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        {lockingId === apt.id.toString() ? 'Unlocking…' : 'Unlock'}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setLockModalAptId(apt.id.toString()); setLockReason(''); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-red-200 text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Perm. Lock
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-xl text-gray-600 mb-2">No bookings found</p>
          <p className="text-gray-500">Bookings will appear here once customers make reservations</p>
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {filteredBookings.map((booking, index) => (
            <motion.div
              key={booking.booking_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Property & Customer Info */}
                <div className="lg:col-span-2">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold mb-1" style={{ color: '#403D3D' }}>
                        {booking.apartment_details?.title ?? '—'}
                      </h3>
                      <div className="flex items-center text-gray-600 text-sm">
                        <MapPin className="h-4 w-4 mr-1" />
                        {booking.apartment_details?.location ?? ''}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(booking.status)} flex items-center gap-1`}>
                        {getStatusIcon(booking.status)}
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusBadge(booking.payment_status)} flex items-center gap-1`}>
                        {getPaymentLabel(booking.payment_status)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span style={{ color: '#403D3D' }}>{booking.name}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">{booking.email}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">{booking.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="border-l border-gray-200 pl-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Check-in</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(booking.check_in).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Check-out</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(booking.check_out).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-gray-200 space-y-1.5">
                      {/* Original total */}
                      <div className="flex justify-between items-baseline">
                        <p className="text-xs text-gray-400">Total</p>
                        <p className="text-sm font-semibold text-gray-600">{fmt(booking.total_amount, booking.currency)}</p>
                      </div>
                      {/* Discount line — only shown when one exists */}
                      {(booking as any).discount_type && (booking as any).discount_type !== 'none' && parseFloat((booking as any).discount_amount || '0') > 0 && (
                        <div className="flex justify-between items-baseline">
                          <p className="text-xs text-purple-500">Discount</p>
                          <p className="text-sm font-semibold text-purple-600">−{fmt((booking as any).discount_amount, booking.currency)}</p>
                        </div>
                      )}
                      {/* Payable */}
                      <div className="flex justify-between items-baseline border-t border-dashed border-gray-200 pt-1">
                        <p className="text-xs text-gray-500 font-semibold">Payable</p>
                        <p className="text-base font-bold" style={{ color: '#403D3D' }}>
                          {fmt((booking as any).effective_total ?? booking.total_amount, booking.currency)}
                        </p>
                      </div>
                      {/* Paid / Balance */}
                      {booking.payment_status === 'paid' ? (
                        <div className="flex items-center gap-1.5 bg-emerald-50 rounded-lg px-2 py-1 border border-emerald-100">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          <p className="text-xs font-semibold text-emerald-700">Paid in full</p>
                        </div>
                      ) : booking.payment_status === 'partial' ? (
                        <div className="space-y-1">
                          <div className="flex justify-between items-baseline">
                            <p className="text-xs text-emerald-600">Paid so far</p>
                            <p className="text-sm font-semibold text-emerald-600">{fmt((booking as any).amount_paid, booking.currency)}</p>
                          </div>
                          <div className="flex justify-between items-baseline bg-amber-50 rounded-lg px-2 py-1 border border-amber-100">
                            <p className="text-xs font-bold text-amber-700">Balance due</p>
                            <p className="text-sm font-bold text-amber-700">{fmt((booking as any).balance_remaining, booking.currency)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-baseline bg-red-50 rounded-lg px-2 py-1 border border-red-100">
                          <p className="text-xs font-bold text-red-700">Balance due</p>
                          <p className="text-sm font-bold text-red-700">
                            {fmt((booking as any).balance_remaining ?? (booking as any).effective_total ?? booking.total_amount, booking.currency)}
                          </p>
                        </div>
                      )}
                      <p className="text-[11px] text-gray-400">{booking.nights} nights • {booking.guests} guests</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outstanding balance banner — shown for any unpaid / part-paid booking */}
              {booking.payment_status !== 'paid' && booking.status !== 'cancelled' && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-sm ${
                    booking.payment_status === 'partial'
                      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                      : 'bg-red-50 border-red-200 hover:bg-red-100'
                  }`}
                  onClick={() => setPaymentLedgerBooking(booking)}
                >
                  <div className="min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-wide ${booking.payment_status === 'partial' ? 'text-amber-700' : 'text-red-700'}`}>
                      {booking.payment_status === 'partial' ? 'Part Paid — Balance Outstanding' : 'No Payment Received'}
                    </p>
                    <p className={`text-xs mt-0.5 ${booking.payment_status === 'partial' ? 'text-amber-600' : 'text-red-600'}`}>
                      {booking.name} owes
                      {(booking as any).payment_due_date && ` · due ${new Date((booking as any).payment_due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-lg font-bold ${booking.payment_status === 'partial' ? 'text-amber-700' : 'text-red-700'}`}>
                      {fmt(
                        (booking as any).balance_remaining ?? (booking as any).effective_total ?? booking.total_amount,
                        booking.currency
                      )}
                    </span>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                      booking.payment_status === 'partial'
                        ? 'bg-amber-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      Record Payment →
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                <button
                  onClick={() => handleStatusUpdate(booking.booking_id, 'confirmed')}
                  disabled={booking.status === 'confirmed'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${booking.status === 'confirmed'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  Confirm
                </button>
                <button
                  onClick={() => handleStatusUpdate(booking.booking_id, 'completed')}
                  disabled={booking.status === 'completed' || booking.status === 'cancelled'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${booking.status === 'completed' || booking.status === 'cancelled'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  Complete
                </button>
                <button
                  onClick={() => handleStatusUpdate(booking.booking_id, 'cancelled')}
                  disabled={booking.status === 'cancelled' || booking.status === 'completed'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${booking.status === 'cancelled' || booking.status === 'completed'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                >
                  <XCircle className="h-4 w-4 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={() => setPaymentLedgerBooking(booking)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    booking.payment_status === 'paid'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : booking.payment_status === 'partial'
                        ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                        : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                  }`}
                >
                  Payments
                  {booking.payment_status !== 'paid' && (booking as any).balance_remaining && (
                    <span className="ml-1.5 text-[10px] font-bold opacity-80">
                      ({fmt((booking as any).balance_remaining, booking.currency)} due)
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setReceiptBooking(booking)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  Receipt
                </button>
                <button
                  onClick={() => setDisputeBooking(booking)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                >
                  Raise Dispute
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* iCal unlock confirmation modal */}
      {icalUnlockTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Unlock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Unlock These Dates?</h3>
                <p className="text-xs text-gray-500 mt-0.5">{icalUnlockTarget.label}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 space-y-1.5">
              <p className="text-sm text-amber-800 font-semibold">These dates were blocked by an external calendar sync.</p>
              <p className="text-xs text-amber-700">
                Unlocking will make them bookable on this platform immediately. If you re-sync the calendar, the block may be re-applied based on what&apos;s on the external calendar.
              </p>
              {icalUnlockTarget.calendarId && (
                <p className="text-xs text-amber-600 font-medium">
                  Tip: To permanently remove the conflict, cancel the booking on the external calendar first, then re-sync here.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIcalUnlockTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Keep Locked
              </button>
              <button
                onClick={handleConfirmIcalUnlock}
                disabled={isUnlocking}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isUnlocking ? 'Unlocking…' : 'Yes, Unlock Dates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block dates modal */}
      {blockModalAptId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-gray-900">Block Dates</h3>
              </div>
              <button onClick={() => setBlockModalAptId(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Guests will not be able to book this room during the selected period.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={blockStartDate}
                  onChange={e => setBlockStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  value={blockEndDate}
                  onChange={e => setBlockEndDate(e.target.value)}
                  min={blockStartDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="e.g. Repairs, Pest control, Deep cleaning…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setBlockModalAptId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleBlockDates}
                disabled={isBlocking || !blockStartDate || !blockEndDate}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isBlocking ? 'Blocking…' : 'Block Dates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock reason dialog */}
      {lockModalAptId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                <h3 className="font-bold text-gray-900">Lock Room</h3>
              </div>
              <button onClick={() => setLockModalAptId(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Provide a reason for locking this room (e.g., "Under repair", "Pest control").</p>
            <textarea
              value={lockReason}
              onChange={e => setLockReason(e.target.value)}
              placeholder="Reason for locking…"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-400 outline-none resize-none mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setLockModalAptId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => handleLock(lockModalAptId, lockReason)}
                disabled={lockingId === lockModalAptId}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {lockingId === lockModalAptId ? 'Locking…' : 'Confirm Lock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Ledger Modal */}
      {paymentLedgerBooking && (
        <BookingPaymentLedger
          booking={paymentLedgerBooking}
          onClose={() => setPaymentLedgerBooking(null)}
        />
      )}

      {/* Admin Booking Modal */}
      <AdminBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setWalkInApartment(null);
          setWalkInCheckIn(undefined);
        }}
        onSuccess={() => {
          refetch();
          setIsBookingModalOpen(false);
          setWalkInApartment(null);
          setWalkInCheckIn(undefined);
        }}
        initialApartment={walkInApartment}
        initialCheckIn={walkInCheckIn}
      />

      {/* Raise Dispute Modal */}
      {disputeBooking && (
        <RaiseDisputeModal
          isOpen={!!disputeBooking}
          onClose={() => setDisputeBooking(null)}
          booking={disputeBooking}
        />
      )}

      {/* Receipt Modal */}
      {receiptBooking && (
        <ReceiptModal
          isOpen={!!receiptBooking}
          onClose={() => setReceiptBooking(null)}
          booking={receiptBooking}
        />
      )}

      {/* Cancellation Modal */}
      {selectedBookingId && (
        <CancellationModal
          isOpen={isCancellationModalOpen}
          onClose={() => {
            setIsCancellationModalOpen(false);
            setSelectedBookingId(null);
          }}
          bookingId={selectedBookingId}
          onSuccess={() => {
            refetch();
            toast.success('Booking cancelled');
          }}
        />
      )}
    </div>
  );
}
