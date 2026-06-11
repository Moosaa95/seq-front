'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box, MapPin, ArrowRightLeft, Loader2, X, Plus, Search, AlertTriangle,
    ChevronRight, PackageOpen, Truck, BarChart3, Building2, Home,
    TrendingUp, TrendingDown, RefreshCw, Edit2, Trash2, Eye,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import {
    useGetLocationsQuery,
    useGetInventoryItemsQuery,
    useGetLocationInventoryQuery,
    useGetPropertyInventoryQuery,
    useGetApartmentInventoryQuery,
    useGetInventoryMovementsQuery,
    useTransferInventoryMutation,
    useDeleteInventoryItemMutation,
    useDeleteLocationMutation,
    type Location,
    type InventoryItem,
    type LocationInventory,
    type PropertyInventory,
    type ApartmentInventory,
    type InventoryMovement,
    type TransferInventoryInput,
} from '@/lib/store/api/inventoryApi';
import { useGetApartmentsQuery, useGetPropertiesQuery } from '@/lib/store/api/propertyApi';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store';

import AddLocationModal from '@/components/admin/inventory/AddLocationModal';
import AddItemModal from '@/components/admin/inventory/AddItemModal';
import AddStockModal from '@/components/admin/inventory/AddStockModal';
import RecordMovementModal from '@/components/admin/inventory/RecordMovementModal';
import { parseApiError } from '@/lib/parseApiError';

// ─── Color tokens ──────────────────────────────────────────────────────────────
const DARK = '#403D3D';

type TopTab = 'items' | 'locations' | 'movements';

const MOVEMENT_LABELS: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
    initial:        { label: 'Initial Stock',    color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: Plus },
    restock:        { label: 'Restocked',         color: 'text-blue-700 bg-blue-50 border-blue-200',         icon: TrendingUp },
    assign:         { label: 'Assigned Out',      color: 'text-amber-700 bg-amber-50 border-amber-200',      icon: ArrowRightLeft },
    return:         { label: 'Returned',          color: 'text-purple-700 bg-purple-50 border-purple-200',   icon: RefreshCw },
    transferred:    { label: 'Transferred',       color: 'text-cyan-700 bg-cyan-50 border-cyan-200',         icon: Truck },
    client_request: { label: 'Client Request',   color: 'text-orange-700 bg-orange-50 border-orange-200',   icon: Home },
    disposed:       { label: 'Disposed',          color: 'text-red-700 bg-red-50 border-red-200',            icon: Trash2 },
    damaged:        { label: 'Damaged',           color: 'text-rose-700 bg-rose-50 border-rose-200',         icon: AlertTriangle },
};

function fmtDate(d: string) {
    try { return format(parseISO(d), 'd MMM yyyy · h:mm a'); } catch { return d; }
}

// ─── Transfer Modal ────────────────────────────────────────────────────────────
interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    preItem?: InventoryItem;
}

