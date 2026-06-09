import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db.json');

const defaultDb = () => ({
  users: [],
  vehicles: [],
  garages: [],
  activeRequests: [],
  serviceHistory: [],
  promoCodes: [],
  complaints: [],
  geofenceLogs: [],
  notifications: []
});

const normalizeDb = (data = {}) => ({
  ...defaultDb(),
  ...data,
  users: Array.isArray(data.users) ? data.users : [],
  vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
  garages: Array.isArray(data.garages) ? data.garages : [],
  activeRequests: Array.isArray(data.activeRequests) ? data.activeRequests : [],
  serviceHistory: Array.isArray(data.serviceHistory) ? data.serviceHistory : [],
  promoCodes: Array.isArray(data.promoCodes) ? data.promoCodes : [],
  complaints: Array.isArray(data.complaints) ? data.complaints : [],
  geofenceLogs: Array.isArray(data.geofenceLogs) ? data.geofenceLogs : [],
  notifications: Array.isArray(data.notifications) ? data.notifications : []
});

// Helper to read and write database
const getDb = () => {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return normalizeDb(JSON.parse(data));
  } catch (error) {
    console.error('Error reading DB:', error);
    return defaultDb();
  }
};

const saveDb = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving DB:', error);
  }
};

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const apiInfo = {
  name: 'AutoRescue API',
  status: 'running',
  version: '1.0.0',
  endpoints: {
    health: '/api/health',
    garages: '/api/garages',
    auth: {
      signup: '/api/auth/signup',
      login: '/api/auth/login',
      googleLogin: '/api/auth/google-login'
    },
    vehicles: '/api/vehicles',
    profile: '/api/users/profile',
    requests: {
      active: '/api/request/active',
      new: '/api/request/new',
      cancel: '/api/request/cancel'
    },
    complaints: '/api/complaints',
    reports: '/api/admin/reports',
    promoCodes: '/api/promo-codes'
  }
};

app.get('/', (req, res) => {
  res.json({
    message: 'AutoRescue backend is running',
    api: '/api',
    health: '/api/health'
  });
});

app.get('/api', (req, res) => {
  res.json(apiInfo);
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'AutoRescue backend',
    timestamp: new Date().toISOString()
  });
});

// REST API Endpoints
app.get('/api/garages', (req, res) => {
  const db = getDb();
  res.json(db.garages || []);
});

// Authentication Endpoints
app.post('/api/auth/signup', (req, res) => {
  const db = getDb();
  const { name, email, phone, password, role, garageId } = req.body;

  if (!db.users) db.users = [];

  const exists = db.users.some(u => u.email === email);
  if (exists) {
    return res.status(400).json({ success: false, message: 'Email already registered.' });
  }

  const newUser = {
    id: role === 'mechanic' ? `mech-${Date.now()}` : `user-${Date.now()}`,
    name,
    email,
    phone,
    password,
    role,
    avatar: role === 'mechanic' 
      ? 'https://images.unsplash.com/photo-1621574539437-4b7cb63120b8?auto=format&fit=crop&q=80&w=120'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
  };

  if (role === 'mechanic' && garageId) {
    const garage = db.garages.find(g => g.id === garageId);
    if (garage) {
      newUser.garageId = garageId;
      newUser.garageName = garage.name;
      if (!garage.mechanics) garage.mechanics = [];
      garage.mechanics.push({
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        rating: 5.0,
        avatar: newUser.avatar,
        status: 'available'
      });
    }
  }

  db.users.push(newUser);
  saveDb(db);

  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ success: true, user: userWithoutPassword });
});

app.post('/api/auth/login', (req, res) => {
  const db = getDb();
  const { email, password, role, username } = req.body;

  // Admin Login Check
  if (role === 'admin' || username) {
    const checkUsername = username || email;
    if (checkUsername === 'adminratan' && password === 'chaurasiyaratantata') {
      return res.json({
        success: true,
        role: 'admin',
        user: { id: 'admin-1', name: 'Admin Ratan', email: 'admin@autorescue.com', role: 'admin' }
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid Admin credentials.' });
    }
  }

  // Customer/Mechanic Login Check
  if (!db.users) db.users = [];
  const user = db.users.find(u => u.email === email && u.password === password && u.role === role);
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, role: user.role, user: userWithoutPassword });
  } else {
    res.status(400).json({ success: false, message: 'Invalid email, password, or role.' });
  }
});

