require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const connectDB = require('./config/db');
const path = require('path');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'rentsync-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // false for local dev (http)
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    branchCode: process.env.BRANCH_CODE,
    branchName: process.env.BRANCH_NAME,
    port: process.env.PORT
  });
});

// Import and mount routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const customerRoutes = require('./routes/customers');
const vehicleRoutes = require('./routes/vehicles');
const transferRoutes = require('./routes/transfers');
const rentalRoutes = require('./routes/rentals');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server [${process.env.BRANCH_CODE} - ${process.env.BRANCH_NAME}] running on port ${PORT}`);
});
