const mongoose = require('mongoose');
const s = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, token: { type: String, required: true, unique: true }, expiresAt: { type: Date, required: true } }, { timestamps: true });
module.exports = mongoose.model('RefreshToken', s);