const express = require('express');
const router = express.Router();
const { getAuthUrl, handleCallback } = require('../services/calendar.service');
const { authenticate } = require('../middleware/auth');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Initiate OAuth flow
router.get(
  '/auth',
  authenticate,
  asyncHandler(async (req, res) => {
    const url = getAuthUrl(req.user.id);
    return success(res, { url });
  })
);

// OAuth2 callback
router.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const { code, state: userId } = req.query;
    if (!code || !userId) return error(res, 'Missing code or state', 400);

    await handleCallback(code, userId);
    // Redirect to frontend
    const { FRONTEND_URL } = require('../config');
    res.redirect(`${FRONTEND_URL}/calendar/connected`);
  })
);

module.exports = router;
