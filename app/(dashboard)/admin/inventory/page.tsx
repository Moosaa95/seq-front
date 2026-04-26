'use client';

import { useState } from 'react';
import {
    useGetLocationsQuery,
    useGetInventoryItemsQuery,
    useGetLocationInventoryQuery,
    useGetPropertyInventoryQuery,
    useGetApartmentInventoryQuery,
    useGetInventoryMovementsQuery,
    useDeleteLocationMutation,
    useDeleteInventoryItemMutation,
    useUpdateLocationMutation,
    useUpdateInventoryItemMutation,
    type Location,
    type InventoryItem,
    type LocationInventory,
    type PropertyInventory,
    type ApartmentInventory,
    type InventoryMovement,
} from '@/lib/store/api/inventoryApi';
import { DataTable } from '@/components/admin/DataTable';
import { Plus, Edit, Trash, Box, Home, Truck, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import AddLocationModal from '@/components/admin/inventory/AddLocationModal';
import AddItemModal from '@/components/admin/inventory/AddItemModal';
import AddStockModal from '@/components/admin/inventory/AddStockModal';
import RecordMovementModal from '@/components/admin/inventory/RecordMovementModal';
import { NIGERIA_STATES, getLGAsForState } from '@/lib/data/nigeria-states-lgas';

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<'locations' | 'items' | 'stock' | 'property' | 'apartment' | 'movements'>('locations');
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

    return (
        <div className="space-y-6">
            <AddLocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
            <AddItemModal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} />
            <AddStockModal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} />
            <RecordMovementModal isOpen={isMovementModalOpen} onClose={() => setIsMovementModalOpen(false)} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage locations, items, stock levels, and audit trail</p>
                </div>

                <div className="flex gap-2">
                    {activeTab === 'locations' && (
                        <button
                            onClick={() => setIsLocationModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Location
                        </button>
                    )}
                    {activeTab === 'items' && (
                        <button
                            onClick={() => setIsItemModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Item
                        </button>
                    )}
                    {activeTab === 'stock' && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsMovementModalOpen(true)}
                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                                <Truck className="w-4 h-4" />
                                Record Movement
                            </button>
                            <button
                                onClick={() => setIsStockModalOpen(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Init Stock
                            </button>
                        </div>
                    )}
                    {(activeTab === 'movements' || activeTab === 'property' || activeTab === 'apartment') && (
                        <button
                            onClick={() => setIsMovementModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Record Movement
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {[
                        { id: 'locations', name: 'Locations', icon: <Home className="w-4 h-4" /> },
                        { id: 'items', name: 'Items', icon: <Box className="w-4 h-4" /> },
                        { id: 'stock', name: 'Stock Levels', icon: <Box className="w-4 h-4" /> },
                        { id: 'property', name: 'Building Inventory', icon: <Home className="w-4 h-4" /> },
                        { id: 'apartment', name: 'Apartment Inventory', icon: <Home className="w-4 h-4" /> },
                        { id: 'movements', name: 'Audit Trail', icon: <Truck className="w-4 h-4" /> },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === tab.id
                                    ? 'border-emerald-600 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
              `}
                        >
                            {tab.icon}
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                {activeTab === 'locations' && <LocationsTab />}
                {activeTab === 'items' && <ItemsTab />}
                {activeTab === 'stock' && <StockTab />}
                {activeTab === 'property' && <PropertyInventoryTab />}
                {activeTab === 'apartment' && <ApartmentInventoryTab />}
                {activeTab === 'movements' && <MovementsTab />}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Location Modal
// ─────────────────────────────────────────────────────────────────────────────

function EditLocationModal({ location, onClose }: { location: Location; onClose: () => void }) {
    const [updateLocation, { isLoading }] = useUpdateLocationMutation();
    const [formData, setFormData] = useState({
        name: location.name,
        address: location.address || '',
        state: location.state || '',
        lga: location.lga || '',
        country: location.country || 'Nigeria',
        is_active: location.is_active,
    });

    const availableLGAs = formData.state ? getLGAsForState(formData.state) : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateLocation({ id: location.id as any, data: formData }).unwrap();
            toast.success('Location updated');
            onClose();
        } catch {
            toast.error('Failed to update location');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-900">Edit Location</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                        <input type="text" required value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <input type="text" value={formData.country}
                            onChange={e => setFormData({ ...formData, country: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                            <select value={formData.state}
                                onChange={e => setFormData({ ...formData, state: e.target.value, lga: '' })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white">
                                <option value="">Select State</option>
                                {NIGERIA_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
                            <select value={formData.lga}
                                onChange={e => setFormData({ ...formData, lga: e.target.value })}
                                disabled={!formData.state}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-gray-100">
                                <option value="">{formData.state ? 'Select LGA' : 'Pick state first'}</option>
                                {availableLGAs.map(lga => <option key={lga} value={lga}>{lga}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" rows={3} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit_is_active" checked={formData.is_active}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                            className="rounded border-gray-300 text-emerald-600" />
                        <label htmlFor="edit_is_active" className="text-sm text-gray-700">Active</label>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isLoading}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Item Modal
// ─────────────────────────────────────────────────────────────────────────────

function EditItemModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
    const [updateItem, { isLoading }] = useUpdateInventoryItemMutation();
    const [formData, setFormData] = useState({
        name: item.name,
        category: item.category,
        description: item.description || '',
        unit: item.unit,
        is_active: item.is_active,
    });

    const categories = ['Linens', 'Kitchenware', 'Toiletries', 'Electronic', 'Furniture', 'Other'];
    const units = ['piece', 'set', 'box', 'kg', 'liter'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateItem({ id: item.id as any, data: formData }).unwrap();
            toast.success('Item updated');
            onClose();
        } catch {
            toast.error('Failed to update item');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-900">Edit Item</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X className="h-5 w-5 text-gray-500" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                        <input type="text" required value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select required value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500">
                                <option value="">Select...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                            <select value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500">
                                {units.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" rows={2} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit_item_active" checked={formData.is_active}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                            className="rounded border-gray-300 text-emerald-600" />
                        <label htmlFor="edit_item_active" className="text-sm text-gray-700">Active</label>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isLoading}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Components
// ─────────────────────────────────────────────────────────────────────────────

function LocationsTab() {
    const { data: locations, isLoading } = useGetLocationsQuery({});
    const [deleteLocation, { isLoading: isDeleting }] = useDeleteLocationMutation();
    const [editTarget, setEditTarget] = useState<Location | null>(null);

    const handleDelete = async (loc: Location) => {
        if (!confirm(`Delete location "${loc.name}"? This cannot be undone.`)) return;
        try {
            await deleteLocation(loc.id as any).unwrap();
            toast.success('Location deleted');
        } catch {
            toast.error('Failed to delete location');
        }
    };

    const columns = [
        {
            header: 'Name',
            accessorKey: 'name',
            cell: ({ getValue }: any) => <span className="font-medium text-gray-900">{getValue()}</span>,
        },
        {
            header: 'Address',
            accessorKey: 'address',
            cell: ({ getValue }: any) => (
                <span className="text-gray-600 block max-w-xs truncate" title={getValue() || ''}>{getValue() || '-'}</span>
            ),
        },
        {
            header: 'State / LGA',
            accessorKey: 'state',
            cell: ({ row }: any) => (
                <span className="text-gray-700">
                    {row.original.state || '-'}{row.original.lga ? ` / ${row.original.lga}` : ''}
                </span>
            ),
        },
        {
            header: 'Country',
            accessorKey: 'country',
            cell: ({ getValue }: any) => <span className="text-gray-700">{getValue() || '-'}</span>,
        },
        {
            header: 'Status',
            accessorKey: 'is_active',
            cell: ({ getValue }: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getValue() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {getValue() ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            header: 'Items',
            accessorKey: 'inventory_count',
            cell: ({ getValue }: any) => <span className="font-mono text-gray-900">{getValue() || 0}</span>,
        },
    ];

    if (isLoading) return <div className="text-center py-10">Loading locations...</div>;

    return (
        <>
            {editTarget && <EditLocationModal location={editTarget} onClose={() => setEditTarget(null)} />}
            <DataTable
                data={locations || []}
                columns={columns}
                searchPlaceholder="Search locations..."
                actions={(row: Location) => (
                    <div className="flex gap-2">
                        <button onClick={() => setEditTarget(row)} className="p-1 hover:bg-gray-100 rounded text-blue-600" title="Edit">
                            <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(row)} disabled={isDeleting}
                            className="p-1 hover:bg-gray-100 rounded text-red-600 disabled:opacity-50" title="Delete">
                            <Trash className="w-4 h-4" />
                        </button>
                    </div>
                )}
            />
        </>
    );
}

function ItemsTab() {
    const { data: items, isLoading } = useGetInventoryItemsQuery({});
    const [deleteItem, { isLoading: isDeleting }] = useDeleteInventoryItemMutation();
    const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);

    const handleDelete = async (item: InventoryItem) => {
        if (!confirm(`Delete item "${item.name}"? This cannot be undone.`)) return;
        try {
            await deleteItem(item.id as any).unwrap();
            toast.success('Item deleted');
        } catch {
            toast.error('Failed to delete item');
        }
    };

    const columns = [
        {
            header: 'Name',
            accessorKey: 'name',
            cell: ({ getValue }: any) => <span className="font-medium text-gray-900">{getValue()}</span>,
        },
        {
            header: 'Category',
            accessorKey: 'category',
            cell: ({ getValue }: any) => (
                <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded text-xs uppercase tracking-wide">{getValue()}</span>
            ),
        },
        {
            header: 'Unit',
            accessorKey: 'unit',
            cell: ({ getValue }: any) => <span className="text-gray-600 text-sm">{getValue()}</span>,
        },
        {
            header: 'Status',
            accessorKey: 'is_active',
            cell: ({ getValue }: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getValue() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {getValue() ? 'Active' : 'Inactive'}
                </span>
            ),
        },
    ];

    if (isLoading) return <div className="text-center py-10">Loading items...</div>;

    return (
        <>
            {editTarget && <EditItemModal item={editTarget} onClose={() => setEditTarget(null)} />}
            <DataTable
                data={items || []}
                columns={columns}
                searchPlaceholder="Search items..."
                actions={(row: InventoryItem) => (
                    <div className="flex gap-2">
                        <button onClick={() => setEditTarget(row)} className="p-1 hover:bg-gray-100 rounded text-blue-600" title="Edit">
                            <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(row)} disabled={isDeleting}
                            className="p-1 hover:bg-gray-100 rounded text-red-600 disabled:opacity-50" title="Delete">
                            <Trash className="w-4 h-4" />
                        </button>
                    </div>
                )}
            />
        </>
    );
}

function StockTab() {
    const { data: stock, isLoading } = useGetLocationInventoryQuery({});

    const columns = [
        {
            header: 'Location',
            accessorKey: 'location_details',
            cell: ({ getValue }: any) => {
                const loc = getValue();
                return <span className="font-medium text-gray-900">{loc?.name || 'Unknown Location'}</span>;
            },
        },
        {
            header: 'Item',
            accessorKey: 'item_details',
            cell: ({ getValue }: any) => {
                const item = getValue();
                return (
                    <div>
                        <span className="block font-medium text-gray-900">{item?.name || 'Unknown Item'}</span>
                        <span className="text-xs text-gray-500">{item?.category}</span>
                    </div>
                );
            },
        },
        {
            header: 'Quantity',
            accessorKey: 'quantity',
            cell: ({ getValue, row }: any) => (
                <span className={`font-mono font-bold ${row.original.is_low_stock ? 'text-red-600' : 'text-green-600'}`}>
                    {getValue()}
                </span>
            ),
        },
        { header: 'Threshold', accessorKey: 'min_threshold' },
        {
            header: 'Status',
            accessorKey: 'is_low_stock',
            cell: ({ getValue }: any) => (
                getValue()
                    ? <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Low Stock</span>
                    : <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">OK</span>
            ),
        },
    ];

    if (isLoading) return <div className="text-center py-10">Loading stock data...</div>;

    return (
        <DataTable
            data={stock || []}
            columns={columns}
            searchPlaceholder="Search stock..."
            actions={(row: LocationInventory) => (
                <div className="flex gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded text-blue-600" title="Update Stock">
                        <Edit className="w-4 h-4" />
                    </button>
                </div>
            )}
        />
    );
}

function PropertyInventoryTab() {
    const { data: propInv, isLoading } = useGetPropertyInventoryQuery({});

    const columns = [
        {
            header: 'Building',
            accessorKey: 'property_details',
            cell: ({ getValue }: any) => {
                const prop = getValue();
                return <span className="font-medium">{prop?.name || '-'}</span>;
            },
        },
        {
            header: 'Item',
            accessorKey: 'item_details',
            cell: ({ getValue }: any) => {
                const item = getValue();
                return <span>{item?.name || '-'}</span>;
            },
        },
        { header: 'Quantity', accessorKey: 'quantity' },
    ];

    if (isLoading) return <div className="text-center py-10">Loading building inventory...</div>;

    return (
        <DataTable
            data={propInv || []}
            columns={columns}
            searchPlaceholder="Search building inventory..."
            actions={(row: PropertyInventory) => (
                <div className="flex gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded text-blue-600" title="Edit">
                        <Edit className="w-4 h-4" />
                    </button>
                </div>
            )}
        />
    );
}

function ApartmentInventoryTab() {
    const { data: aptInv, isLoading } = useGetApartmentInventoryQuery({});

    const columns = [
        {
            header: 'Apartment Unit',
            accessorKey: 'apartment_details',
            cell: ({ getValue }: any) => {
                const apt = getValue();
                return <span className="font-medium">{apt?.title || '-'}</span>;
            },
        },
        {
            header: 'Item',
            accessorKey: 'item_details',
            cell: ({ getValue }: any) => {
                const item = getValue();
                return <span>{item?.name || '-'}</span>;
            },
        },
        { header: 'Quantity', accessorKey: 'quantity' },
    ];

    if (isLoading) return <div className="text-center py-10">Loading apartment inventory...</div>;

    return (
        <DataTable
            data={aptInv || []}
            columns={columns}
            searchPlaceholder="Search apartment inventory..."
            actions={(row: ApartmentInventory) => (
                <div className="flex gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded text-blue-600" title="Edit">
                        <Edit className="w-4 h-4" />
                    </button>
                </div>
            )}
        />
    );
}

function MovementsTab() {
    const { data: movements, isLoading } = useGetInventoryMovementsQuery({});

    const columns = [
        {
            header: 'Date',
            accessorKey: 'created_at',
            cell: ({ getValue }: any) => new Date(getValue()).toLocaleString(),
        },
        {
            header: 'Type',
            accessorKey: 'movement_type_display',
            cell: ({ getValue }: any) => (
                <span className="text-xs font-medium uppercase bg-gray-100 px-2 py-1 rounded">{getValue()}</span>
            ),
        },
        {
            header: 'Details',
            accessorKey: 'id',
            cell: ({ row }: any) => (
                <div className="text-sm">
                    <span className="font-medium">{row.original.item_details?.name}</span>
                    {' at '}
                    {row.original.location_details?.name}
                    {row.original.property_details && (
                        <span className="text-gray-500"> → {row.original.property_details.name}</span>
                    )}
                </div>
            ),
        },
        {
            header: 'Qty',
            accessorKey: 'quantity',
            cell: ({ getValue }: any) => {
                const qty = getValue();
                return (
                    <span className={`font-mono font-bold ${qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {qty > 0 ? `+${qty}` : qty}
                    </span>
                );
            },
        },
        { header: 'Reason', accessorKey: 'reason' },
        { header: 'By', accessorKey: 'performed_by' },
    ];

    if (isLoading) return <div className="text-center py-10">Loading audit trail...</div>;

    return (
        <DataTable
            data={movements || []}
            columns={columns}
            searchPlaceholder="Search movements..."
        />
    );
}
