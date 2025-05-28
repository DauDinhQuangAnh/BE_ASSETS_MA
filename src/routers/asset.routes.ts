// src/routers/asset.routes.ts
import express from 'express';
import {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getStatuses,
  getCategories,
  getSoftwareUsed,
  getAssetHistory,
  getDepartments,
  getVendors,
  getLocations,
  getBusinessUnits,
  syncAssetStatus,
  getAssetCountsController,
  createRepairHistory,
  getRepairHistory,
  updateRepairHistory,
  deleteRepairHistory,
  getAllRepairHistory,
  searchAssets,
  assignDeleteAssetController
} from '../controllers/asset.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/isAdmin.middleware';

const router = express.Router();

// Public routes
router.get('/statuses', getStatuses);
router.get('/categories', getCategories);
router.get('/software', getSoftwareUsed);
router.get('/departments', getDepartments);
router.get('/vendors', getVendors);
router.get('/locations', getLocations);
router.get('/business-units', getBusinessUnits);
router.get('/count', getAssetCountsController);
router.get('/search', authenticateToken, searchAssets);

// Repair History routes
router.get('/repair-history', authenticateToken, getAllRepairHistory);
router.post('/:assetCode/repair-history', authenticateToken, isAdmin, createRepairHistory);
router.get('/:assetCode/repair-history', authenticateToken, getRepairHistory);
router.put('/repair-history/:repairId', authenticateToken, isAdmin, updateRepairHistory);
router.delete('/repair-history/:repairId', authenticateToken, isAdmin, deleteRepairHistory);

// Protected routes
router.get('/', authenticateToken, getAllAssets);
router.get('/:id', authenticateToken, getAssetById);
router.get('/:assetId/history', authenticateToken, getAssetHistory);

// Admin routes
router.post('/createNew', authenticateToken, isAdmin, createAsset);
router.put('/:assetCode', authenticateToken, isAdmin, updateAsset);
router.delete('/:id', authenticateToken, isAdmin, deleteAsset);
router.put('/:assetCode/sync-status/:empCode', authenticateToken, isAdmin, syncAssetStatus);
router.post('/users/:empCode/assign-delete-asset', authenticateToken, isAdmin, assignDeleteAssetController);

export default router;
