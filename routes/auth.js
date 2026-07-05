const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Employee = require('../models/Employee');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { emailOrCode, password } = req.body;
    
    const employee = await Employee.findOne({
      $or: [
        { email: emailOrCode },
        { employeeCode: emailOrCode }
      ],
      role: 'Admin',
      branchCode: process.env.BRANCH_CODE // Only allow admin from this branch to login
    });

    if (!employee) {
      return res.status(401).json({ message: 'Kredensial tidak valid atau akun tidak ditemukan di cabang ini.' });
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Kredensial tidak valid.' });
    }

    // Set session
    req.session.userId = employee._id;
    req.session.employeeCode = employee.employeeCode;
    req.session.role = employee.role;
    req.session.branchCode = employee.branchCode;
    req.session.fullName = employee.fullName;

    res.json({
      message: 'Login sukses',
      user: {
        id: employee._id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        role: employee.role,
        branchCode: employee.branchCode
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout sukses' });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const employee = await Employee.findById(req.session.userId).select('-password');
    res.json({ user: employee });
  } catch(err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
