import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Product } from '../types';
import {
  Search, Plus, Edit2, Trash2, Package, AlertTriangle,
  XCircle, Droplets, Box
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function InventoryManagement() {
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '', type: 'water' as 'water' | 'container', price: 0, stock: 0,
    unit: 'container', description: '', minStock: 10,
  });

  const handleDelete = async () => {
    if (!productToDelete) return;
    await deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalProducts = products.length;
  const lowStock = products.filter(p => p.stock <= p.minStock).length;
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);

  const resetForm = () => {
    setForm({ name: '', type: 'water', price: 0, stock: 0, unit: 'container', description: '', minStock: 10 });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, type: p.type, price: p.price, stock: p.stock, unit: p.unit, description: p.description, minStock: p.minStock });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateProduct(editing.id, form);
    } else {
      addProduct(form);
    }
    resetForm();
  };

  const stockLevel = (p: Product) => {
    if (p.stock <= p.minStock) return 'low';
    if (p.stock <= p.minStock * 2) return 'medium';
    return 'good';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalProducts}</p>
              <p className="text-sm text-gray-500">Total Products</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{lowStock}</p>
              <p className="text-sm text-gray-500">Low Stock Items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Droplets className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">₱{totalValue.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Inventory Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    p.type === 'water' ? 'bg-cyan-100' : 'bg-orange-100'
                  }`}>
                    {p.type === 'water' ? <Droplets className="w-5 h-5 text-cyan-600" /> : <Box className="w-5 h-5 text-orange-600" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{p.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{p.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setProductToDelete(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete Product">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3">{p.description}</p>

              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-blue-600">₱{p.price}</p>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      stockLevel(p) === 'low' ? 'bg-red-500' : stockLevel(p) === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className={`text-sm font-semibold ${
                      stockLevel(p) === 'low' ? 'text-red-600' : stockLevel(p) === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {p.stock} {p.unit}s
                    </span>
                  </div>
                  {stockLevel(p) === 'low' && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" /> Low stock
                    </p>
                  )}
                </div>
              </div>

              {/* Stock bar */}
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    stockLevel(p) === 'low' ? 'bg-red-500' : stockLevel(p) === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, (p.stock / (p.minStock * 3)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">{editing ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'water' | 'container' })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="water">Water</option>
                    <option value="container">Container</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input type="text" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₱)</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" min="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" min="0" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                <input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" min="0" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={2} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                  {editing ? 'Update Product' : 'Add Product'}
                </button>
                <button type="button" onClick={resetForm} className="px-6 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation */}
      <ConfirmModal
        show={!!productToDelete}
        title="Delete Product?"
        message={`Are you sure you want to permanently delete "${productToDelete?.name}"? This product will be removed from inventory and won't be available for ordering. This action cannot be undone.`}
        confirmText="Yes, Delete"
        onConfirm={handleDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}
