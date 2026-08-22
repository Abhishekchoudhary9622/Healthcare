const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const passwordRules = body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters');

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    passwordRules,
    body('role').optional().isIn(['PATIENT', 'DOCTOR']),
  ],
  validate,
  ctrl.register
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  ctrl.login
);

// Password recovery
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  ctrl.forgotPassword
);

router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').trim().notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  validate,
  ctrl.resetPassword
);

// Phone OTP Authentication
router.post('/send-otp', [body('phone').trim().notEmpty()], validate, ctrl.sendPhoneOtp);
router.post('/verify-otp', [body('phone').trim().notEmpty(), body('otp').trim().notEmpty()], validate, ctrl.verifyPhoneOtp);

// Google OAuth Sign-in
router.post('/google', ctrl.googleAuth);

router.post('/refresh', ctrl.refreshToken);
router.post('/logout', ctrl.logout);

router.get('/me', authenticate, ctrl.me);
router.put('/profile', authenticate, ctrl.updateProfile);
router.put(
  '/change-password',
  authenticate,
  [body('currentPassword').notEmpty(), passwordRules],
  validate,
  ctrl.changePassword
);

module.exports = router;
