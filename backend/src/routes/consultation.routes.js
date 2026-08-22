const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/consultation.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/room/:roomId', ctrl.getRoomDetails);
router.post('/complete', ctrl.completeConsultation);
router.get('/active', ctrl.getActiveConsultation);

module.exports = router;