app.post('/api/auth/google-login', (req, res) => {
  const db = getDb();
  const { role } = req.body;

  if (!db.users) db.users = [];
  let user = db.users.find(u => u.role === role);
  if (!user) {
    if (role === 'mechanic') {
      user = {
        id: 'mech-1',
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        phone: '+91 9123456780',
        role: 'mechanic',
        avatar: 'https://images.unsplash.com/photo-1621574539437-4b7cb63120b8?auto=format&fit=crop&q=80&w=120',
        garageId: 'garage-1',
        garageName: 'Metro Auto Care'
      };
    } else {
      user = {
        id: 'user-1',
        name: 'Ratan Chaurasiya',
        email: 'ratan@example.com',
        phone: '+91 9876543210',
        role: 'customer',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
        subscription: 'Gold Plan'
      };
    }
    db.users.push(user);
    saveDb(db);
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, role, user: userWithoutPassword });
});

app.get('/api/vehicles', (req, res) => {
  const db = getDb();
  const { userId } = req.query;
  if (userId) {
    res.json(db.vehicles.filter(v => v.userId === userId) || []);
  } else {
    res.json(db.vehicles || []);
  }
});

app.post('/api/vehicles', (req, res) => {
  const db = getDb();
  const newVehicle = {
    id: `vehicle-${Date.now()}`,
    userId: req.body.userId || 'user-1',
    name: req.body.name,
    number: req.body.number,
    type: req.body.type,
    model: req.body.model,
    history: []
  };
  db.vehicles.push(newVehicle);
  saveDb(db);
  res.json({ success: true, vehicle: newVehicle });
});

app.get('/api/users/profile', (req, res) => {
  const db = getDb();
  const { userId } = req.query;
  const user = db.users.find(u => u.id === userId);
  res.json(user || db.users[0] || {});
});

app.post('/api/users/profile', (req, res) => {
  const db = getDb();
  const { userId } = req.query;
  db.users = db.users.map(u => u.id === userId ? { ...u, ...req.body } : u);
  saveDb(db);
  const updated = db.users.find(u => u.id === userId);
  res.json({ success: true, user: updated });
});

app.get('/api/request/active', (req, res) => {
  const db = getDb();
  const { userId, mechanicId } = req.query;
  let requests = db.activeRequests || [];

  if (userId) {
    requests = requests.filter(r => r.userId === userId);
  }

  if (mechanicId) {
    requests = requests.filter(r => r.status === 'pending' || r.mechanic?.id === mechanicId);
  }

  res.json(requests);
});

app.post('/api/request/new', (req, res) => {
  const db = getDb();

  const newRequest = {
    id: `req-${Date.now()}`,
    userId: req.body.userId || 'user-1',
    vehicleId: req.body.vehicleId,
    vehicleName: req.body.vehicleName,
    vehicleCategory: req.body.vehicleCategory || 'Car',
    vehicleType: req.body.vehicleType,
    vehicleBrand: req.body.vehicleBrand,
    vehicleModel: req.body.vehicleModel,
    vehicleNumber: req.body.vehicleNumber,
    vehicleColor: req.body.vehicleColor || null,
    fuelType: req.body.fuelType || null,
    manufacturingYear: req.body.manufacturingYear || null,
    problemType: req.body.problemType,
    description: req.body.description,
    image: req.body.image || null,
    customerLat: req.body.lat,
    customerLng: req.body.lng,
    garageId: req.body.garageId,
    garageName: req.body.garageName,
    garageLat: req.body.garageLat || null,
    garageLng: req.body.garageLng || null,
    garageRating: req.body.garageRating || null,
    garageDistance: req.body.garageDistance || null,
    serviceCharge: req.body.serviceCharge || 0,
    baseFare: req.body.baseFare || 0,
    estimatedCost: req.body.estimatedCost || 0,
    eta: req.body.eta || null,
    status: 'pending',
    mechanic: null,
    items: req.body.items || [],
    total: req.body.estimatedCost || 0,
    discount: 0,
    finalAmount: req.body.estimatedCost || 0,
    paymentMethod: null,
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString()
  };

  db.activeRequests.push(newRequest);
  db.notifications.push({
    id: `notif-${Date.now()}`,
    type: 'booking_created',
    requestId: newRequest.id,
    audience: 'admin-mechanics',
    message: `New ${newRequest.vehicleCategory} service request sent to ${newRequest.garageName}.`,
    createdAt: newRequest.createdAt,
    read: false
  });
  saveDb(db);

  // Broadcast new request to Admin and Mechanics
  io.emit('new_request_received', newRequest);

  res.json({ success: true, request: newRequest });
});

app.post('/api/request/cancel', (req, res) => {
  const db = getDb();
  const { requestId, userId } = req.body || {};
  const before = db.activeRequests.length;
  db.activeRequests = db.activeRequests.filter((request) => {
    if (requestId) return request.id !== requestId;
    if (userId) return request.userId !== userId;
    return false;
  });
  saveDb(db);
  io.emit('request_cancelled', { requestId, userId });
  res.json({ success: true, cancelled: before - db.activeRequests.length });
});