function TransferModal({ isOpen, onClose, preItem }: TransferModalProps) {
    const [transfer, { isLoading }] = useTransferInventoryMutation();
    const { data: locationsRaw } = useGetLocationsQuery({});
    const { data: propertiesRaw } = useGetPropertiesQuery({});
    const { data: apartmentsRaw } = useGetApartmentsQuery({ page_size: 200, ordering: "title" });
    const { data: allItems } = useGetInventoryItemsQuery({});

    const locations = locationsRaw ?? [];
    const properties = propertiesRaw?.results ?? [];
    const apartments = apartmentsRaw?.results ?? [];
    const items = allItems ?? [];

    type Level = 'location' | 'property' | 'apartment';
    const [itemId,       setItemId]       = useState(preItem?.id.toString() ?? '');
    const [qty,          setQty]          = useState(1);
    const [reason,       setReason]       = useState('');
    const [performedBy,  setPerformedBy]  = useState('');
    const [fromLevel,    setFromLevel]    = useState<Level>('location');
    const [fromId,       setFromId]       = useState('');
    const [toLevel,      setToLevel]      = useState<Level>('property');
    const [toId,         setToId]         = useState('');

    const levelOptions = (level: Level) => {
        if (level === 'location')  return locations.map(l => ({ value: l.id.toString(), label: l.name }));
        if (level === 'property')  return properties.map(p => ({ value: p.id.toString(), label: p.name }));
        return apartments.map(a => ({ value: a.id.toString(), label: `${a.title} ${a.property_details?.name ? '· ' + a.property_details.name : ''}` }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemId || !fromId || !toId || qty < 1) {
            toast.error('Please fill all required fields.'); return;
        }
        const body: TransferInventoryInput = {
            item_id: itemId, quantity: qty, reason, performed_by: performedBy,
            [`from_${fromLevel}_id`]: fromId,
            [`to_${toLevel}_id`]: toId,
        } as any;
        try {
            await transfer(body).unwrap();
            toast.success('Transfer recorded successfully.');
            onClose();
        } catch (err: any) {
            toast.error(parseApiError(err, 'Transfer failed.'));
        }
    };

    const LevelSelect = ({ value, onChange, excludeLevel }: { value: Level; onChange: (v: Level) => void; excludeLevel?: Level }) => (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['location', 'property', 'apartment'] as Level[]).filter(l => l !== excludeLevel).map(l => (
                <button key={l} type="button" onClick={() => onChange(l)}
                    className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-md transition-colors capitalize ${value === l ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >{l}</button>
            ))}
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto border border-gray-200"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: DARK }}>
                                        <ArrowRightLeft className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">Record Transfer</p>
                                        <p className="text-xs text-gray-400">Move items between levels</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="h-4 w-4 text-gray-400" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                {/* Item */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Item *</label>
                                    <select value={itemId} onChange={e => setItemId(e.target.value)} required
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#403D3D]/30 focus:border-[#403D3D] outline-none">
                                        <option value="">— Select item —</option>
                                        {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                                    </select>
                                </div>

                                {/* From / To */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">From *</label>
                                        <LevelSelect value={fromLevel} onChange={l => { setFromLevel(l); setFromId(''); }} />
                                        <select value={fromId} onChange={e => setFromId(e.target.value)} required
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#403D3D]/30 focus:border-[#403D3D] outline-none">
                                            <option value="">— Select —</option>
                                            {levelOptions(fromLevel).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">To *</label>
                                        <LevelSelect value={toLevel} onChange={l => { setToLevel(l); setToId(''); }} />
                                        <select value={toId} onChange={e => setToId(e.target.value)} required
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#403D3D]/30 focus:border-[#403D3D] outline-none">
                                            <option value="">— Select —</option>
                                            {levelOptions(toLevel).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Quantity *</label>
                                    <input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} required
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#403D3D]/30 focus:border-[#403D3D] outline-none" />
                                </div>

                                {/* Reason & performed by */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Reason</label>
                                        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Cleaning supply run"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#403D3D]/30 focus:border-[#403D3D] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Performed By</label>
                                        <input value={performedBy} onChange={e => setPerformedBy(e.target.value)} placeholder="Staff name"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#403D3D]/30 focus:border-[#403D3D] outline-none" />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={onClose}
                                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isLoading}
                                        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                                        style={{ background: DARK }}>
                                        {isLoading ? 'Recording…' : 'Record Transfer'}
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

// ─── Item Detail Panel ─────────────────────────────────────────────────────────
function ItemDetailPanel({ item, onClose, onTransfer }: { item: InventoryItem; onClose: () => void; onTransfer: (item: InventoryItem) => void }) {
    const { data: locStock }  = useGetLocationInventoryQuery({ item_id: item.id });
    const { data: propStock } = useGetPropertyInventoryQuery({ item_id: item.id });
    const { data: aptStock }  = useGetApartmentInventoryQuery({ item_id: item.id });
    const { data: movements } = useGetInventoryMovementsQuery({ item_id: item.id });

    const locStockArr  = locStock  ?? [];
    const propStockArr = propStock ?? [];
    const aptStockArr  = aptStock  ?? [];
    const movArr       = movements ?? [];

    const totalStock = locStockArr.reduce((s, x) => s + x.quantity, 0)
        + propStockArr.reduce((s, x) => s + x.quantity, 0)
        + aptStockArr.reduce((s, x) => s + x.quantity, 0);

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-full"
        >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <ChevronRight className="h-4 w-4 text-gray-400 rotate-180" />
                    </button>
                    <div>
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.category} · {item.unit}</p>
                    </div>
                </div>
                <button onClick={() => onTransfer(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                    style={{ background: DARK }}>
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Total stock summary */}
                <div className="p-5 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Current Stock Distribution</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <div className="text-2xl font-black text-gray-900">{totalStock}</div>
                            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Total</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-xl">
                            <div className="text-2xl font-black text-blue-700">{locStockArr.reduce((s, x) => s + x.quantity, 0)}</div>
                            <div className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide mt-0.5">Warehouses</div>
                        </div>
                        <div className="text-center p-3 bg-emerald-50 rounded-xl">
                            <div className="text-2xl font-black text-emerald-700">{propStockArr.reduce((s, x) => s + x.quantity, 0) + aptStockArr.reduce((s, x) => s + x.quantity, 0)}</div>
                            <div className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wide mt-0.5">Properties</div>
                        </div>
                    </div>

                    {/* By-location breakdown */}
                    {locStockArr.length > 0 && (
                        <div className="space-y-1.5">
                            {locStockArr.map(s => (
                                <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="text-sm text-gray-700">{s.location_details?.name}</span>
                                        {s.is_low_stock && <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Low</span>}
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{s.quantity} <span className="text-gray-400 font-normal text-xs">{item.unit}</span></span>
                                </div>
                            ))}
                        </div>
                    )}
                    {propStockArr.map(s => (
                        <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg mt-1.5">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-sm text-gray-700">{s.property_details?.name}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{s.quantity} <span className="text-gray-400 font-normal text-xs">{item.unit}</span></span>
                        </div>
                    ))}
                    {aptStockArr.map(s => (
                        <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg mt-1.5">
                            <div className="flex items-center gap-2">
                                <Home className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-sm text-gray-700">{s.apartment_details?.title}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{s.quantity} <span className="text-gray-400 font-normal text-xs">{item.unit}</span></span>
                        </div>
                    ))}
                    {totalStock === 0 && (
                        <div className="text-center py-4 text-sm text-gray-400">No stock recorded yet.</div>
                    )}
                </div>

                {/* Movement history */}
                <div className="p-5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Movement History</p>
                    {movArr.length === 0 ? (
                        <div className="text-center py-6 text-sm text-gray-400">No movements recorded.</div>
                    ) : (
                        <div className="space-y-2">
                            {movArr.map(m => {
                                const meta = MOVEMENT_LABELS[m.movement_type] ?? { label: m.movement_type_display, color: 'text-gray-700 bg-gray-50 border-gray-200', icon: Box };
                                const Icon = meta.icon;
                                return (
                                    <div key={m.id} className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.color}`}>
                                            <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-gray-900">{meta.label}</span>
                                                <span className="text-xs text-gray-500">×{m.quantity} {item.unit}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 flex-wrap">
                                                {m.location_details?.name && <span>{m.location_details.name}</span>}
                                                {m.property_details?.name && <><ChevronRight className="h-3 w-3" /><span>{m.property_details.name}</span></>}
                                                {m.apartment_details?.title && <><ChevronRight className="h-3 w-3" /><span>{m.apartment_details.title}</span></>}
                                            </div>
                                            {m.reason && <p className="text-xs text-gray-500 mt-0.5 italic">{m.reason}</p>}
                                            <p className="text-[10px] text-gray-300 mt-0.5">{fmtDate(m.created_at)}{m.performed_by ? ` · ${m.performed_by}` : ''}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
    const user = useSelector((s: RootState) => s.auth.user);
    const allowedLocationIds: number[] = user?.role?.allowed_locations ?? [];
    const isSuperOrNoRestriction = !allowedLocationIds.length || user?.is_superuser || user?.role?.is_superuser_role;

    const [topTab,             setTopTab]             = useState<TopTab>('items');
    const [selectedItem,       setSelectedItem]       = useState<InventoryItem | null>(null);
    const [selectedLocation,   setSelectedLocation]   = useState<Location | null>(null);
    const [transferItem,       setTransferItem]       = useState<InventoryItem | undefined>(undefined);
    const [search,             setSearch]             = useState('');

    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isItemModalOpen,     setIsItemModalOpen]     = useState(false);
    const [isStockModalOpen,    setIsStockModalOpen]    = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [isTransferOpen,      setIsTransferOpen]      = useState(false);

    // Data
    const { data: locationsRaw,    isLoading: locLoading }   = useGetLocationsQuery({});
    const { data: itemsRaw,        isLoading: itemsLoading } = useGetInventoryItemsQuery({});
    const { data: allLocStock }  = useGetLocationInventoryQuery();
    const { data: allMovements, isLoading: movLoading } = useGetInventoryMovementsQuery({});
    const { data: locDetailStock } = useGetLocationInventoryQuery(
        selectedLocation ? { location_id: selectedLocation.id } : undefined,
        { skip: !selectedLocation }
    );
    const [deleteItem] = useDeleteInventoryItemMutation();
    const [deleteLocation] = useDeleteLocationMutation();

    // Permission-filtered locations
    const allLocations = locationsRaw ?? [];
    const locations = useMemo(() =>
        isSuperOrNoRestriction ? allLocations : allLocations.filter(l => allowedLocationIds.includes(l.id)),
        [allLocations, allowedLocationIds, isSuperOrNoRestriction]
    );

    const items = itemsRaw ?? [];
    const movements = allMovements ?? [];

    const filteredItems = useMemo(() =>
        items.filter(it => it.name.toLowerCase().includes(search.toLowerCase())
            || it.category.toLowerCase().includes(search.toLowerCase())),
        [items, search]
    );
    const filteredLocations = useMemo(() =>
        locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase())),
        [locations, search]
    );

    // Stock counts per item (across all locations)
    const stockByItem = useMemo(() => {
        const map: Record<string, number> = {};
        (allLocStock ?? []).forEach(s => {
            const key = s.item_details?.id?.toString() ?? s.item;
            map[key] = (map[key] ?? 0) + s.quantity;
        });
        return map;
    }, [allLocStock]);

    const openTransfer = (item?: InventoryItem) => {
        setTransferItem(item);
        setIsTransferOpen(true);
    };

    const tabs: { key: TopTab; label: string; icon: typeof Box }[] = [
        { key: 'items',     label: 'Items',       icon: Box },
        { key: 'locations', label: 'Warehouses',  icon: MapPin },
        { key: 'movements', label: 'Audit Trail', icon: BarChart3 },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Modals */}
            <AddLocationModal   isOpen={isLocationModalOpen}   onClose={() => setIsLocationModalOpen(false)} />
            <AddItemModal       isOpen={isItemModalOpen}       onClose={() => setIsItemModalOpen(false)} />
            <AddStockModal      isOpen={isStockModalOpen}      onClose={() => setIsStockModalOpen(false)} />
            <RecordMovementModal isOpen={isMovementModalOpen}  onClose={() => setIsMovementModalOpen(false)} />
            <TransferModal      isOpen={isTransferOpen}        onClose={() => setIsTransferOpen(false)} preItem={transferItem} />

            {/* Page header */}
            <div className="px-6 pt-6 pb-0 flex flex-col md:flex-row md:items-center gap-4 mb-5">
                <div className="flex-1">
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: DARK }}>Inventory</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track and manage items across all locations, properties and apartments.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => openTransfer()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all active:scale-95"
                        style={{ background: DARK }}>
                        <ArrowRightLeft className="h-4 w-4" /> Transfer
                    </button>
                    <button onClick={() => setIsStockModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all">
                        <TrendingUp className="h-4 w-4" /> Add Stock
                    </button>
                    <button onClick={() => setIsItemModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all">
                        <Plus className="h-4 w-4" /> New Item
                    </button>
                    <button onClick={() => setIsLocationModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all">
                        <MapPin className="h-4 w-4" /> New Location
                    </button>
                </div>
            </div>

            {/* Tab bar + search */}
            <div className="px-6 flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.key} onClick={() => { setTopTab(t.key); setSelectedItem(null); setSelectedLocation(null); setSearch(''); }}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${topTab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                style={topTab === t.key ? { color: DARK } : {}}>
                                <Icon className="h-4 w-4" />{t.label}
                            </button>
                        );
                    })}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#403D3D]/20 focus:border-[#403D3D] outline-none w-56" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden px-6 pb-6">
                <div className="h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex">
                    <AnimatePresence mode="wait">

                        {/* ── Items tab ── */}
                        {topTab === 'items' && !selectedItem && (
                            <motion.div key="items-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
                                {itemsLoading ? (
                                    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-300" /></div>
                                ) : filteredItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <PackageOpen className="h-12 w-12 mb-3 opacity-30" />
                                        <p className="font-medium">No items found</p>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                                            <tr>
                                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Item</th>
                                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Category</th>
                                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Unit</th>
                                                <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Total Stock</th>
                                                <th className="px-3 py-3" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredItems.map(item => {
                                                const total = stockByItem[item.id.toString()] ?? 0;
                                                return (
                                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                                        onClick={() => setSelectedItem(item)}>
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                                    style={{ background: `${DARK}15` }}>
                                                                    <Box className="h-4 w-4" style={{ color: DARK }} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                                                    {item.description && <p className="text-xs text-gray-400 truncate max-w-xs">{item.description}</p>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{item.category}</span>
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-500">{item.unit}</td>
                                                        <td className="px-3 py-3 text-right">
                                                            <span className={`text-sm font-bold ${total === 0 ? 'text-red-500' : 'text-gray-900'}`}>{total}</span>
                                                        </td>
                                                        <td className="px-3 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={e => { e.stopPropagation(); openTransfer(item); }}
                                                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                                                                    <ArrowRightLeft className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button onClick={e => { e.stopPropagation(); setSelectedItem(item); }}
                                                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button onClick={e => { e.stopPropagation(); if (confirm(`Delete "${item.name}"?`)) deleteItem(item.id).then(() => toast.success('Deleted')); }}
                                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </motion.div>
                        )}

                        {/* ── Item detail panel ── */}
                        {topTab === 'items' && selectedItem && (
                            <motion.div key="item-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-hidden flex flex-col">
                                <ItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} onTransfer={it => { openTransfer(it); }} />
                            </motion.div>
                        )}

                        {/* ── Locations tab ── */}
                        {topTab === 'locations' && !selectedLocation && (
                            <motion.div key="locations-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-5">
                                {!isSuperOrNoRestriction && allowedLocationIds.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                        You have access to {allowedLocationIds.length} location{allowedLocationIds.length !== 1 ? 's' : ''} based on your role.
                                    </div>
                                )}
                                {locLoading ? (
                                    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-300" /></div>
                                ) : filteredLocations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <MapPin className="h-12 w-12 mb-3 opacity-30" />
                                        <p className="font-medium">No warehouses found</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredLocations.map(loc => (
                                            <button key={loc.id} onClick={() => setSelectedLocation(loc)}
                                                className="group text-left p-4 border border-gray-200 rounded-xl hover:border-[#403D3D]/40 hover:shadow-md transition-all bg-white">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                                        style={{ background: `${DARK}12` }}>
                                                        <MapPin className="h-4.5 w-4.5" style={{ color: DARK }} />
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${loc.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                        {loc.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-gray-900 text-sm mb-0.5">{loc.name}</p>
                                                {loc.address && <p className="text-xs text-gray-400 truncate">{loc.address}</p>}
                                                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                                                    <span className="text-xs text-gray-400">{loc.inventory_count ?? 0} item types</span>
                                                    <span className="text-xs font-semibold transition-colors group-hover:text-[#403D3D] text-gray-400 flex items-center gap-1">
                                                        View stock <ChevronRight className="h-3 w-3" />
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── Location detail ── */}
                        {topTab === 'locations' && selectedLocation && (
                            <motion.div key="loc-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto flex flex-col">
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
                                    <button onClick={() => setSelectedLocation(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                        <ChevronRight className="h-4 w-4 text-gray-400 rotate-180" />
                                    </button>
                                    <div>
                                        <p className="font-bold text-gray-900">{selectedLocation.name}</p>
                                        <p className="text-xs text-gray-400">{selectedLocation.address}</p>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Current Stock</p>
                                    {(locDetailStock ?? []).length === 0 ? (
                                        <div className="text-center py-10 text-sm text-gray-400">No stock at this location.</div>
                                    ) : (
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-4 py-2.5">Item</th>
                                                    <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-widest px-4 py-2.5">Qty</th>
                                                    <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-widest px-4 py-2.5">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {(locDetailStock ?? []).map(s => (
                                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                        onClick={() => { setTopTab('items'); const it = items.find(i => i.id.toString() === s.item); if (it) setSelectedItem(it); }}>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <Box className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                                <div>
                                                                    <p className="text-sm font-semibold text-gray-900">{s.item_details?.name}</p>
                                                                    <p className="text-xs text-gray-400">{s.item_details?.category} · {s.item_details?.unit}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{s.quantity}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            {s.is_low_stock ? (
                                                                <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Low Stock</span>
                                                            ) : (
                                                                <span className="text-xs font-medium text-emerald-600">OK</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ── Movements / Audit Trail tab ── */}
                        {topTab === 'movements' && (
                            <motion.div key="movements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
                                {movLoading ? (
                                    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-300" /></div>
                                ) : movements.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <Truck className="h-12 w-12 mb-3 opacity-30" /><p className="font-medium">No movements recorded</p>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                                            <tr>
                                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Item</th>
                                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Type</th>
                                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Path</th>
                                                <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Qty</th>
                                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-3 py-3">When</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {movements.map(m => {
                                                const meta = MOVEMENT_LABELS[m.movement_type] ?? { label: m.movement_type_display, color: 'text-gray-700 bg-gray-50 border-gray-200', icon: Box };
                                                const Icon = meta.icon;
                                                const path = [
                                                    m.location_details?.name,
                                                    m.property_details?.name,
                                                    m.apartment_details?.title,
                                                ].filter(Boolean);
                                                return (
                                                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-5 py-3">
                                                            <p className="text-sm font-semibold text-gray-900">{m.item_details?.name}</p>
                                                            {m.reason && <p className="text-xs text-gray-400 italic truncate max-w-xs">{m.reason}</p>}
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${meta.color}`}>
                                                                <Icon className="h-3 w-3" />{meta.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                                                {path.map((p, i) => (
                                                                    <span key={i} className="flex items-center gap-1">
                                                                        {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                                                                        {p}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-right">
                                                            <span className="text-sm font-bold text-gray-900">×{m.quantity}</span>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <p className="text-xs text-gray-500">{fmtDate(m.created_at)}</p>
                                                            {m.performed_by && <p className="text-xs text-gray-400">{m.performed_by}</p>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
