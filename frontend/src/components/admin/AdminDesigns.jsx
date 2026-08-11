import { useState, useEffect } from "react";
import { Palette, Trash2, ExternalLink, Search, CheckCircle, XCircle } from "lucide-react";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";

export default function AdminDesigns() {
  const { notify } = useApp();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/designs");
      setDesigns(res.data);
    } catch (err) {
      console.error(err);
      notify("Failed to fetch designs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigns();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this design?")) return;
    try {
      await api.delete(`/api/designs/${id}`);
      notify("Design deleted successfully");
      setDesigns(designs.filter(d => d._id !== id));
    } catch (err) {
      console.error(err);
      notify("Failed to delete design");
    }
  };

  const handleModerate = async (id, status) => {
    try {
      await api.patch(`/api/designs/${id}/moderate`, { status });
      notify(`Design ${status} successfully`);
      setDesigns(designs.map(d => d._id === id ? { ...d, status } : d));
    } catch (err) {
      console.error(err);
      notify("Failed to moderate design");
    }
  };

  const filteredDesigns = designs.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    (d.category?.name && d.category.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border-l-4 border-accent space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Palette size={20} className="text-accent" />
            <h3 className="font-display text-xl font-semibold text-primary">
              Design Gallery
            </h3>
          </div>
          <p className="text-xs text-ink/60">
            Manage official catalog designs and moderate customer submissions.
          </p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder="Search designs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none w-full sm:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {loading ? (
          <div className="col-span-full py-10 text-center text-ink/50 text-sm">Loading designs...</div>
        ) : filteredDesigns.length === 0 ? (
          <div className="col-span-full py-10 text-center text-ink/50 text-sm">No designs found.</div>
        ) : (
          filteredDesigns.map((design) => (
            <div key={design._id} className="group bg-white rounded-2xl border border-primary/10 overflow-hidden shadow-sm hover:shadow-soft transition-all flex flex-col">
              <div className="relative aspect-[4/5] bg-bg overflow-hidden">
                {design.thumbnail?.url ? (
                  <img src={design.thumbnail.url} alt={design.title} className="w-full h-full object-cover" />
                ) : design.images?.[0]?.url ? (
                  <img src={design.images[0].url} alt={design.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink/20">No Image</div>
                )}
                
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold tracking-wider uppercase text-primary shadow-sm">
                    {design.category?.name || "Uncategorized"}
                  </span>
                  {design.source === "customer" && (
                    <span className="px-2.5 py-1 bg-accent/90 backdrop-blur-sm rounded-full text-[10px] font-bold tracking-wider uppercase text-white shadow-sm self-start">
                      Community
                    </span>
                  )}
                  {design.status === "pending_review" && (
                    <span className="px-2.5 py-1 bg-amber-500/90 backdrop-blur-sm rounded-full text-[10px] font-bold tracking-wider uppercase text-white shadow-sm self-start">
                      Pending
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-4 flex-1 flex flex-col">
                <h4 className="font-semibold text-sm text-primary mb-1 line-clamp-1" title={design.title}>{design.title}</h4>
                <p className="text-xs text-ink/60 line-clamp-2 mb-3 flex-1">{design.description}</p>
                
                <div className="pt-3 border-t border-primary/5 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1.5">
                    {design.source === "customer" && design.status === "pending_review" ? (
                      <>
                        <button onClick={() => handleModerate(design._id, "active")} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors" title="Approve">
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => handleModerate(design._id, "rejected")} className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors" title="Reject">
                          <XCircle size={16} />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] font-medium text-ink/50 uppercase tracking-wide">
                        {design.status}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <a href={`/design-gallery/${design.slug}`} target="_blank" rel="noreferrer" className="p-1.5 text-primary/50 hover:text-accent hover:bg-accent/5 rounded-lg transition-colors" title="View Public Page">
                      <ExternalLink size={16} />
                    </a>
                    <button onClick={() => handleDelete(design._id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Design">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