app.post('/api/complaints', (req, res) => {
  const db = getDb();
  const newComplaint = {
    id: `ticket-${Date.now()}`,
    ...req.body,
    status: 'open',
    date: new Date().toISOString().split('T')[0]
  };
  if (!db.complaints) db.complaints = [];
  db.complaints.push(newComplaint);
  saveDb(db);
  res.json({ success: true, complaint: newComplaint });
});

app.get('/api/complaints', (req, res) => {
  const db = getDb();
  res.json(db.complaints || []);
});

app.post('/api/admin/complaints/resolve', (req, res) => {
  const db = getDb();
  const { ticketId } = req.body;
  db.complaints = db.complaints.map(ticket => 
    ticket.id === ticketId ? { ...ticket, status: 'resolved' } : ticket
  );
  saveDb(db);
  res.json({ success: true });
});

app.get('/api/admin/reports', (req, res) => {
  const db = getDb();
  const history = db.serviceHistory || [];
  const totalBookings = history.length;
  const totalRevenue = history.reduce((sum, h) => sum + (h.finalAmount || 0), 0);
  const avgRating = history.filter(h => h.rating).reduce((sum, h, _, arr) => sum + h.rating / arr.length, 0);

  res.json({
    totalBookings,
    totalRevenue,
    avgRating: parseFloat(avgRating.toFixed(1)) || 0,
    history
  });
});

