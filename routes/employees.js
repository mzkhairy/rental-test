const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const requireAuth = require('../middleware/requireAuth');
const bcrypt = require('bcrypt');

router.get('/', requireAuth, async (req, res) => {
  try {
    const employees = await Employee.find({ branchCode: process.env.BRANCH_CODE }).select('-password');
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { password, role, ...rest } = req.body;
    let employeeData = { ...rest, role, branchCode: process.env.BRANCH_CODE };

    if (role === 'Admin' && password) {
      const salt = await bcrypt.genSalt(10);
      employeeData.password = await bcrypt.hash(password, salt);
    }
    
    if (role === 'Driver') {
      employeeData.homeBranch = process.env.BRANCH_CODE;
      employeeData.currentBranch = process.env.BRANCH_CODE;
    }

    const employee = new Employee(employeeData);
    await employee.save();
    
    const savedEmployee = await Employee.findById(employee._id).select('-password');
    res.status(201).json(savedEmployee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    let updateData = { ...rest };
    
    if (password) {
       const salt = await bcrypt.genSalt(10);
       updateData.password = await bcrypt.hash(password, salt);
    }
    
    const employee = await Employee.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    res.json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
