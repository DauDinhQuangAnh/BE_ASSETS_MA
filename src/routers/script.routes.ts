import express from 'express';
import * as ScriptController from '../controllers/script.controller';

const router = express.Router();

// Asset History Routes
router.get('/history', ScriptController.getAssetHistoryList);
router.get('/history/:historyId', ScriptController.getAssetHistoryDetail);

// Organization Routes
router.get('/business-units', ScriptController.getBusinessUnits);
router.get('/departments/:businessUnitId', ScriptController.getDepartmentsByBU);

// AD User Routes
router.get('/ad-users', ScriptController.getADUsers);
router.get('/set-logon', ScriptController.getUserSetLogon);

// Asset Setup Routes
router.post('/complete-setup/:assetCode/:empCode/:historyId', ScriptController.completeSetup);
router.post('/complete-setup', ScriptController.completeSetupMultiple);
router.post('/users/:empCode/handover-assets', ScriptController.updateHandoverStatus);

// Floor Routes
router.get('/registered-floors/:assetCode', ScriptController.getRegisteredFloors);

// Delete User Routes
router.get('/delete-user', ScriptController.getDeleteUser);
router.post('/complete-delete', ScriptController.completeDelete);
router.post('/complete-delete-assets', ScriptController.completeDeleteAssets);
router.get('/returned-assets', ScriptController.getReturnedAssets);

export default router;
