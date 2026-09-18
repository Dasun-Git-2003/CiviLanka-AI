// backend/modules/member4_operations_audit/routes/budgetRoutes.js
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');

router.get('/summary', budgetController.getBudgetSummary);
router.get('/', budgetController.getAllBudgetLogs);
router.get('/:id', budgetController.getBudgetLogById);
router.post('/', budgetController.createBudgetLog);
router.put('/:id', budgetController.updateBudgetLog);
router.delete('/:id', budgetController.deleteBudgetLog);

module.exports = router;
