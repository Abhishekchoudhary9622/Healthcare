const mongoose = require('mongoose');

const inAppNotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['APPOINTMENT', 'MEDICATION', 'RISK_ALERT', 'TELEMEDICINE', 'EHR', 'SYSTEM'],
    default: 'SYSTEM'
  },
  read: { type: Boolean, default: false },
  link: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('InAppNotification', inAppNotificationSchema);
