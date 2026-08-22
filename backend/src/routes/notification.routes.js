const express = require('express');
const router = express.Router();
const InAppNotification = require('../models/InAppNotification');
const { authenticate } = require('../middleware/auth');

// Seed default welcome notifications if empty
const seedDefaultNotifications = async (userId) => {
  const count = await InAppNotification.countDocuments({ userId });
  if (count === 0) {
    await InAppNotification.insertMany([
      {
        userId,
        title: 'Welcome to HealthSync',
        message: 'Your health dashboard is ready. Explore AI Symptom Analysis and your Electronic Health Records.',
        type: 'SYSTEM',
        read: false,
        link: '/patient/analytics'
      },
      {
        userId,
        title: 'Medication Schedule Active',
        message: 'Paracetamol 500mg scheduled after lunch. Keep track of your daily doses.',
        type: 'MEDICATION',
        read: false,
        link: '/patient'
      },
      {
        userId,
        title: 'AI Risk Engine Available',
        message: 'Try our new ML Health Risk Predictor for cardiovascular and diabetes risk scoring.',
        type: 'RISK_ALERT',
        read: false,
        link: '/patient/ml-prediction'
      }
    ]);
  }
};

// GET /api/notifications - Get current user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    await seedDefaultNotifications(userId);

    const notifications = await InAppNotification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await InAppNotification.countDocuments({ userId, read: false });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/notifications/:id/read - Mark one as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await InAppNotification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await InAppNotification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await InAppNotification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
