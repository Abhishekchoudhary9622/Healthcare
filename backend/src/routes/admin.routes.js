const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', ctrl.getDashboardStats);

// Doctors
router.get('/doctors', ctrl.getDoctors);
router.get('/doctors/:id', ctrl.getDoctorById);
router.post(
  '/doctors',
  [
    body('email').isEmail().normalizeEmail(),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('specialisation').trim().notEmpty(),
  ],
  validate,
  ctrl.createDoctor
);
router.put('/doctors/:id', ctrl.updateDoctor);
router.delete('/doctors/:id', ctrl.deleteDoctor);

// Leave management
router.post(
  '/doctors/:doctorId/leave',
  [body('date').isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)')],
  validate,
  ctrl.addLeaveDay
);
router.delete('/doctors/:doctorId/leave/:leaveId', ctrl.removeLeaveDay);

// Patients
router.get('/patients', ctrl.getPatients);

// All appointments
router.get('/appointments', ctrl.getAllAppointments);

module.exports = router;
