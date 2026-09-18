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