app.get('/api/promo-codes', (req, res) => {
  const db = getDb();
  res.json(db.promoCodes || []);
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableApiRoot: '/api',
    health: '/api/health'
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Real-Time Socket Connection
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Register user or mechanic to specific session room
  socket.on('join_room', (data) => {
    const { role, id } = data;
    if (role === 'customer') {
      socket.join(`customer:${id}`);
      console.log(`Joined customer:${id}`);
    } else if (role === 'mechanic') {
      socket.join(`mechanic:${id}`);
      console.log(`Joined mechanic:${id}`);
    } else if (role === 'admin') {
      socket.join('admin');
      console.log('Joined admin room');
    }
  });

  // Mechanic accepts request
  socket.on('accept_request', (data) => {
    const { requestId, mechanicId, mechanicName, mechanicPhone, mechanicAvatar, garageName } = data;
    const db = getDb();
    
    const active = db.activeRequests.find(request => request.id === requestId);
    if (active) {
      active.status = 'accepted';
      active.mechanic = {
        id: mechanicId,
        name: mechanicName,
        phone: mechanicPhone,
        avatar: mechanicAvatar,
        garageName: garageName,
        lat: active.customerLat + 0.015, // Start mechanic some distance away
        lng: active.customerLng - 0.015
      };
      
      saveDb(db);
      
      // Notify customer and admin
      io.to(`customer:${active.userId}`).emit('request_accepted', active);
      io.to('admin').emit('request_status_changed', active);
    }
  });

  // Mechanic rejects request
  socket.on('reject_request', (data) => {
    const { requestId } = data;
    io.to('admin').emit('request_rejected_by_mechanic', { requestId });
  });

  // Mechanic location updates (tracking)
  socket.on('update_location', (data) => {
    const { requestId, lat, lng, eta } = data;
    const db = getDb();

    const active = db.activeRequests.find(request => request.id === requestId);
    if (active) {
      if (active.mechanic) {
        active.mechanic.lat = lat;
        active.mechanic.lng = lng;
        active.eta = eta;
        saveDb(db);

        // Send to Customer and Admin rooms
        io.to(`customer:${active.userId}`).emit('location_updated', { lat, lng, eta });
        io.to('admin').emit('location_updated_admin', { requestId, lat, lng, eta });
      }
    }
  });

  // Geofence trigger
  socket.on('geofence_trigger', (data) => {
    const { requestId, type } = data;
    const db = getDb();
    const active = db.activeRequests.find(request => request.id === requestId);
    if (active) {
      
      // Log event
      if (!db.geofenceLogs) db.geofenceLogs = [];
      const log = {
        id: `geo-${Date.now()}`,
        requestId,
        type,
        time: new Date().toLocaleTimeString(),
        message: `Mechanic ${type === 'enter' ? 'entered' : 'exited'} the 100m client service zone.`
      };
      db.geofenceLogs.push(log);
      saveDb(db);

      // Emit notifications
      io.to(`customer:${active.userId}`).emit('geofence_alert', log);
      io.to('admin').emit('admin_geofence_log', log);
    }
  });

  // Update overall repair status (Inspecting, Repairing, Completed)
  socket.on('update_status', (data) => {
    const { requestId, status } = data;
    const db = getDb();

    const active = db.activeRequests.find(request => request.id === requestId);
    if (active) {
      active.status = status;
      saveDb(db);

      io.to(`customer:${active.userId}`).emit('status_updated', { status });
      io.to('admin').emit('request_status_changed', active);
    }
  });

  // Add bill items / spare parts
  socket.on('update_invoice', (data) => {
    const { requestId, items, total } = data;
    const db = getDb();

    const active = db.activeRequests.find(request => request.id === requestId);
    if (active) {
      active.items = items;
      active.total = total;
      active.finalAmount = total - active.discount;
      saveDb(db);

      io.to(`customer:${active.userId}`).emit('invoice_updated', active);
      io.to('admin').emit('request_status_changed', active);
    }
  });

  // Apply Coupon
  socket.on('apply_coupon', (data) => {
    const { requestId, couponCode } = data;
    const db = getDb();

    const active = db.activeRequests.find(request => request.id === requestId);
    if (active) {
      const coupon = db.promoCodes.find(c => c.code === couponCode);
      if (coupon) {
        active.discount = coupon.discount;
        active.finalAmount = Math.max(0, active.total - coupon.discount);
        saveDb(db);

        io.to(`customer:${active.userId}`).emit('coupon_applied', {
          success: true,
          discount: active.discount,
          finalAmount: active.finalAmount
        });
        io.to('admin').emit('request_status_changed', active);
      } else {
        socket.emit('coupon_applied', { success: false, message: 'Invalid coupon code' });
      }
    }
  });

  // Chat message relay
  socket.on('send_chat', (data) => {
    const { requestId, sender, text } = data;
    const db = getDb();
    const active = db.activeRequests.find(request => request.id === requestId);
    if (active) {
      const targetRoom = sender === 'customer' ? `mechanic:${active.mechanic.id}` : `customer:${active.userId}`;
      
      const chatMsg = {
        sender,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      io.to(targetRoom).emit('chat_received', chatMsg);
      io.to('admin').emit('admin_chat_log', { requestId, message: chatMsg });
    }
  });

  // Emergency SOS trigger
  socket.on('trigger_sos', (data) => {
    const { userId, lat, lng, vehicleName, vehicleCategory } = data;
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    
    const sosAlert = {
      id: `sos-${Date.now()}`,
      userId,
      userName: user?.name || "Customer",
      vehicleName,
      vehicleCategory: vehicleCategory || 'Car',
      lat,
      lng,
      time: new Date().toLocaleTimeString()
    };

    // Broadcast globally to all admins and active mechanics
    io.emit('sos_alert_broadcast', sosAlert);
  });

  // Simulated Payment Complete
  socket.on('complete_payment', (data) => {
    const { requestId, paymentMethod } = data;
    const db = getDb();

    const active = db.activeRequests.find(request => request.id === requestId);
    if (active) {
      active.paymentMethod = paymentMethod;
      active.paymentStatus = 'paid';
      active.status = 'completed';

      // Save to service history
      const historyItem = {
        id: active.id,
        userId: active.userId,
        vehicleName: active.vehicleName,
        vehicleCategory: active.vehicleCategory || null,
        vehicleBrand: active.vehicleBrand || null,
        vehicleModel: active.vehicleModel || null,
        vehicleNumber: active.vehicleNumber || null,
        vehicleColor: active.vehicleColor || null,
        fuelType: active.fuelType || null,
        manufacturingYear: active.manufacturingYear || null,
        problemType: active.problemType,
        garageName: active.garageName,
        garageRating: active.garageRating || null,
        garageDistance: active.garageDistance || null,
        serviceCharge: active.serviceCharge || 0,
        baseFare: active.baseFare || 0,
        mechanicName: active.mechanic ? active.mechanic.name : "N/A",
        date: new Date().toISOString().split('T')[0],
        items: active.items,
        total: active.total,
        discount: active.discount,
        finalAmount: active.finalAmount,
        paymentMethod: active.paymentMethod,
        status: 'completed',
        rating: null,
        review: null
      };

      db.serviceHistory.push(historyItem);
      // Remove completed request from activeRequests
      db.activeRequests = db.activeRequests.filter(request => request.id !== requestId);
      saveDb(db);

      // Notify clients and admin
      io.to(`customer:${active.userId}`).emit('payment_confirmed', historyItem);
      io.emit('payment_logged_admin', historyItem);
    }
  });

  // Submit Feedback/Rating
  socket.on('submit_feedback', (data) => {
    const { historyId, rating, review } = data;
    const db = getDb();
    
    db.serviceHistory = db.serviceHistory.map(h => 
      h.id === historyId ? { ...h, rating, review } : h
    );
    saveDb(db);
    
    io.to('admin').emit('feedback_submitted', { historyId, rating, review });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`AutoRescue server running on port ${PORT}`);
});
