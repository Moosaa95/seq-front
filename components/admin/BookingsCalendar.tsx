'use client';

import { useState, useMemo, useRef } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addMonths,
    subMonths,
    differenceInCalendarDays,
    parseISO,
    isToday,
    isSameMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, User, Mail, Phone, MapPin, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import type { ApiBooking } from '@/lib/store/api/adminApi';
import type { ApiApartment } from '@/lib/store/api/propertyApi';

interface BookingsCalendarProps {
    bookings: ApiBooking[];
    apartments: ApiApartment[];
    onStatusChange?: (bookingId: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') => void;
}

const CELL_W = 44;  // px per day column
const ROW_H = 44;   // px per apartment row
const SIDEBAR_W = 220;

const STATUS_STYLES: Record<string, { bar: string; text: string }> = {
    confirmed: { bar: 'bg-emerald-500', text: 'text-white' },
    pending:   { bar: 'bg-amber-400',   text: 'text-amber-900' },
    cancelled: { bar: 'bg-red-400',     text: 'text-white' },
    completed: { bar: 'bg-blue-500',    text: 'text-white' },
};

export default function BookingsCalendar({ bookings, apartments, onStatusChange }: BookingsCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Days in the current month
    const days = useMemo(() => {
        return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    }, [currentMonth]);

    const rangeStart = days[0];
    const totalDays = days.length;

    // Group apartments by parent property name
    const groups = useMemo(() => {
        const map = new Map<string, { propertyName: string; propertyId: string | null; apts: ApiApartment[] }>();

        // Apartments with a parent property
        for (const apt of apartments) {
            const propId = apt.parent_property ?? '__standalone__';
            const propName = apt.property_details?.name ?? (apt.parent_property ? `Property ${apt.parent_property}` : 'Standalone Units');
            if (!map.has(propId)) map.set(propId, { propertyName: propName, propertyId: apt.parent_property, apts: [] });
            map.get(propId)!.apts.push(apt);
        }

        // Sort standalone last
        return Array.from(map.values()).sort((a, b) => {
            if (a.propertyId === null) return 1;
            if (b.propertyId === null) return -1;
            return a.propertyName.localeCompare(b.propertyName);
        });
    }, [apartments]);

    // Index bookings by apartment id
    const bookingsByApt = useMemo(() => {
        const idx = new Map<string, ApiBooking[]>();
        for (const b of bookings) {
            if (!b.apartment_details) continue;
            const id = b.apartment_details.id;
            if (!idx.has(id)) idx.set(id, []);
            idx.get(id)!.push(b);
        }
        return idx;
    }, [bookings]);

    // Compute bar position for a booking within current month view
    function barGeometry(booking: ApiBooking) {
        const checkIn = parseISO(booking.check_in);
        const checkOut = parseISO(booking.check_out);

        // Clamp to visible range
        const startDay = Math.max(0, differenceInCalendarDays(checkIn, rangeStart));
        const endDay = Math.min(totalDays, differenceInCalendarDays(checkOut, rangeStart));
        const width = endDay - startDay;
        if (width <= 0) return null;

        return {
            left: startDay * CELL_W,
            width: width * CELL_W - 2, // 2px gap
            clippedLeft: differenceInCalendarDays(checkIn, rangeStart) < 0,
        };
    }

    const today = useMemo(() => new Date(), []);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4 text-gray-600" />
                    </button>
                    <h2 className="text-base font-semibold text-gray-900 min-w-[140px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <button
                        onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
                    >
                        Today
                    </button>
                </div>

                {/* Legend */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-gray-600">
                    {Object.entries(STATUS_STYLES).map(([s, st]) => (
                        <div key={s} className="flex items-center gap-1.5">
                            <span className={`inline-block w-3 h-3 rounded-sm ${st.bar}`} />
                            <span className="capitalize">{s}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scrollable timeline */}
            <div className="overflow-x-auto" ref={scrollRef}>
                <div style={{ minWidth: SIDEBAR_W + totalDays * CELL_W }}>

                    {/* Header row: sidebar label + day numbers */}
                    <div className="flex sticky top-0 z-20 bg-white border-b border-gray-200">
                        {/* Sidebar header */}
                        <div
                            className="flex-shrink-0 sticky left-0 z-30 bg-gray-50 border-r border-gray-200 flex items-center px-3"
                            style={{ width: SIDEBAR_W, height: 40 }}
                        >
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Property / Unit</span>
                        </div>

                        {/* Day columns */}
                        {days.map(day => {
                            const todayCell = isToday(day);
                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 text-xs font-medium
                                        ${todayCell ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'}`}
                                    style={{ width: CELL_W, height: 40 }}
                                >
                                    <span className="leading-none">{format(day, 'EEE').charAt(0)}</span>
                                    <span className={`leading-none mt-0.5 font-bold ${todayCell ? 'text-emerald-700' : 'text-gray-700'}`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Property groups + apartment rows */}
                    {groups.map(group => (
                        <div key={group.propertyId ?? '__standalone__'}>
                            {/* Property header */}
                            <div className="flex border-b border-gray-200 bg-gray-50">
                                <div
                                    className="flex-shrink-0 sticky left-0 z-10 bg-gray-50 border-r border-gray-200 flex items-center px-3 gap-2"
                                    style={{ width: SIDEBAR_W, height: 32 }}
                                >
                                    <span className="text-xs font-bold text-gray-700 truncate">{group.propertyName}</span>
                                    <span className="text-xs text-gray-400">({group.apts.length})</span>
                                </div>
                                <div style={{ width: totalDays * CELL_W, height: 32 }} className="bg-gray-50" />
                            </div>

                            {/* Apartment rows */}
                            {group.apts.map((apt, aptIdx) => {
                                const aptBookings = (bookingsByApt.get(apt.id) ?? []).filter(b =>
                                    b.status !== 'cancelled'
                                );

                                return (
                                    <div
                                        key={apt.id}
                                        className={`flex border-b border-gray-100 ${aptIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                                        style={{ height: ROW_H }}
                                    >
                                        {/* Apartment label - sticky */}
                                        <div
                                            className={`flex-shrink-0 sticky left-0 z-10 border-r border-gray-200 flex items-center px-3 gap-2
                                                ${aptIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                                            style={{ width: SIDEBAR_W }}
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-700 truncate">{apt.title}</span>
                                        </div>

                                        {/* Day cells + booking bars */}
                                        <div className="relative" style={{ width: totalDays * CELL_W }}>
                                            {/* Day grid lines */}
                                            <div className="absolute inset-0 flex pointer-events-none">
                                                {days.map(day => (
                                                    <div
                                                        key={day.toISOString()}
                                                        className={`flex-shrink-0 h-full border-r ${isToday(day) ? 'bg-emerald-50/60 border-emerald-200' : 'border-gray-100'}`}
                                                        style={{ width: CELL_W }}
                                                    />
                                                ))}
                                            </div>

                                            {/* Booking bars */}
                                            {aptBookings.map(booking => {
                                                const geo = barGeometry(booking);
                                                if (!geo) return null;
                                                const style = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending;
                                                return (
                                                    <button
                                                        key={booking.booking_id}
                                                        onClick={() => setSelectedBooking(booking)}
                                                        className={`absolute top-2 rounded cursor-pointer flex items-center px-2 gap-1 hover:brightness-90 transition-all shadow-sm ${style.bar} ${style.text}`}
                                                        style={{
                                                            left: geo.left + 1,
                                                            width: geo.width,
                                                            height: ROW_H - 16,
                                                            borderLeft: geo.clippedLeft ? '3px dashed rgba(255,255,255,0.5)' : undefined,
                                                        }}
                                                        title={`${booking.name} · ${booking.check_in} → ${booking.check_out}`}
                                                    >
                                                        <span className="text-xs font-medium truncate">{booking.name}</span>
                                                        {geo.width > 80 && (
                                                            <span className="text-xs opacity-75 truncate ml-auto">
                                                                {booking.nights}n
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {/* Empty state */}
                    {groups.length === 0 && (
                        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                            No apartments to display
                        </div>
                    )}
                </div>
            </div>

            {/* Booking detail modal */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedBooking(null)}>
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <div>
                                <h3 className="font-bold text-gray-900">{selectedBooking.apartment_details?.title ?? 'Booking'}</h3>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize
                                    ${selectedBooking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                                      selectedBooking.status === 'pending'   ? 'bg-amber-100 text-amber-800' :
                                      selectedBooking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                               'bg-blue-100 text-blue-800'}`}>
                                    {selectedBooking.status}
                                </span>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Guest */}
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium text-gray-900">{selectedBooking.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">{selectedBooking.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">{selectedBooking.phone}</span>
                                </div>
                            </div>

                            {/* Property info */}
                            {selectedBooking.apartment_details?.property_details && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span>{selectedBooking.apartment_details.property_details.name}</span>
                                </div>
                            )}

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">Check-in</p>
                                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                                        <CalendarIcon className="h-3.5 w-3.5 text-emerald-500" />
                                        {format(parseISO(selectedBooking.check_in), 'MMM d, yyyy')}
                                    </div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">Check-out</p>
                                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                                        <CalendarIcon className="h-3.5 w-3.5 text-blue-500" />
                                        {format(parseISO(selectedBooking.check_out), 'MMM d, yyyy')}
                                    </div>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                    <span>{selectedBooking.nights} nights · {selectedBooking.guests} guests</span>
                                </div>
                                <span className="text-lg font-bold text-emerald-600">
                                    {selectedBooking.currency}{parseFloat(selectedBooking.total_amount).toLocaleString()}
                                </span>
                            </div>

                            {/* Special requests */}
                            {selectedBooking.special_requests && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Special Requests</p>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">{selectedBooking.special_requests}</p>
                                </div>
                            )}
                        </div>

                        {/* Status actions */}
                        {onStatusChange && (
                            <div className="p-4 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-2">Update status:</p>
                                <div className="flex flex-wrap gap-2">
                                    {(['confirmed', 'completed', 'cancelled'] as const).map(s => (
                                        <button
                                            key={s}
                                            disabled={selectedBooking.status === s}
                                            onClick={() => { onStatusChange(selectedBooking.booking_id, s); setSelectedBooking(null); }}
                                            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                                                ${s === 'confirmed' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                                                  s === 'completed' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                                                                      'bg-red-600 text-white hover:bg-red-700'}`}
                                        >
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
