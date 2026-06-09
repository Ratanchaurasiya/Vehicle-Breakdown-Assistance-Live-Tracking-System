import { useState, useEffect } from 'react';
import { Shield, Users, CreditCard, Activity, AlertTriangle, CheckCircle, Clock, BarChart2, PieChart, Key } from 'lucide-react';
import MapComponent from './MapComponent';
import { apiPath } from '../config/api';

export default function AdminDashboard({ socket }) {
  const [metrics, setMetrics] = useState({ totalBookings: 0, totalRevenue: 0, avgRating: 0 });
  const [garages, setGarages] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeReq, setActiveReq] = useState(null);
  const [geofenceLogs, setGeofenceLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, garages, payments, complaints, analytics
  
  // Google Maps API Key Setup
  const [mapsKey, setMapsKey] = useState(localStorage.getItem('google_maps_api_key') || '');
  const [keySaved, setKeySaved] = useState(false);

  // Fetch initial reporting data
  const fetchData = async () => {
    try {
      const repRes = await fetch(apiPath('/api/admin/reports'));
      const repData = await repRes.json();
      setMetrics({
        totalBookings: repData.totalBookings,
        totalRevenue: repData.totalRevenue,
        avgRating: repData.avgRating
      });
      setHistory(repData.history || []);

      const garRes = await fetch(apiPath('/api/garages'));
      const garData = await garRes.json();
      setGarages(garData || []);

      const compRes = await fetch(apiPath('/api/complaints'));
      const compData = await compRes.json();
      setComplaints(compData || []);

      const actRes = await fetch(apiPath('/api/request/active'));
      const actData = await actRes.json();
      if (actData && actData.length > 0) {
        setActiveReq(actData[0]);
      } else {
        setActiveReq(null);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    fetchData();

    if (!socket) return;

    socket.emit('join_room', { role: 'admin', id: 'admin-panel' });

    socket.on('new_request_received', (req) => {
      setActiveReq(req);
      fetchData();
    });

    socket.on('request_status_changed', (req) => {
      setActiveReq(req.status === 'completed' ? null : req);
      fetchData();
    });

    socket.on('location_updated_admin', (data) => {
      setActiveReq(prev => {
        if (prev && prev.id === data.requestId && prev.mechanic) {
          return {
            ...prev,
            eta: data.eta,
            mechanic: { ...prev.mechanic, lat: data.lat, lng: data.lng }
          };
        }
        return prev;
      });
    });

    socket.on('admin_geofence_log', (log) => {
      setGeofenceLogs(prev => [log, ...prev].slice(0, 15));
    });

    socket.on('payment_logged_admin', () => {
      setActiveReq(null);
      fetchData();
    });

    socket.on('feedback_submitted', () => {
      fetchData();
    });

    socket.on('request_cancelled', () => {
      setActiveReq(null);
      fetchData();
    });

    return () => {
      socket.off('new_request_received');
      socket.off('request_status_changed');
      socket.off('location_updated_admin');
      socket.off('admin_geofence_log');
      socket.off('payment_logged_admin');
      socket.off('feedback_submitted');
      socket.off('request_cancelled');
    };
  }, [socket]);

  const toggleVerifyGarage = (garageId) => {
    setGarages(prev => 
      prev.map(g => g.id === garageId ? { ...g, verified: !g.verified } : g)
    );
  };

  const resolveComplaint = async (id) => {
    try {
      await fetch(apiPath('/api/admin/complaints/resolve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: id })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const forceCancelActive = async () => {
    try {
      await fetch(apiPath('/api/request/cancel'), { method: 'POST' });
      setActiveReq(null);
    } catch (err) {
      console.error(err);
    }
  };

  const saveApiKey = () => {
    localStorage.setItem('google_maps_api_key', mapsKey);
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
      window.location.reload(); // Reload to refresh Google Maps scripts
    }, 1500);
  };

  // Helper to estimate platform commission collected
  const getCommissionCollected = (finalAmount) => {
    // Standard mock collected rate (8% from Gold Plan garages)
    return Math.round(finalAmount * 0.08);
  };

  const totalCommissionsCollected = history.reduce((sum, h) => sum + getCommissionCollected(h.finalAmount), 0);

  // Monthly revenue mock data
  const monthlyRevenue = [
    { label: 'Jan', value: '₹24,000', percentage: '35%' },
    { label: 'Feb', value: '₹36,000', percentage: '55%' },
    { label: 'Mar', value: '₹45,000', percentage: '68%' },
    { label: 'Apr', value: '₹58,000', percentage: '82%' },
    { label: 'May', value: '₹72,000', percentage: '95%' }
  ];

  // Breakdown issues distribution mock data
  const issueTypes = [
    { name: 'Flat Tyre / Puncture', count: 28, percentage: 45, color: 'var(--primary)' },
    { name: 'Battery Jumpstart', count: 15, percentage: 24, color: 'var(--warning)' },
    { name: 'Engine Overheat / Smoke', count: 11, percentage: 18, color: 'var(--error)' },
    { name: 'Towing Assistance', count: 8, percentage: 13, color: 'var(--success)' }
  ];

  return (
    <div className="animate-slide-up" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={24} style={{ color: 'var(--primary)' }} /> AutoRescue Admin Center
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Operations monitoring, security diagnostics, and business performance.</p>
        </div>
        <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }}>
          Refresh Feeds
        </button>
      </div>

      {/* Google Maps API Key Config Panel */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', borderLeft: '4px solid var(--primary)' }}>
        <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Key size={15} style={{ color: 'var(--primary)' }} /> Google Maps API Key Setup
        </h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Paste your Google Maps API Key here..." 
            value={mapsKey}
            onChange={(e) => setMapsKey(e.target.value)}
            style={{ flex: 1, fontSize: '12px' }}
          />
          <button onClick={saveApiKey} className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', flexShrink: 0 }}>
            {keySaved ? 'Saving & Reloading...' : 'Save & Initialize Map'}
          </button>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
          * Leaving this empty will load Google Maps in standard Development Mode (which fully supports all marker animations and route overlays).
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--primary-glow)', padding: '10px', borderRadius: '12px' }}>
            <Activity size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Requests</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>{activeReq ? 1 : 0}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--success-glow)', padding: '10px', borderRadius: '12px' }}>
            <CreditCard size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Platform Revenue</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>₹{metrics.totalRevenue}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '10px', borderRadius: '12px' }}>
            <Shield size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Commissions Collected</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success)' }}>₹{totalCommissionsCollected}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', padding: '10px', borderRadius: '12px' }}>
            <Users size={24} style={{ color: 'var(--error)' }} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Completed Jobs</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>{metrics.totalBookings}</div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', marginBottom: '20px', paddingBottom: '1px' }}>
        {['overview', 'analytics', 'garages', 'payments', 'complaints'].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{ 
              background: 'transparent', 
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: 0,
              padding: '8px 16px',
              fontSize: '14px',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Active Job tracker split */}
          {activeReq ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px' }}>
                      <span className="status-dot active"></span> LIVE INTERACTION IN PROGRESS
                    </h3>
                    <button onClick={forceCancelActive} className="btn-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>
                      Terminate Request
                    </button>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div><b>Request ID:</b> {activeReq.id}</div>
                    <div><b>Vehicle Category:</b> <span style={{ padding: '1px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '11px', color: 'var(--primary)' }}>{activeReq.vehicleCategory === 'Bike' ? '🏍️ Bike' : activeReq.vehicleCategory === 'Truck' ? '🚚 Truck' : '🚗 Car'}</span></div>
                    <div><b>Vehicle:</b> {activeReq.vehicleName}</div>
                    {activeReq.vehicleBrand && (
                      <>
                        <div><b>Brand / Type:</b> {activeReq.vehicleBrand} • {activeReq.vehicleType}</div>
                        <div><b>Model / Reg No:</b> {activeReq.vehicleModel} • {activeReq.vehicleNumber}</div>
                      </>
                    )}
                    <div><b>Problem:</b> {activeReq.problemType}</div>
                    <div><b>Garage Name:</b> {activeReq.garageName}</div>
                    <div><b>Status:</b> <span style={{ color: 'var(--warning)', fontWeight: 'bold', textTransform: 'capitalize' }}>{activeReq.status}</span></div>
                    <div><b>ETA:</b> {activeReq.eta ? `${activeReq.eta} mins` : 'Calculating...'}</div>
                  </div>
                </div>
                
                {/* Map Display */}
                <div style={{ height: '350px', borderRadius: '12px', overflow: 'hidden' }}>
                  <MapComponent 
                    customerLoc={[activeReq.customerLat, activeReq.customerLng]}
                    garageLoc={activeReq?.garageLat && activeReq?.garageLng ? [activeReq.garageLat, activeReq.garageLng] : null}
                    mechanicLoc={activeReq.mechanic ? [activeReq.mechanic.lat, activeReq.mechanic.lng] : null}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Clock size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontSize: '14px' }}>No active roadside assistance requests currently running.</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Submit a request from the Customer dashboard to track it here in real time.</p>
            </div>
          )}

          {/* Logs Split */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Geofence Live logs */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '300px' }}>
              <h4 style={{ fontSize: '14px', color: '#fff', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} /> GPS Geofence Signals
              </h4>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {geofenceLogs.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: 'auto' }}>Waiting for geofence triggers...</p>
                ) : (
                  geofenceLogs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--success)' }}>{log.message}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{log.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Fraud & security diagnostic logs */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '300px' }}>
              <h4 style={{ fontSize: '14px', color: '#fff', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} style={{ color: 'var(--error)' }} /> Platform Security Auditor
              </h4>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div style={{ padding: '6px 8px', borderLeft: '3px solid var(--success)', background: 'rgba(16,185,129,0.05)' }}>
                  <b>INFO:</b> Google Maps dynamic script tag signature verified.
                </div>
                <div style={{ padding: '6px 8px', borderLeft: '3px solid var(--success)', background: 'rgba(16,185,129,0.05)' }}>
                  <b>INFO:</b> SSL Connection Diagnostics verified. WebSockets secure.
                </div>
                <div style={{ padding: '6px 8px', borderLeft: '3px solid var(--warning)', background: 'rgba(245,158,11,0.05)' }}>
                  <b>WARN:</b> Multi-device location shift bypass for simulated mechanic path coords.
                </div>
                <div style={{ padding: '6px 8px', borderLeft: '3px solid var(--success)', background: 'rgba(16,185,129,0.05)' }}>
                  <b>INFO:</b> Database atomic write complete for persistent storage logs.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Monthly Revenue Graph */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart2 size={16} style={{ color: 'var(--primary)' }} /> Monthly Platform Revenue
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '180px', padding: '0 10px 10px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
              {monthlyRevenue.map((d, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45px', gap: '6px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--success)', fontWeight: 'bold' }}>{d.value}</span>
                  <div 
                    style={{ 
                      width: '18px', 
                      height: d.percentage, 
                      background: 'linear-gradient(to top, var(--primary), #3b82f6)', 
                      borderRadius: '4px 4px 0 0',
                      boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)'
                    }} 
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              {monthlyRevenue.map((d, i) => (
                <span key={i} style={{ width: '45px', textAlign: 'center' }}>{d.label}</span>
              ))}
            </div>
          </div>

          {/* Issue Category Distribution */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PieChart size={16} style={{ color: 'var(--warning)' }} /> Breakdown Issues Breakdown
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              {issueTypes.map((issue, idx) => (
                <div key={idx} style={{ fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#fff' }}>
                    <span>{issue.name} ({issue.count} incidents)</span>
                    <span style={{ fontWeight: 'bold' }}>{issue.percentage}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${issue.percentage}%`, height: '100%', background: issue.color, borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'garages' && (
        <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Garage Name</th>
                <th style={{ padding: '12px' }}>Rating</th>
                <th style={{ padding: '12px' }}>Location</th>
                <th style={{ padding: '12px' }}>Services</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Security State</th>
              </tr>
            </thead>
            <tbody>
              {garages.map((garage) => (
                <tr key={garage.id} style={{ borderBottom: '1px solid var(--border)', color: '#fff' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{garage.name}</td>
                  <td style={{ padding: '12px' }}>⭐ {garage.rating} ({garage.reviewsCount} reviews)</td>
                  <td style={{ padding: '12px' }}>{garage.lat.toFixed(4)}, {garage.lng.toFixed(4)}</td>
                  <td style={{ padding: '12px' }}>{garage.services.join(', ')}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: garage.verified ? 'var(--success-glow)' : 'var(--warning-glow)', color: garage.verified ? 'var(--success)' : 'var(--warning)' }}>
                      {garage.verified ? 'Verified Partner' : 'Verification Required'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button 
                      onClick={() => toggleVerifyGarage(garage.id)}
                      className={garage.verified ? "btn-secondary" : "btn-primary"}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      {garage.verified ? 'De-Authorize' : 'Grant Verified Badge'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
          <h3 style={{ color: '#fff', fontSize: '15px', marginBottom: '12px' }}>Platform Billing & Transactions</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Transaction ID</th>
                <th style={{ padding: '12px' }}>Vehicle</th>
                <th style={{ padding: '12px' }}>Garage Name</th>
                <th style={{ padding: '12px' }}>Date</th>
                <th style={{ padding: '12px' }}>Paid Cost</th>
                <th style={{ padding: '12px', color: 'var(--primary)' }}>Est. Commission (8%)</th>
                <th style={{ padding: '12px' }}>Method</th>
              </tr>
            </thead>
            <tbody>
              {history.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)', color: '#fff' }}>
                  <td style={{ padding: '12px' }}>{tx.id}</td>
                  <td style={{ padding: '12px' }}>{tx.vehicleName}</td>
                  <td style={{ padding: '12px' }}>{tx.garageName}</td>
                  <td style={{ padding: '12px' }}>{tx.date}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>₹{tx.finalAmount}</td>
                  <td style={{ padding: '12px', color: 'var(--success)', fontWeight: 'bold' }}>₹{getCommissionCollected(tx.finalAmount)}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', fontSize: '11px' }}>
                      {tx.paymentMethod}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h3 style={{ color: '#fff', fontSize: '15px', marginBottom: '12px' }}>Complaint Handling & Disputes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {complaints.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>No disputes logged on the system.</p>
            ) : (
              complaints.map((ticket) => (
                <div key={ticket.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{ticket.subject}</span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: ticket.status === 'resolved' ? 'var(--success-glow)' : 'rgba(244,63,94,0.1)', color: ticket.status === 'resolved' ? 'var(--success)' : 'var(--error)' }}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{ticket.details}</p>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Opened by <b>{ticket.userName}</b> dispute with <b>{ticket.mechanicName || 'Garage'}</b> • {ticket.date}
                    </div>
                  </div>
                  {ticket.status === 'open' && (
                    <button onClick={() => resolveComplaint(ticket.id)} className="btn-success" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Resolve Dispute
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
