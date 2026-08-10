import { useState, useEffect } from "react";
import { Users, AlertCircle, ShieldCheck, Mail, Phone, Calendar, Power } from "lucide-react";
import api from "../../utils/api";
import { format } from "date-fns";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/users");
      if (res?.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleToggleStatus = async (userId, currentStatus) => {
    setUpdatingId(userId);
    try {
      const newStatus = !currentStatus;
      await api.patch(`/api/users/${userId}/status`, { isActive: newStatus });
      setCustomers(customers.map(c => c._id === userId ? { ...c, isActive: newStatus } : c));
    } catch (err) {
      alert(err.message || "Failed to update user status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <Users className="text-accent" /> Customers
          </h2>
          <p className="text-sm text-ink/60 mt-1">Manage registered user accounts and access.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-700 text-sm p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 text-xs uppercase tracking-wider text-ink/50 border-b border-primary/10">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink/40">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink/40">No customers found.</td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer._id} className={`hover:bg-primary/[0.02] transition-colors ${!customer.isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-medium text-ink">{customer.name}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-ink/80 text-xs">
                          <Mail size={12} className="text-ink/40" /> {customer.email}
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-ink/80 text-xs">
                            <Phone size={12} className="text-ink/40" /> {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {customer.role === "admin" ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-accent uppercase tracking-wider">
                          <ShieldCheck size={14} /> Admin
                        </span>
                      ) : (
                        <span className="text-xs text-ink/50 uppercase tracking-wider">Customer</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-ink/70 text-xs">
                        <Calendar size={12} className="text-ink/40" />
                        {format(new Date(customer.createdAt), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${customer.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {customer.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {customer.role !== "admin" && (
                        <button
                          onClick={() => handleToggleStatus(customer._id, customer.isActive)}
                          disabled={updatingId === customer._id}
                          className={`p-2 rounded-xl transition-all ${
                            customer.isActive 
                              ? 'text-red-500 hover:bg-red-500/10' 
                              : 'text-emerald-500 hover:bg-emerald-500/10'
                          } disabled:opacity-50`}
                          title={customer.isActive ? "Deactivate Account" : "Activate Account"}
                        >
                          <Power size={18} />
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
    </div>
  );
}
