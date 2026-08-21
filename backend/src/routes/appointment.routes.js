const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/appointment.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Public
router.get('/doctors/search', ctrl.searchDoctors);
router.get('/slots', ctrl.getAvailableSlots);

// Authenticated
router.use(authenticate);

// Hold slot (patient only)
router.post(
  '/hold',
  authorize('PATIENT'),
  [
    body('doctorId').notEmpty(),
    body('scheduledAt').isISO8601(),
  ],
  validate,
  ctrl.holdSlot
);

// Book
router.post(
  '/',
  authorize('PATIENT'),
  [
    body('doctorId').notEmpty(),
    body('scheduledAt').isISO8601(),
  ],
  validate,
  ctrl.bookAppointment
);

// Patient appointments
router.get('/mine', authorize('PATIENT'), ctrl.getMyAppointments);

// Single appointment (patient, doctor, admin)
router.get('/:id', ctrl.getAppointmentById);

// Cancel (patient/doctor/admin)
router.patch('/:id/cancel', ctrl.cancelAppointment);

// Reschedule (patient/admin)
router.patch(
  '/:id/reschedule',
  authorize('PATIENT', 'ADMIN'),
  [body('newScheduledAt').isISO8601()],
  validate,
  ctrl.rescheduleAppointment
);

// Submit symptoms (patient)
router.patch(
  '/:id/symptoms',
  authorize('PATIENT'),
  [body('symptoms').trim().notEmpty()],
  validate,
  ctrl.submitSymptoms
);

module.exports = router;
