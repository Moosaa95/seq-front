'use client';

import { useState, useMemo } from 'react';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subDays, parseISO, differenceInCalendarDays, format, isWithinInterval,
  max as dateMax, min as dateMin,
} from 'date-fns';
import { BarChart2, TrendingUp, Calendar, DollarSign, Home, ChevronDown, Loader2 } from 'lucide-react';
import { useGetBookingsQuery } from '@/lib/store/api/adminApi';
import { useGetApartmentsQuery } from '@/lib/store/api/propertyApi';

type Preset = 'this_week' | 'this_month' | 'last_30' | 'custom';

function getPresetRange(preset: Preset, customStart: string, customEnd: string): { start: Date; end: Date } {
  const today = new Date();
  switch (preset) {
    case 'this_week':
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    case 'this_month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case 'last_30':
      return { start: subDays(today, 30), end: today };
    case 'custom': {
      const s = customStart ? parseISO(customStart) : subDays(today, 30);
      const e = customEnd ? parseISO(customEnd) : today;
      return { start: s, end: e };
    }
  }
}

function overlapNights(checkIn: Date, checkOut: Date, rangeStart: Date, rangeEnd: Date): number {
  const overlapStart = dateMax([checkIn, rangeStart]);
  const overlapEnd = dateMin([checkOut, rangeEnd]);
  return Math.max(0, differenceInCalendarDays(overlapEnd, overlapStart));
}

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { data: bookings, isLoading: bookingsLoading } = useGetBookingsQuery({});
  const { data: apartments, isLoading: aptsLoading } = useGetApartmentsQuery({});

  const { start, end } = getPresetRange(preset, customStart, customEnd);
  const totalDays = Math.max(1, differenceInCalendarDays(end, start));

  const stats = useMemo(() => {
    const bookingList = bookings?.results ?? [];
    const aptList = apartments?.results ?? [];
    if (!bookings || !apartments) return null;

    const activeBookings = bookingList.filter(b =>
      b.status === 'confirmed' || b.status === 'completed' || b.status === 'pending'
    );

    let totalRevenue = 0;
    let totalBookedNights = 0;
    const totalAvailableNights = aptList.length * totalDays;

    const aptStats = aptList.map(apt => {
      const aptBookings = activeBookings.filter(b => b.apartment === apt.id || b.apartment_details?.id === apt.id);

      let bookedNights = 0;
      let revenue = 0;
      let bookingCount = 0;

      for (const b of aptBookings) {
        try {
          const checkIn = parseISO(b.check_in);
          const checkOut = parseISO(b.check_out);
          const nights = overlapNights(checkIn, checkOut, start, end);
          if (nights > 0) {
            bookedNights += nights;
            revenue += parseFloat(b.total_amount) || 0;
            bookingCount++;
          }
        } catch { /* skip malformed dates */ }
      }

      totalRevenue += revenue;
      totalBookedNights += bookedNights;

      const occupancy = totalDays > 0 ? Math.min(100, (bookedNights / totalDays) * 100) : 0;
      return { apt, bookedNights, revenue, bookingCount, occupancy };
    });

    const overallOccupancy = totalAvailableNights > 0
      ? Math.min(100, (totalBookedNights / totalAvailableNights) * 100)
      : 0;

    return { aptStats, overallOccupancy, totalRevenue, totalBookedNights, totalAvailableNights };
  }, [bookings, apartments, start, end, totalDays]);

  const aptList = apartments?.results ?? [];

  const isLoading = bookingsLoading || aptsLoading;

  const PRESETS: { id: Preset; label: string }[] = [
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_30', label: 'Last 30 Days' },
    { id: 'custom', label: 'Custom Range' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Occupancy</h1>
          <p className="text-sm text-gray-500 mt-1">
            {format(start, 'MMM d, yyyy')} — {format(end, 'MMM d, yyyy')} · {totalDays} day{totalDays !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Preset selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                preset === p.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 w-fit">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : stats ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Overall Occupancy"
              value={`${stats.overallOccupancy.toFixed(1)}%`}
              sub={`${stats.totalBookedNights} / ${stats.totalAvailableNights} nights`}
              icon={<BarChart2 className="h-5 w-5 text-emerald-600" />}
              color="emerald"
              bar={stats.overallOccupancy}
            />
            <SummaryCard
              label="Total Revenue"
              value={`₦${stats.totalRevenue.toLocaleString()}`}
              sub="Across all units in range"
              icon={<DollarSign className="h-5 w-5 text-blue-600" />}
              color="blue"
            />
            <SummaryCard
              label="Booked Nights"
              value={String(stats.totalBookedNights)}
              sub={`Out of ${stats.totalAvailableNights} available`}
              icon={<Calendar className="h-5 w-5 text-purple-600" />}
              color="purple"
            />
            <SummaryCard
              label="Active Units"
              value={String(aptList.length)}
              sub={`${stats.aptStats.filter(a => a.bookingCount > 0).length} had bookings`}
              icon={<Home className="h-5 w-5 text-amber-600" />}
              color="amber"
            />
          </div>

          {/* Per-apartment table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Unit Performance</h2>
              <p className="text-sm text-gray-500">Occupancy and revenue per apartment unit</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Unit</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Occupancy</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Booked Nights</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Bookings</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.aptStats
                    .sort((a, b) => b.occupancy - a.occupancy)
                    .map(({ apt, bookedNights, revenue, bookingCount, occupancy }) => (
                      <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{apt.title}</p>
                          {apt.property_details && (
                            <p className="text-xs text-gray-400">{apt.property_details.name}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[80px]">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  occupancy >= 75 ? 'bg-emerald-500' :
                                  occupancy >= 50 ? 'bg-blue-500' :
                                  occupancy >= 25 ? 'bg-amber-500' : 'bg-red-400'
                                }`}
                                style={{ width: `${occupancy}%` }}
                              />
                            </div>
                            <span className={`font-semibold text-sm w-12 text-right ${
                              occupancy >= 75 ? 'text-emerald-700' :
                              occupancy >= 50 ? 'text-blue-700' :
                              occupancy >= 25 ? 'text-amber-700' : 'text-red-600'
                            }`}>
                              {occupancy.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-gray-900">
                          {bookedNights} / {totalDays}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-700">
                          {bookingCount}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {revenue > 0 ? `₦${revenue.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label, value, sub, icon, color, bar,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'purple' | 'amber';
  bar?: number;
}) {
  const bg = { emerald: 'bg-emerald-50', blue: 'bg-blue-50', purple: 'bg-purple-50', amber: 'bg-amber-50' }[color];
  const barColor = { emerald: 'bg-emerald-500', blue: 'bg-blue-500', purple: 'bg-purple-500', amber: 'bg-amber-500' }[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${bg}`}>{icon}</div>
      </div>
      {bar !== undefined && (
        <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
