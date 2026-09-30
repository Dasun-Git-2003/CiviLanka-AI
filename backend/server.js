// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Import route modules for Member 4
const budgetRoutes = require('./modules/member4_operations_audit/routes/budgetRoutes');
const lifecycleRoutes = require('./modules/member4_operations_audit/routes/lifecycleRoutes');
const auditRoutes = require('./modules/member4_operations_audit/routes/auditRoutes');
const notificationService = require('./modules/member4_operations_audit/services/notificationService');
const auditController = require('./modules/member4_operations_audit/controllers/auditController');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload directory setup for field evidence photos
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer storage for photo evidence
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// File Upload endpoint for Field Worker photos
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// Member 4 Module API Endpoints
app.use('/api/budgets', budgetRoutes);
app.use('/api/work-orders', lifecycleRoutes);
app.use('/api/audits', auditRoutes);

// Dedicated AI Agent Endpoint compliant with PDF specification
app.post('/api/agent/safety-audit', auditController.evaluateAgentAudit);

// FCM Push Notifications Inspection Endpoint
app.get('/api/notifications', (req, res) => {
  res.json({
    success: true,
    notifications: notificationService.getRecentNotifications()
  });
});

// ── Mobile App API Endpoints (Citizen Reporting, Auth & City Assets) ─────────

// Hazard Image Upload endpoint for Mobile App
app.post('/api/hazards/upload-image', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ success: true, imageUrl: fileUrl });
});

// Citizen Auth Endpoints
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  res.json({
    userId: 'USR-001',
    fullName: 'Dasun Perera',
    email: email || 'citizen@civilanka.gov.lk',
    role: 'Citizen',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.civilanka-token-2026',
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
  });
});

app.post('/api/auth/register', (req, res) => {
  const { fullName, email } = req.body;
  res.json({
    userId: 'USR-' + Math.floor(100 + Math.random() * 900),
    fullName: fullName || 'New Citizen',
    email: email || 'citizen@civilanka.gov.lk',
    role: 'Citizen',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.civilanka-token-2026',
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
  });
});

// In-Memory Hazard Registry for Citizen Mobile App
const mockHazards = [
  {
    id: 'HAZ-102',
    ticketNumber: 'TKT-2026-0102',
    citizenId: 'USR-001',
    citizenName: 'Dasun Perera',
    category: 'Water Leak',
    description: 'High pressure 200mm main line fracture leaking potable water adjacent to school perimeter.',
    latitude: 6.9082,
    longitude: 79.8524,
    address: "St. Anthony's Lane, Colombo 03",
    imageUrl: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=600&auto=format&fit=crop&q=80',
    status: 'In Progress',
    severity: 'Severe',
    riskLevel: 'High',
    priority: 'URGENT',
    createdAt: '2026-09-18T06:00:00Z',
    updatedAt: '2026-09-18T06:00:00Z',
    isCancelled: false
  },
  {
    id: 'HAZ-105',
    ticketNumber: 'TKT-2026-0105',
    citizenId: 'USR-001',
    citizenName: 'Dasun Perera',
    category: 'Streetlight',
    description: 'Exposed wiring and blown thermal fuse on lighting pole #L-114.',
    latitude: 6.8856,
    longitude: 79.8654,
    address: 'Park Road, Colombo 05',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    status: 'Assigned',
    severity: 'Moderate',
    riskLevel: 'Medium',
    priority: 'MEDIUM',
    createdAt: '2026-09-18T09:00:00Z',
    updatedAt: '2026-09-18T09:15:00Z',
    isCancelled: false
  },
  {
    id: 'HAZ-106',
    ticketNumber: 'TKT-2026-0106',
    citizenId: 'USR-001',
    citizenName: 'Dasun Perera',
    category: 'Pothole',
    description: '35cm deep road cavity damaging vehicle rims and causing sudden swerving.',
    latitude: 6.8812,
    longitude: 79.8643,
    address: 'Havelock Road, Colombo 05',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
    status: 'In Progress',
    severity: 'Critical',
    riskLevel: 'High',
    priority: 'HIGH',
    createdAt: '2026-09-18T07:30:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
    isCancelled: false
  }
];

app.get('/api/hazards/my', (req, res) => {
  res.json(mockHazards);
});

app.get('/api/hazards', (req, res) => {
  res.json(mockHazards);
});

app.get('/api/hazards/:id', (req, res) => {
  const hazard = mockHazards.find(h => h.id === req.params.id) || mockHazards[0];
  res.json(hazard);
});

app.post('/api/hazards', (req, res) => {
  const { category, description, latitude, longitude, imageUrl } = req.body;
  const newHazard = {
    id: 'HAZ-' + Math.floor(200 + Math.random() * 800),
    ticketNumber: 'TKT-2026-' + Math.floor(1000 + Math.random() * 9000),
    citizenId: 'USR-001',
    citizenName: 'Dasun Perera',
    category: category || 'Pothole',
    description: description || 'Reported municipal infrastructure defect',
    latitude: latitude || 6.9271,
    longitude: longitude || 79.8612,
    address: 'Colombo Municipal Area',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
    status: 'Submitted',
    severity: 'Moderate',
    riskLevel: 'Medium',
    priority: 'HIGH',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false
  };
  mockHazards.unshift(newHazard);
  res.status(201).json(newHazard);
});

// Infrastructure Assets Endpoint (Member 2)
app.get('/api/assets', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 401, name: 'Main Water Distribution Trunk #2', category: 'WATER', condition: 'FAIR', road: "St. Anthony's Lane", lat: 6.9082, lng: 79.8524 },
      { id: 402, name: 'A2 Galle Road Arterial Corridor', category: 'ROADWAY', condition: 'CRITICAL', road: 'Galle Road, Kollupitiya', lat: 6.9147, lng: 79.8510 },
      { id: 403, name: 'Duplication Road Stormwater Box Culvert', category: 'DRAINAGE', condition: 'GOOD', road: 'Duplication Road', lat: 6.8920, lng: 79.8567 },
      { id: 404, name: 'Park Road Municipal Streetlight Grid', category: 'ELECTRICAL', condition: 'FAIR', road: 'Park Road, Colombo 05', lat: 6.8856, lng: 79.8654 },
      { id: 407, name: 'New Kelani Bridge Crash Barrier Sections', category: 'BRIDGE', condition: 'GOOD', road: 'New Kelani Bridge Road', lat: 6.9532, lng: 79.8791 }
    ]
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'CivitaGuard AI',
    module: 'Member 4 - Maintenance Operations & Audit',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Start Server
app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`[CivitaGuard AI] Member 4 Backend running on port ${PORT}`);
  console.log(`[API Base] http://localhost:${PORT}/api`);
  console.log(`[Health Check] http://localhost:${PORT}/api/health`);
  console.log('================================================================');
});
