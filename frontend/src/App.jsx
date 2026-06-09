import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Activity, Briefcase, Car, Clock, LogOut, Mail, Lock, MapPinned, Phone, Shield, ShieldAlert, User, Wrench } from 'lucide-react';
import CustomerDashboard from './components/CustomerDashboard';
import MechanicDashboard from './components/MechanicDashboard';
import AdminDashboard from './components/AdminDashboard';
import { API_URL, apiPath } from './config/api';
import heroImage from './assets/hero.png';
import './App.css';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Persisted roles and profile session
  const [role, setRole] = useState(localStorage.getItem('auth_role') || null); // active dashboard tab ('customer', 'mechanic', 'admin')
  const [loggedInRole, setLoggedInRole] = useState(localStorage.getItem('auth_logged_in_role') || null); // actual authenticated role
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('auth_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [mechanicProfile, setMechanicProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('auth_mechanic_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Auth Tab & Form states
  const [authTab, setAuthTab] = useState('login'); // 'login', 'signup', 'admin'
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [garages, setGarages] = useState([]);

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('customer');

  // Signup inputs
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState('customer');
  const [signupGarageId, setSignupGarageId] = useState('');

  // Admin credentials
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Emergency warning state
  const [sosAlert, setSosAlert] = useState(null);

  // Initialize Socket Connection
  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setSocketConnected(true);
      console.log('Connected to AutoRescue server');
    });

    newSocket.on('disconnect', () => {
      setSocketConnected(false);
      console.log('Disconnected from AutoRescue server');
    });

    newSocket.on('sos_alert_broadcast', (data) => {
      setSosAlert(data);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch Garages for Mechanic selection
  useEffect(() => {
    fetch(apiPath('/api/garages'))
      .then(res => res.json())
      .then(data => {
        setGarages(data || []);
        if (data && data.length > 0) {
          setSignupGarageId(data[0].id);
        }
      })
      .catch(err => console.error('Error fetching garages:', err));
  }, []);

  // Custom Signup Submit
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch(apiPath('/api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          phone: signupPhone,
          password: signupPassword,
          role: signupRole,
          garageId: signupRole === 'mechanic' ? signupGarageId : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setLoggedInRole(signupRole);
        setRole(signupRole);
        localStorage.setItem('auth_logged_in_role', signupRole);
        localStorage.setItem('auth_role', signupRole);
        
        if (signupRole === 'customer') {
          setUserProfile(data.user);
          localStorage.setItem('auth_user_profile', JSON.stringify(data.user));
        } else if (signupRole === 'mechanic') {
          setMechanicProfile(data.user);
          localStorage.setItem('auth_mechanic_profile', JSON.stringify(data.user));
        }

        // Reset inputs
        setSignupName('');
        setSignupEmail('');
        setSignupPhone('');
        setSignupPassword('');
      } else {
        setAuthError(data.message || 'Signup failed');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Failed to connect to authentication services.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Custom Email Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch(apiPath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          role: loginRole
        })
      });
      const data = await res.json();
      if (data.success) {
        setLoggedInRole(data.role);
        setRole(data.role);
        localStorage.setItem('auth_logged_in_role', data.role);
        localStorage.setItem('auth_role', data.role);
        
        if (data.role === 'customer') {
          setUserProfile(data.user);
          localStorage.setItem('auth_user_profile', JSON.stringify(data.user));
        } else if (data.role === 'mechanic') {
          setMechanicProfile(data.user);
          localStorage.setItem('auth_mechanic_profile', JSON.stringify(data.user));
        }
        
        setLoginEmail('');
        setLoginPassword('');
      } else {
        setAuthError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Failed to connect to authentication services.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Custom Admin Login Submit
  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch(apiPath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
          role: 'admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        setLoggedInRole('admin');
        setRole('admin');
        localStorage.setItem('auth_logged_in_role', 'admin');
        localStorage.setItem('auth_role', 'admin');
        
        setAdminUsername('');
        setAdminPassword('');
      } else {
        setAuthError(data.message || 'Invalid admin credentials');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Failed to connect to authentication services.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Simulated Google Auth
  const handleGoogleLogin = async (selectedRole) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch(apiPath('/api/auth/google-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole })
      });
      const data = await res.json();
      if (data.success) {
        setLoggedInRole(selectedRole);
        setRole(selectedRole);
        localStorage.setItem('auth_logged_in_role', selectedRole);
        localStorage.setItem('auth_role', selectedRole);
        
        if (selectedRole === 'customer') {
          setUserProfile(data.user);
          localStorage.setItem('auth_user_profile', JSON.stringify(data.user));
        } else if (selectedRole === 'mechanic') {
          setMechanicProfile(data.user);
          localStorage.setItem('auth_mechanic_profile', JSON.stringify(data.user));
        }
      } else {
        setAuthError('Google login simulation failed');
      }
    } catch (error) {
      console.error('Error simulating Google Login:', error);
      // Fallback in case backend is offline
      const fallbackUser = selectedRole === 'mechanic' ? {
        id: 'mech-1',
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        phone: '+91 9123456780',
        role: 'mechanic',
        avatar: 'https://images.unsplash.com/photo-1621574539437-4b7cb63120b8?auto=format&fit=crop&q=80&w=120',
        garageName: 'Metro Auto Care'
      } : {
        id: 'user-1',
        name: 'Ratan Chaurasiya',
        email: 'ratan@example.com',
        phone: '+91 9876543210',
        role: 'customer',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
        subscription: 'Gold Plan'
      };
      
      setLoggedInRole(selectedRole);
      setRole(selectedRole);
      localStorage.setItem('auth_logged_in_role', selectedRole);
      localStorage.setItem('auth_role', selectedRole);
      if (selectedRole === 'customer') {
        setUserProfile(fallbackUser);
        localStorage.setItem('auth_user_profile', JSON.stringify(fallbackUser));
      } else if (selectedRole === 'mechanic') {
        setMechanicProfile(fallbackUser);
        localStorage.setItem('auth_mechanic_profile', JSON.stringify(fallbackUser));
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setRole(null);
    setLoggedInRole(null);
    setUserProfile(null);
    setMechanicProfile(null);
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_logged_in_role');
    localStorage.removeItem('auth_user_profile');
    localStorage.removeItem('auth_mechanic_profile');
  };

  return (
    <div className="app-shell">
      
      {/* Top Header navbar */}
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark">
            <span>A</span>
          </div>
          <div>
            <h1>AutoRescue</h1>
            <div className="connection-status">
              {socketConnected ? (
                <>
                  <span className="connection-dot is-online"></span>
                  <span style={{ color: 'var(--success)' }}>WebSocket Connected</span>
                </>
              ) : (
                <>
                  <span className="connection-dot is-offline"></span>
                  <span style={{ color: 'var(--error)' }}>Reconnecting Server...</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Role switcher inside header - restricted to ADMIN only */}
        {role && (
          <div className="app-actions">
            {loggedInRole === 'admin' && (
              <div className="role-switcher">
                {['customer', 'mechanic', 'admin'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      localStorage.setItem('auth_role', r);
                    }}
                    style={{
                      background: role === r ? 'var(--primary)' : 'transparent',
                      color: role === r ? '#fff' : 'var(--text-secondary)',
                      padding: '6px 14px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      fontWeight: role === r ? 'bold' : 'normal'
                    }}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <LogOut size={14} /> Log Out
            </button>
          </div>
        )}
      </header>

      {/* Emergency Global SOS Flash Bar */}
      {sosAlert && (
        <div className="sos-alarm" style={{ padding: '12px 24px', borderBottom: '2px solid var(--error)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={24} style={{ color: 'var(--error)' }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>🚨 CRISIS ALERT: BREAKDOWN SOS ACTIVE</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Customer <b>{sosAlert.userName}</b> reported emergency breakdown on <b>{sosAlert.vehicleName}</b> at coordinates [{sosAlert.lat.toFixed(4)}, {sosAlert.lng.toFixed(4)}].
              </div>
            </div>
          </div>
          <button onClick={() => setSosAlert(null)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.1)' }}>
            Acknowledge SOS
          </button>
        </div>
      )}

      {/* Main Core Area */}
      <main className="app-main">
        {!role ? (
          /* Premium Tabbed Authentication Portal */
          <div className="auth-page">
            <section className="auth-intro animate-slide-up">
              <div className="auth-copy">
                <div className="section-kicker">
                  <Activity size={14} />
                  Live roadside operations
                </div>
                <h2>One control room for customers, mechanics, and admins.</h2>
                <p>
                  Book assistance, track the mechanic, manage billing, handle SOS alerts, and review platform activity from a single real-time workspace.
                </p>
              </div>

              <div className="service-preview">
                <img src={heroImage} alt="AutoRescue roadside assistance" />
                <div className="service-status glass-panel">
                  <div>
                    <span className="status-dot active"></span>
                    Dispatch ready
                  </div>
                  <strong>12 min ETA</strong>
                </div>
              </div>

              <div className="auth-summary-grid">
                <div className="summary-tile">
                  <Car size={18} />
                  <div>
                    <strong>Customers</strong>
                    <span>Request help and pay online</span>
                  </div>
                </div>
                <div className="summary-tile">
                  <Wrench size={18} />
                  <div>
                    <strong>Mechanics</strong>
                    <span>Accept jobs and update repair status</span>
                  </div>
                </div>
                <div className="summary-tile">
                  <MapPinned size={18} />
                  <div>
                    <strong>Admins</strong>
                    <span>Monitor trips, garages, and disputes</span>
                  </div>
                </div>
                <div className="summary-tile">
                  <Clock size={18} />
                  <div>
                    <strong>Realtime</strong>
                    <span>Socket-powered tracking and alerts</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="auth-card glass-panel animate-slide-up">
              
              {/* Header */}
              <div className="auth-card-header">
                <div className="auth-icon">
                  <Shield size={28} style={{ color: 'var(--primary)' }} />
                </div>
                <h2>AutoRescue Portal</h2>
                <p>Choose your workspace and continue.</p>
              </div>

              {/* Navigation Tabs */}
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '3px', borderRadius: '12px', marginBottom: '24px' }}>
                <button
                  onClick={() => { setAuthTab('login'); setAuthError(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    background: authTab === 'login' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: authTab === 'login' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                    color: authTab === 'login' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: authTab === 'login' ? 'bold' : 'normal'
                  }}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setAuthTab('signup'); setAuthError(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    background: authTab === 'signup' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: authTab === 'signup' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                    color: authTab === 'signup' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: authTab === 'signup' ? 'bold' : 'normal'
                  }}
                >
                  Create Account
                </button>
                <button
                  onClick={() => { setAuthTab('admin'); setAuthError(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    background: authTab === 'admin' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: authTab === 'admin' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                    color: authTab === 'admin' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: authTab === 'admin' ? 'bold' : 'normal'
                  }}
                >
                  Admin Center
                </button>
              </div>

              {/* Error Box */}
              {authError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '11px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={14} />
                  <span>{authError}</span>
                </div>
              )}

              {/* Form Renderers */}
              {authTab === 'login' && (
                <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Log In As</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setLoginRole('customer')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          fontSize: '11px',
                          borderRadius: '8px',
                          border: loginRole === 'customer' ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: loginRole === 'customer' ? 'var(--primary-glow)' : 'transparent',
                          color: loginRole === 'customer' ? '#fff' : 'var(--text-secondary)'
                        }}
                      >
                        🚗 Customer
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginRole('mechanic')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          fontSize: '11px',
                          borderRadius: '8px',
                          border: loginRole === 'mechanic' ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: loginRole === 'mechanic' ? 'var(--primary-glow)' : 'transparent',
                          color: loginRole === 'mechanic' ? '#fff' : 'var(--text-secondary)'
                        }}
                      >
                        👨‍🔧 Mechanic
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        style={{ paddingLeft: '34px', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        style={{ paddingLeft: '34px', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '13px', marginTop: '8px', fontWeight: 'bold' }}
                  >
                    {authLoading ? 'Signing In...' : `Sign In as ${loginRole === 'customer' ? 'Customer' : 'Mechanic'}`}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    <span style={{ padding: '0 10px' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGoogleLogin(loginRole)}
                    className="btn-secondary"
                    style={{ width: '100%', padding: '11px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}
                  >
                    <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" style={{ width: '16px', height: '16px' }} />
                    Quick Google Sign-In
                  </button>
                </form>
              )}

              {authTab === 'signup' && (
                <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>I want to join as</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setSignupRole('customer')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          fontSize: '11px',
                          borderRadius: '8px',
                          border: signupRole === 'customer' ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: signupRole === 'customer' ? 'var(--primary-glow)' : 'transparent',
                          color: signupRole === 'customer' ? '#fff' : 'var(--text-secondary)'
                        }}
                      >
                        🚗 Customer
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupRole('mechanic')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          fontSize: '11px',
                          borderRadius: '8px',
                          border: signupRole === 'mechanic' ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: signupRole === 'mechanic' ? 'var(--primary-glow)' : 'transparent',
                          color: signupRole === 'mechanic' ? '#fff' : 'var(--text-secondary)'
                        }}
                      >
                        👨‍🔧 Mechanic
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        style={{ paddingLeft: '34px', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        style={{ paddingLeft: '34px', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Phone Number</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        style={{ paddingLeft: '34px', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="password"
                        required
                        placeholder="Minimum 6 characters"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        style={{ paddingLeft: '34px', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  {signupRole === 'mechanic' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Select Associated Garage</label>
                      <div style={{ position: 'relative' }}>
                        <Briefcase size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <select
                          required
                          value={signupGarageId}
                          onChange={(e) => setSignupGarageId(e.target.value)}
                          style={{ paddingLeft: '34px', fontSize: '12px', width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 10px 10px 34px', color: '#fff', cursor: 'pointer' }}
                        >
                          <option value="" disabled>Choose a garage...</option>
                          {garages && garages.length > 0 ? (
                            garages.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))
                          ) : (
                            <option disabled>Loading garages...</option>
                          )}
                        </select>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '13px', marginTop: '8px', fontWeight: 'bold' }}
                  >
                    {authLoading ? 'Creating Account...' : 'Register & Log In'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    <span style={{ padding: '0 10px' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGoogleLogin(signupRole)}
                    className="btn-secondary"
                    style={{ width: '100%', padding: '11px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}
                  >
                    <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" style={{ width: '16px', height: '16px' }} />
                    Quick Google Register
                  </button>
                </form>
              )}

              {authTab === 'admin' && (
                <form onSubmit={handleAdminLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--primary)', background: 'rgba(99, 102, 241, 0.05)', padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#fff' }}>🔐 Exclusive Password Portal</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Admin accounts must use local database authentication credentials.</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Admin Username</label>
                    <div style={{ position: 'relative' }}>
                      <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        required
                        placeholder="Enter admin username"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        style={{ paddingLeft: '34px', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Admin Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        style={{ paddingLeft: '34px', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '13px', marginTop: '8px', fontWeight: 'bold' }}
                  >
                    {authLoading ? 'Authorizing...' : 'Authorize Admin Session'}
                  </button>
                </form>
              )}

              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '24px' }}>
                🔒 Encrypted validation nodes active. Session cookies are local.
              </div>
            </section>
          </div>
        ) : (
          /* Role Dashboard rendering console */
          <>
            {role === 'customer' && <CustomerDashboard socket={socket} user={userProfile} />}
            {role === 'mechanic' && <MechanicDashboard socket={socket} mechanic={mechanicProfile} />}
            {role === 'admin' && <AdminDashboard socket={socket} />}
          </>
        )}
      </main>

      {/* Footer footer */}
      <footer className="app-footer">
        AutoRescue Platform © 2026 • Pair Programming Workspace Simulation
      </footer>
    </div>
  );
}
