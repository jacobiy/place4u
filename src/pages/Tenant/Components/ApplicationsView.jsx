import React, { useState, useEffect } from 'react';
import { FileText, MapPin, DollarSign, Calendar, XCircle, Edit2, Loader2 } from 'lucide-react';
import { TenantQueries } from '../db/queries';
import { T } from '../Styles/designTokens';
import CustomApplication from './CustomApplication';

export default function ApplicationsView({ user, setApplicationsCount, onOpenCustomApplication }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingApp, setEditingApp] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    setLoading(true);
    const result = await TenantQueries.getTenantApplications(user.id);
    if (result.success) {
      setApplications(result.data);
      const activeApps = result.data.filter(app => app.status !== 'expired' && app.status !== 'cancelled');
      setApplicationsCount(activeApps.length);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this application?")) return;
    const result = await TenantQueries.cancelApplication(id);
    if (result.success) {
      fetchApplications();
    } else {
      alert("Failed to cancel application.");
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'submitted': return T.emerald;
      case 'under_review': return T.accent;
      case 'matches_found': return T.purple;
      case 'expired': 
      case 'cancelled': return T.red;
      default: return T.textSecondary;
    }
  };

  if (loading) return <div className="p-8 text-white/50 flex items-center justify-center h-64"><Loader2 className="animate-spin mr-3" /> Loading your applications...</div>;

  return (
    <div className="max-w-6xl mx-auto animation-fade-in text-white">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold font-serif mb-2 text-white">My Applications</h1>
          <p className="text-white/60">Manage your active property search preferences and applications.</p>
        </div>
        <button
          type="button"
          onClick={onOpenCustomApplication}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-bold shadow-lg shadow-blue-600/20 text-white"
        >
          Submit Application
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6">{error}</div>}

      {applications.length === 0 ? (
        <div className="glass p-12 rounded-3xl text-center border border-white/5 flex flex-col items-center shadow-2xl">
          <FileText size={64} className="text-white/20 mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Applications Yet</h2>
          <p className="text-white/40 max-w-md">You haven't submitted any applications. Click "Submit Application" from the dashboard to start your journey.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {applications.map(app => (
            <div key={app.id} className="glass p-6 rounded-3xl border border-white/5 hover:border-white/20 transition-colors relative overflow-hidden group shadow-xl">
              {/* Status Badge */}
              <div className="absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2" style={{ background: `${getStatusColor(app.status)}20`, color: getStatusColor(app.status) }}>
                <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ background: getStatusColor(app.status) }} />
                {app.status.replace('_', ' ')}
              </div>

              <div className="space-y-4 pr-32">
                <div className="flex items-start gap-3">
                  <MapPin className="text-white/40 mt-1" size={18} />
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Preferred Areas</p>
                    <p className="font-medium text-sm">{app.preferred_areas?.join(', ') || 'Any Area'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="text-white/40 mt-1" size={18} />
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Budget</p>
                      <p className="font-medium text-sm text-green-400">R{app.min_budget || 0} - R{app.max_budget || 'Any'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="text-white/40 mt-1" size={18} />
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Move In</p>
                      <p className="font-medium text-sm">{app.move_in_date || 'Flexible'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {app.status !== 'expired' && app.status !== 'cancelled' && (
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
                  <button 
                    onClick={() => setEditingApp(app)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button 
                    onClick={() => handleCancel(app.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  >
                    <XCircle size={16} /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingApp && (
        <CustomApplication 
          user={user}
          application={editingApp}
          onCancel={() => setEditingApp(null)}
          onSuccess={() => fetchApplications()}
        />
      )}
    </div>
  );
}
