import { Router } from 'express';
import {
  login,
  register,
  getUserByEmpCode,
  updateUserByEmpCode,
  fetchDepartments,
  fetchBusinessUnits,
  getUserAssetsController,
  getAllUsersController,
  getUsersByStatusController,
  getAllStatusesController,
  getAvailableAssetsController,
  getAvailableAssetsController1,
  getAvailableAssetsController2,
  assignAssetController,
  createUserFolder,
  returnAssetsController,
  deleteADUserController,
  forceDeleteUserController,
  getUserNameController,
  getUserInfoController,
  getUserInfoByIdController,
  getUserShareFilesController,
  unregisterAssetsController,
  unregisterAssetsController1,
  getAvailableAssetsController3,
  getActiveEmployeesController,
} from '../controllers/auth.controller';
import { importFiles, upload, openFolder } from '../controllers/file.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/isAdmin.middleware';

const router = Router();

// Đăng nhập / đăng ký
router.post('/login', login);
router.post('/register', register);
router.post('/users/create-folder', authenticateToken, isAdmin, createUserFolder);

// Import file
router.post('/users/:empCode/import', authenticateToken, isAdmin, upload.array('files', 10), importFiles);
router.post('/users/:empCode/upload-files', authenticateToken, isAdmin, upload.array('files', 10), importFiles);
router.get('/users/:empCode/open-folder', (req, res, next) => {
  console.log('Received open-folder request for empCode:', req.params.empCode);
  next();
}, authenticateToken, isAdmin, openFolder);

// Quản lý người dùng (admin-only)
router.get('/users/all', authenticateToken, isAdmin, getAllUsersController);
router.get('/users/status/:status', authenticateToken, isAdmin, getUsersByStatusController);
router.get('/users/statuses', authenticateToken, isAdmin, getAllStatusesController);
router.get('/users/:emp_code/assets', authenticateToken, getUserAssetsController);
router.get('/users/:emp_code', authenticateToken, isAdmin, getUserByEmpCode);
router.get('/users/:emp_code/name', authenticateToken, getUserNameController);
router.get('/users/:emp_code/userInfor', authenticateToken, getUserInfoController);
router.get('/users/:id/info', authenticateToken, getUserInfoByIdController);
router.get('/users/:emp_code/sharefiles', authenticateToken, getUserShareFilesController);
router.put('/users/:emp_code', authenticateToken, isAdmin, updateUserByEmpCode);
router.post('/users/:emp_code/delete-ad-user', authenticateToken, isAdmin, deleteADUserController);
router.delete('/users/:emp_code/force-delete', authenticateToken, isAdmin, forceDeleteUserController);

// Quản lý tài sản của người dùng
router.get('/users/:emp_code/available-assets', authenticateToken, isAdmin, getAvailableAssetsController);
router.get('/users/:emp_code/available-assets1', authenticateToken, isAdmin, getAvailableAssetsController1);
router.get('/users/:emp_code/available-assets2', authenticateToken, isAdmin, getAvailableAssetsController2);
router.get('/users/:emp_code/available-assets3', authenticateToken, isAdmin, getAvailableAssetsController3);

router.post('/users/:emp_code/assign-asset', authenticateToken, isAdmin, assignAssetController);
router.post('/users/:emp_code/return-assets', authenticateToken, isAdmin, returnAssetsController);
router.post('/users/:emp_code/unregister-assets', authenticateToken, isAdmin, unregisterAssetsController);
router.post('/users/:emp_code/unregister-assets1', authenticateToken, isAdmin, unregisterAssetsController1);

// Quản lý tài sản
router.get('/departments', fetchDepartments);
router.get('/business-units', fetchBusinessUnits);
router.get('/employees', authenticateToken, getActiveEmployeesController);

export default router;
