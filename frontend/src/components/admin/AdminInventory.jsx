import { useState, useEffect } from "react";
import { Boxes, Edit2, Save, X, Search } from "lucide-react";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";

export default function AdminInventory() {
  const { notify } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ stock: 0, price: 0, mrp: 0 });
  const [search, setSearch] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/products?limit=1000");
      setProducts(res.data);
    } catch (err) {
      console.error(err);
      notify("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product) => {
    setEditingId(product._id);
    setEditForm({ stock: product.stock, price: product.price, mrp: product.mrp });
  };

  const handleSave = async (id) => {
    try {
      await api.patch(`/api/products/${id}`, {
        stock: Number(editForm.stock),
        price: Number(editForm.price),
        mrp: Number(editForm.mrp),
      });
      notify("Inventory updated successfully!");
      setEditingId(null);
      
      // Update local state
      setProducts(products.map(p => 
        p._id === id ? { ...p, ...editForm } : p
      ));
    } catch (err) {
      console.error(err);
      notify("Failed to update inventory");
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border-l-4 border-accent space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Boxes size={20} className="text-accent" />
            <h3 className="font-display text-xl font-semibold text-primary">
              Inventory & Stock
            </h3>
          </div>
          <p className="text-xs text-ink/60">
            Monitor stock levels and quickly adjust pricing and quantities.
          </p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none w-full sm:w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-bg/50 text-xs uppercase font-semibold text-primary">
            <tr>
              <th className="px-4 py-3 rounded-l-xl">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">MRP</th>
              <th className="px-4 py-3 rounded-r-xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-ink/50 text-xs">
                  Loading inventory...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-ink/50 text-xs">
                  No products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p._id} className="hover:bg-bg/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg shrink-0">
                        {p.thumbnail?.url && (
                          <img src={p.thumbnail.url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className="font-medium text-primary max-w-[200px] truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{p.sku || "-"}</td>
                  <td className="px-4 py-3">
                    {editingId === p._id ? (
                      <input 
                        type="number" 
                        value={editForm.stock} 
                        onChange={(e) => setEditForm({...editForm, stock: e.target.value})}
                        className="w-20 px-2 py-1 rounded border border-primary/20 text-xs outline-none focus:border-accent"
                      />
                    ) : (
                      <span className={`font-semibold ${p.stock <= 5 ? "text-red-600" : "text-green-600"}`}>
                        {p.stock}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === p._id ? (
                      <input 
                        type="number" 
                        value={editForm.price} 
                        onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                        className="w-20 px-2 py-1 rounded border border-primary/20 text-xs outline-none focus:border-accent"
                      />
                    ) : (
                      <span className="text-primary">₹{p.price}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === p._id ? (
                      <input 
                        type="number" 
                        value={editForm.mrp} 
                        onChange={(e) => setEditForm({...editForm, mrp: e.target.value})}
                        className="w-20 px-2 py-1 rounded border border-primary/20 text-xs outline-none focus:border-accent"
                      />
                    ) : (
                      <span className="text-ink/60 line-through">₹{p.mrp}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === p._id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-ink/50 hover:bg-bg rounded-lg">
                          <X size={16} />
                        </button>
                        <button onClick={() => handleSave(p._id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                          <Save size={16} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleEdit(p)} className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
