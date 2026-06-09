import { useState, useEffect, useRef } from 'react';
import { Plus, Trash, Wrench, Award, TrendingUp } from 'lucide-react';
import MapComponent from './MapComponent';
import ChatComponent from './ChatComponent';
import { apiPath } from '../config/api';

export default function MechanicDashboard({ socket, mechanic }) {
  const [activeReq, setActiveReq] = useState(null);
  const [incomingReq, setIncomingReq] = useState(null);
  
  // Simulated navigation tracking states
  const [isNavigating, setIsNavigating] = useState(false);
  const [mechanicPos, setMechanicPos] = useState(null);
  const navIntervalRef = useRef(null);

  // Bill items state
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemCost, setItemCost] = useState('');

  // Chat panel toggle
  const [showChat, setShowChat] = useState(false);

  // Mechanic Subscription State (Silver, Gold, Premium)
  const [currentPlan, setCurrentPlan] = useState('Gold Plan');
  const [purchasingPlan, setPurchasingPlan] = useState(null);

  // Daily statistics
  const [earnings, setEarnings] = useState(1800);

  // Weekly analytics data
  const weeklyData = [
    { day: 'Mon', revenue: 800, height: '40%' },
    { day: 'Tue', revenue: 1500, height: '75%' },
    { day: 'Wed', revenue: 600, height: '30%' },
    { day: 'Thu', revenue: 2000, height: '95%' },
    { day: 'Fri', revenue: 1200, height: '60%' },
    { day: 'Sat', revenue: 1800, height: '85%' }
  ];

  // Calculate commission rate based on plan
  const getCommissionRate = (plan) => {
    if (plan === 'Premium Plan') return 0;
    if (plan === 'Gold Plan') return 0.08; // 8% commission
    return 0.15; // 15% commission (Silver)
  };

  const commissionRate = getCommissionRate(currentPlan);
  const commissionDeducted = Math.round(earnings * commissionRate);
  const netEarnings = earnings - commissionDeducted;

  const fetchActiveRequest = async () => {
    try {
      const res = await fetch(apiPath(`/api/request/active?mechanicId=${mechanic.id}`));
      const data = await res.json();
      
      if (data && data.length > 0) {
        const req = data[0];
        
        if (req.status === 'pending') {
          setIncomingReq(req);
          setActiveReq(null);
        } else if (req.mechanic && req.mechanic.id === mechanic.id) {
          setActiveReq(req);
          setIncomingReq(null);
          setInvoiceItems(req.items || []);
          if (req.mechanic.lat && req.mechanic.lng) {
            setMechanicPos([req.mechanic.lat, req.mechanic.lng]);
          }
        }
      } else {
        setActiveReq(null);
        setIncomingReq(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActiveRequest();

    if (!socket) return;

    socket.emit('join_room', { role: 'mechanic', id: mechanic.id });

    socket.on('new_request_received', (req) => {
      setIncomingReq(req);
    });

    socket.on('payment_confirmed', () => {
      setActiveReq(null);
      setIncomingReq(null);
      setIsNavigating(false);
      setInvoiceItems([]);
      setEarnings(prev => prev + (activeReq ? activeReq.finalAmount : 500));
      fetchActiveRequest();
      alert('Order paid! Transaction logged successfully.');
    });

    socket.on('request_cancelled', () => {
      setActiveReq(null);
      setIncomingReq(null);
      setIsNavigating(false);
      fetchActiveRequest();
      alert('User has cancelled this request.');
    });

    return () => {
      socket.off('new_request_received');
      socket.off('payment_confirmed');
      socket.off('request_cancelled');
      if (navIntervalRef.current) clearInterval(navIntervalRef.current);
    };
  }, [socket, mechanic]);

  const handleAccept = () => {
    if (!incomingReq) return;
    socket.emit('accept_request', {
      requestId: incomingReq.id,
      mechanicId: mechanic.id,
      mechanicName: mechanic.name,
      mechanicPhone: mechanic.phone,
      mechanicAvatar: mechanic.avatar,
      garageName: mechanic.garageName
    });
    
    // Set mock start position (1.5 km away)
    const mLat = incomingReq.customerLat + 0.015;
    const mLng = incomingReq.customerLng - 0.015;
    setMechanicPos([mLat, mLng]);
    
    setActiveReq({
      ...incomingReq,
      status: 'accepted',
      mechanic: {
        id: mechanic.id,
        name: mechanic.name,
        lat: mLat,
        lng: mLng
      }
    });
    setIncomingReq(null);
  };

  const handleReject = () => {
    if (!incomingReq) return;
    socket.emit('reject_request', { requestId: incomingReq.id });
    setIncomingReq(null);
  };

  // Simulates GPS route movement towards Customer
  const startGpsSimulation = () => {
    if (!activeReq || isNavigating) return;

    setIsNavigating(true);
    let step = 0;
    const stepsCount = 10;
    
    const startLat = mechanicPos[0];
    const startLng = mechanicPos[1];
    
    const endLat = activeReq.customerLat;
    const endLng = activeReq.customerLng;

    navIntervalRef.current = setInterval(() => {
      step++;
      
      const currentLat = startLat + ((endLat - startLat) * step) / stepsCount;
      const currentLng = startLng + ((endLng - startLng) * step) / stepsCount;
      const currentEta = Math.max(0, 5 - Math.round((step * 5) / stepsCount));

      setMechanicPos([currentLat, currentLng]);

      socket.emit('update_location', {
        requestId: activeReq.id,
        lat: currentLat,
        lng: currentLng,
        eta: currentEta
      });

      if (step === 9) {
        socket.emit('geofence_trigger', { requestId: activeReq.id, type: 'enter' });
      }

      if (step >= stepsCount) {
        clearInterval(navIntervalRef.current);
        setIsNavigating(false);
        socket.emit('update_status', { requestId: activeReq.id, status: 'arrived' });
        setActiveReq(prev => prev ? { ...prev, status: 'arrived' } : null);
      }
    }, 1500);
  };

  const handleStatusChange = (newStatus) => {
    if (!activeReq) return;
    socket.emit('update_status', { requestId: activeReq.id, status: newStatus });
    setActiveReq(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const addInvoiceItem = () => {
    if (!itemName.trim() || !itemCost) return;
    const newItems = [...invoiceItems, { name: itemName, cost: parseInt(itemCost) }];
    const total = newItems.reduce((sum, item) => sum + item.cost, 0);

    setInvoiceItems(newItems);
    setItemName('');
    setItemCost('');

    socket.emit('update_invoice', {
      requestId: activeReq.id,
      items: newItems,
      total
    });
  };

  const removeInvoiceItem = (idx) => {
    const newItems = invoiceItems.filter((_, i) => i !== idx);
    const total = newItems.reduce((sum, item) => sum + item.cost, 0);

    setInvoiceItems(newItems);
    socket.emit('update_invoice', {
      requestId: activeReq.id,
      items: newItems,
      total
    });
  };

  const confirmSubscriptionBuy = () => {
    setCurrentPlan(purchasingPlan);
    setPurchasingPlan(null);
    alert(`🎉 Premium access activated! Your garage is now registered on the ${purchasingPlan}. Your platform commission is updated.`);
  };

  return (
    <div className="dashboard-grid">
      
      {/* LEFT COLUMN: Controls & Active Request */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Profile Stats & Commission Meter */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={mechanic.avatar} alt="avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{mechanic.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{mechanic.garageName} • {mechanic.phone}</div>
              <div style={{ display: 'inline-block', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', marginTop: '4px' }}>
                {currentPlan} • {(commissionRate * 100)}% Comm.
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '8px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Gross</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>₹{earnings}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '8px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Commission</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--error)' }}>-₹{commissionDeducted}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--success-glow)', padding: '6px', borderRadius: '8px' }}>
              <div style={{ fontSize: '9px', color: 'var(--success)' }}>Net Cash</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--success)' }}>₹{netEarnings}</div>
            </div>
          </div>
        </div>

        {/* Garage Platform Subscription Upgrader */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={15} style={{ color: 'var(--warning)' }} /> Platform Subscription Tiers
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'Silver Plan', cost: '₹499/mo', desc: '15% Commission fee, basic dispatch matching.' },
              { name: 'Gold Plan', cost: '₹999/mo', desc: '8% Commission fee, highlighted search visibility.' },
              { name: 'Premium Plan', cost: '₹1999/mo', desc: '0% Commission, highlighted premium badge, 1-tap SOS routing.' }
            ].map((plan, idx) => (
              <div 
                key={idx} 
                onClick={() => setPurchasingPlan(plan.name)}
                className="glass-card" 
                style={{ 
                  padding: '10px', 
                  cursor: 'pointer', 
                  border: currentPlan === plan.name ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: currentPlan === plan.name ? 'var(--primary-glow)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
                  <span>{plan.name}</span>
                  <span style={{ color: 'var(--success)' }}>{plan.cost}</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>{plan.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Earnings analytics chart widget */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={15} style={{ color: 'var(--primary)' }} /> Weekly Business Reports (₹)
          </h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '120px', padding: '0 8px 8px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
            {weeklyData.map((data, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30px', gap: '4px' }}>
                <span style={{ fontSize: '8px', color: 'var(--success)', fontWeight: 'bold' }}>₹{data.revenue}</span>
                <div 
                  style={{ 
                    width: '12px', 
                    height: data.height, 
                    background: 'linear-gradient(to top, var(--primary), var(--success))', 
                    borderRadius: '4px 4px 0 0',
                    boxShadow: '0 0 6px var(--primary-glow)'
                  }} 
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontSize: '9px', color: 'var(--text-secondary)' }}>
            {weeklyData.map((d, i) => (
              <span key={i} style={{ width: '30px', textAlign: 'center' }}>{d.day}</span>
            ))}
          </div>
        </div>

        {/* Incoming Breakdown Notification request */}
        {incomingReq && (
          <div className="glass-panel" style={{ padding: '20px', border: '2px solid var(--warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>
              <Wrench size={18} /> INCOMING RESCUE REQUEST!
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <div><b>Client:</b> Ratan Chaurasiya</div>
              <div><b>Vehicle Category:</b> <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '12px', color: 'var(--warning)' }}>{incomingReq.vehicleCategory === 'Bike' ? '🏍️ Bike' : incomingReq.vehicleCategory === 'Truck' ? '🚚 Truck' : '🚗 Car'}</span></div>
              <div><b>Vehicle:</b> {incomingReq.vehicleName}</div>
              {incomingReq.vehicleBrand && (
                <>
                  <div><b>Brand:</b> {incomingReq.vehicleBrand} • <b>Type:</b> {incomingReq.vehicleType}</div>
                  <div><b>Model:</b> {incomingReq.vehicleModel} • <b>Reg No:</b> {incomingReq.vehicleNumber}</div>
                </>
              )}
              <div><b>Problem:</b> {incomingReq.problemType}</div>
              <div><b>Description:</b> "{incomingReq.description}"</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleAccept} className="btn-success" style={{ flex: 1, padding: '10px' }}>
                Accept Job
              </button>
              <button onClick={handleReject} className="btn-danger" style={{ padding: '10px' }}>
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Active Job steps and progress updates */}
        {activeReq ? (
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', color: '#fff', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
              Active Repair Job
            </h3>
            
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><b>Client Vehicle:</b> {activeReq.vehicleName} <span style={{ marginLeft: '6px', padding: '1px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '11px', color: 'var(--primary)' }}>{activeReq.vehicleCategory === 'Bike' ? '🏍️ Bike' : activeReq.vehicleCategory === 'Truck' ? '🚚 Truck' : '🚗 Car'}</span></div>
              {activeReq.vehicleBrand && (
                <>
                  <div><b>Brand:</b> {activeReq.vehicleBrand} • <b>Type:</b> {activeReq.vehicleType}</div>
                  <div><b>Model:</b> {activeReq.vehicleModel} • <b>Reg No:</b> {activeReq.vehicleNumber}</div>
                </>
              )}
              <div><b>Issue Reported:</b> {activeReq.problemType}</div>
              {activeReq.description && <div><b>Details:</b> "{activeReq.description}"</div>}
              <div><b>Current status:</b> <span style={{ color: 'var(--warning)', fontWeight: 'bold', textTransform: 'capitalize' }}>{activeReq.status}</span></div>
            </div>

            {/* GPS Nav buttons */}
            {activeReq.status === 'accepted' && (
              <div style={{ marginBottom: '16px' }}>
                <button 
                  onClick={startGpsSimulation} 
                  disabled={isNavigating}
                  className="btn-primary" 
                  style={{ width: '100%', padding: '10px', opacity: isNavigating ? 0.6 : 1 }}
                >
                  {isNavigating ? '🧭 Simulating Live Travel GPS...' : '🚗 Start Travel Navigation'}
                </button>
              </div>
            )}

            {/* Repair flow steps */}
            {['arrived', 'inspecting', 'repairing', 'completed'].includes(activeReq.status) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Update Progress Stage</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button 
                    onClick={() => handleStatusChange('inspecting')} 
                    className={activeReq.status === 'inspecting' ? "btn-success" : "btn-secondary"}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Inspecting Vehicle
                  </button>
                  <button 
                    onClick={() => handleStatusChange('repairing')} 
                    className={activeReq.status === 'repairing' ? "btn-success" : "btn-secondary"}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Repairing
                  </button>
                  <button 
                    onClick={() => handleStatusChange('completed')} 
                    className={activeReq.status === 'completed' ? "btn-success" : "btn-secondary"}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Mark Job Completed
                  </button>
                </div>
              </div>
            )}

            {/* Billing Calculator Editor */}
            {['inspecting', 'repairing', 'completed'].includes(activeReq.status) && (
              <div className="glass-card" style={{ padding: '12px', marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  Invoice Spare Parts & Labor
                </h4>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="Item / Charge" 
                    value={itemName} 
                    onChange={(e) => setItemName(e.target.value)} 
                    style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                  />
                  <input 
                    type="number" 
                    placeholder="Cost (₹)" 
                    value={itemCost} 
                    onChange={(e) => setItemCost(e.target.value)} 
                    style={{ width: '80px', padding: '6px 10px', fontSize: '12px' }}
                  />
                  <button onClick={addInvoiceItem} className="btn-primary" style={{ padding: '6px 10px' }}>
                    <Plus size={16} />
                  </button>
                </div>

                {/* Items list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {invoiceItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#fff', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                      <span>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>₹{item.cost}</span>
                        <button onClick={() => removeInvoiceItem(idx)} style={{ background: 'transparent', color: 'var(--error)' }}>
                          <Trash size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', color: 'var(--primary)' }}>
                    <span>Total Bill:</span>
                    <span>₹{invoiceItems.reduce((sum, i) => sum + i.cost, 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chat toggle */}
            <div style={{ marginTop: '16px' }}>
              <button onClick={() => setShowChat(!showChat)} className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                {showChat ? 'Close Chat Messenger' : 'Open Client Chat Messenger'}
              </button>
            </div>

            {showChat && (
              <div style={{ marginTop: '10px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <ChatComponent 
                  socket={socket} 
                  requestId={activeReq.id}
                  role="mechanic"
                  recipientName="Ratan Chaurasiya"
                  recipientAvatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"
                  onClose={() => setShowChat(false)}
                />
              </div>
            )}
          </div>
        ) : (
          !incomingReq && (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Wrench size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontSize: '13px' }}>Waiting for breakdown assistance requests...</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Once a customer books a service nearby, you will see a request console appear here.</p>
            </div>
          )
        )}
      </div>

      {/* RIGHT COLUMN: Map navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Map Panel */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '400px' }}>
          <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '10px' }}>
            Live Job Navigation Map
          </h3>
          <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden' }}>
            <MapComponent 
              customerLoc={activeReq ? [activeReq.customerLat, activeReq.customerLng] : (incomingReq ? [incomingReq.customerLat, incomingReq.customerLng] : null)}
              garageLoc={
                activeReq?.garageLat && activeReq?.garageLng
                  ? [activeReq.garageLat, activeReq.garageLng]
                  : incomingReq?.garageLat && incomingReq?.garageLng
                    ? [incomingReq.garageLat, incomingReq.garageLng]
                    : null
              }
              mechanicLoc={mechanicPos}
            />
          </div>
        </div>

        {/* Job history */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '12px' }}>Recent Jobs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div className="glass-card" style={{ padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#fff' }}>
                <span>Flat Tyre (Royal Enfield)</span>
                <span style={{ color: 'var(--success)' }}>+₹300</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>Completed today at 09:30 AM</div>
            </div>
            <div className="glass-card" style={{ padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#fff' }}>
                <span>Engine Oil Service (Tata Nexon)</span>
                <span style={{ color: 'var(--success)' }}>+₹900</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>Completed today at 08:15 AM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Checkout Modal */}
      {purchasingPlan && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ padding: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <Award size={48} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Upgrade to {purchasingPlan}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Confirm your subscription upgrade. Exclusive dispatch parameters and lower commission rates apply immediately.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={confirmSubscriptionBuy} className="btn-success" style={{ flex: 1, padding: '10px' }}>
                Confirm Upgrade
              </button>
              <button onClick={() => setPurchasingPlan(null)} className="btn-secondary" style={{ flex: 1, padding: '10px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
