const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/doctor.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate, authorize('DOCTOR'));

router.get('/dashboard', ctrl.getDoctorDashboard);
router.get('/appointments', ctrl.getDoctorAppointments);
router.get('/schedule/today', ctrl.getTodaySchedule);
router.get('/leaves', ctrl.getLeaveDays);
router.put('/profile', ctrl.updateDoctorProfile);

router.post(
  '/appointments/:id/post-visit',
  [
    body('clinicalNotes').trim().notEmpty().withMessage('Clinical notes are required'),
    body('prescriptions').optional().isArray(),
  ],
  validate,
  ctrl.submitPostVisitNotes
);

module.exports = router;
