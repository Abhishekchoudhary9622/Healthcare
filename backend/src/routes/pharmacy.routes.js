const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pharmacy.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/nearby', ctrl.getNearbyPharmacies);
router.get('/search', ctrl.searchMedicines);

module.exports = router;
