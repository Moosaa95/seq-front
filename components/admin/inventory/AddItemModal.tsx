'use client';

import { useState } from 'react';
import { X, Loader2, Camera } from 'lucide-react';
import { useCreateInventoryItemMutation } from '@/lib/store/api/inventoryApi';
import { toast } from 'sonner';

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = ['Linens', 'Kitchenware', 'Toiletries', 'Electronics', 'Furniture', 'Cleaning', 'Safety', 'Other'];
const UNITS = ['piece', 'set', 'box', 'kg', 'liter', 'pair', 'roll'];

export default function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
    const [createItem, { isLoading }] = useCreateInventoryItemMutation();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        unit: 'piece',
        is_active: true,
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const reset = () => {
        setFormData({ name: '', category: '', description: '', unit: 'piece', is_active: true });
        setImageFile(null);
        setImagePreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let payload: any = formData;
            if (imageFile) {
                const fd = new FormData();
                for (const [k, v] of Object.entries(formData)) {
                    fd.append(k, String(v));
                }
                fd.append('image', imageFile);
                payload = fd;
            }
            await createItem(payload).unwrap();
            toast.success('Inventory item created successfully');
            reset();
            onClose();
        } catch (error: any) {
            console.error('Failed to create item', error);
            toast.error(error?.data?.detail || 'Failed to create item');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-900">Add New Item</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Item image */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-lg object-cover border-2 border-emerald-300" />
                            ) : (
                                <div className="h-20 w-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                    <Camera className="h-7 w-7 text-gray-400" />
                                </div>
                            )}
                            <label htmlFor="item_photo" className="absolute -bottom-1 -right-1 bg-white border border-gray-300 rounded-full p-1.5 cursor-pointer hover:bg-gray-50 shadow-sm">
                                <Camera className="h-3 w-3 text-gray-600" />
                            </label>
                        </div>
                        <input id="item_photo" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        <p className="text-xs text-gray-500">Click to add item photo (optional)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                            placeholder="e.g. Bath Towel"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                required
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                            >
                                <option value="">Select...</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                            <select
                                value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                            >
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                            placeholder="Item details..."
                            rows={2}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_active_item"
                            checked={formData.is_active}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor="is_active_item" className="text-sm text-gray-700">Active Item</label>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Item
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
