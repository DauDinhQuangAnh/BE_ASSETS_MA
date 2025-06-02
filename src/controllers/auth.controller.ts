import { Request, Response } from 'express';
import {
  loginUser,
  registerUser,
  getUser,
  updateUser,
  getDepartments,
  getBusinessUnits,
  getDepartmentsByBU,
  getUserAssets,
  getAllUsers,
  getUsersByStatus,
  getAllStatuses,
  getAvailableAssets,
  getAvailableAssets1,
  getAvailableAssets2,
  assignAsset,
  createUserStorageFolder,
  returnAssets,
  deleteADUser,
  forceDeleteUser,
  getUserName,
  getUserInfo,
  getUserShareFiles,
  unregisterAssets,
  getAvailableAssets3,
  getActiveEmployees,
} from '../services/auth.service';
import pool from '../database';

/** Đăng nhập người dùng */
export async function login(req: Request, res: Response) {
  try {
    const { emp_code, password } = req.body;
    const token = await loginUser(emp_code, password);
    res.json({ token });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
}

/** Đăng ký người dùng mới */
export async function register(req: Request, res: Response) {
  try {
    const {
      emp_code,
      first_name,
      last_name,
      full_name,
      email,
      business_unit_id,
      department_id,
      position,
      join_date,
      status_work,
      password,
      role,
      status_account,
      note,
    } = req.body;

    const result = await registerUser({
      emp_code,
      first_name,
      last_name,
      full_name,
      email,
      business_unit_id,
      department_id,
      position,
      join_date,
      status_work,
      password,
      role,
      status_account,
      note,
    });

    res.status(201).json({
      message: 'Tạo tài khoản thành công',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

/** Lấy thông tin user theo emp_code */
export async function getUserByEmpCode(req: Request, res: Response) {
  try {
    const user = await getUser(req.params.emp_code);
    res.json(user);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

/** Cập nhật thông tin user theo emp_code */
export async function updateUserByEmpCode(req: Request, res: Response) {
  try {
    const emp_code = req.params.emp_code;
    const result = await updateUser(emp_code, req.body);
    res.json({ message: 'Cập nhật thành công', emp_code: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

/** Lấy danh sách phòng ban */
export async function fetchDepartments(req: Request, res: Response): Promise<void> {
  try {
    const business_unit_id = req.query.business_unit_id;

    if (!business_unit_id) {
      const departments = await getDepartments();
      res.json(departments);
      return;
    }

    const departments = await getDepartmentsByBU(Number(business_unit_id));
    res.json(departments);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách phòng ban' });
  }
}

/** Lấy danh sách đơn vị */
export async function fetchBusinessUnits(req: Request, res: Response): Promise<void> {
  try {
    const businessUnits = await getBusinessUnits();
    res.json(businessUnits);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn vị' });
  }
}

/** Lấy danh sách máy đang sử dụng của user */
export async function getUserAssetsController(req: Request, res: Response) {
  try {
    const emp_code = req.params.emp_code;
    const assets = await getUserAssets(emp_code);
    res.json(assets);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

/** Lấy danh sách toàn bộ người dùng */
export async function getAllUsersController(req: Request, res: Response) {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

/** Lấy danh sách người dùng theo trạng thái */
export async function getUsersByStatusController(req: Request, res: Response) {
  try {
    const { status } = req.params;
    const users = await getUsersByStatus(status);
    res.json(users);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

/** Lấy danh sách tất cả trạng thái */
export async function getAllStatusesController(req: Request, res: Response) {
  try {
    const statuses = await getAllStatuses();
    res.json(statuses);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

/** Lấy danh sách thiết bị có thể cấp phát */
export async function getAvailableAssetsController(req: Request, res: Response) {
  try {
    const assets = await getAvailableAssets();
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function getAvailableAssetsController1(req: Request, res: Response) {
  try {
    const assets = await getAvailableAssets1();
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function getAvailableAssetsController2(req: Request, res: Response) {
  try {
    const { emp_code } = req.params;
    const assets = await getAvailableAssets2(emp_code);
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function getAvailableAssetsController3(req: Request, res: Response) {
  try {
    const assets = await getAvailableAssets3();
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** Cấp phát thiết bị cho người dùng */
export async function assignAssetController(req: Request, res: Response) {
  try {
    const emp_code = req.params.emp_code;
    console.log('Assign asset payload:', JSON.stringify(req.body, null, 2));
    const result = await assignAsset(emp_code, req.body);
    res.json({
      message: 'Cấp phát thiết bị thành công',
      data: result
    });
  } catch (error: any) {
    console.error('Error in assignAssetController:', error);
    res.status(400).json({ message: error.message });
  }
}

/** Tạo folder cho người dùng */
export const createUserFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emp_code } = req.body;

    if (!emp_code) {
      res.status(400).json({ message: 'Vui lòng cung cấp mã nhân viên' });
      return;
    }

    const result = await createUserStorageFolder(emp_code);
    res.json({
      message: 'Tạo folder lưu trữ thành công',
      data: result
    });
  } catch (error: any) {
    console.error('Error in createUserFolder controller:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi tạo folder lưu trữ' });
  }
};

// Cập nhật trạng thái thiết bị thành "chờ xóa" và history_status thành "Đang chờ xóa"
export const returnAssetsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emp_code } = req.params;
    const { asset_ids } = req.body;

    if (!Array.isArray(asset_ids) || asset_ids.length === 0) {
      res.status(400).json({ message: 'Vui lòng chọn ít nhất một thiết bị' });
      return;
    }

    // Chuyển đổi asset_ids từ string sang number nếu cần
    const assetIds = asset_ids.map(id => typeof id === 'string' ? parseInt(id) : id);

    // Kiểm tra nếu có id không hợp lệ
    if (assetIds.some(id => isNaN(id))) {
      res.status(400).json({ message: 'Danh sách thiết bị không hợp lệ' });
      return;
    }

    const result = await returnAssets(emp_code, assetIds);
    res.json(result);
  } catch (error: any) {
    console.error('Error in returnAssetsController:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi cập nhật trạng thái thiết bị' });
  }
};

// Xóa AD User và chuyển trạng thái người dùng sang Resigned
export const deleteADUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emp_code } = req.params;
    const result = await deleteADUser(emp_code);
    res.json(result);
  } catch (error: any) {
    console.error('Error in deleteADUserController:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi xóa AD User' });
  }
};

// Xóa hoàn toàn người dùng (chỉ khi trạng thái là Resigned)
export const forceDeleteUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emp_code } = req.params;
    const result = await forceDeleteUser(emp_code);
    res.json(result);
  } catch (error: any) {
    console.error('Error in forceDeleteUserController:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi xóa người dùng' });
  }
};

// Lấy tên người dùng theo emp_code
export const getUserNameController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emp_code } = req.params;
    const fullName = await getUserName(emp_code);
    res.json({ full_name: fullName });
  } catch (error: any) {
    console.error('Error in getUserNameController:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi lấy tên người dùng' });
  }
};

// Lấy thông tin người dùng theo emp_code
export const getUserInfoController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emp_code } = req.params;
    const userInfo = await getUserInfo(emp_code);
    res.json(userInfo);
  } catch (error: any) {
    console.error('Error in getUserInfoController:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi lấy thông tin người dùng' });
  }
};

// Lấy thông tin người dùng cho chức năng share files
export const getUserShareFilesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emp_code } = req.params;
    const userInfo = await getUserShareFiles(emp_code);
    res.json(userInfo);
  } catch (error: any) {
    console.error('Error in getUserShareFilesController:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi lấy thông tin người dùng' });
  }
};

// Hủy đăng ký thiết bị
export const unregisterAssetsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emp_code } = req.params;
    const { asset_ids } = req.body;

    if (!Array.isArray(asset_ids) || asset_ids.length === 0) {
      res.status(400).json({ message: 'Vui lòng chọn ít nhất một thiết bị' });
      return;
    }

    // Chuyển đổi asset_ids từ string sang number nếu cần
    const assetIds = asset_ids.map(id => typeof id === 'string' ? parseInt(id) : id);

    // Kiểm tra nếu có id không hợp lệ
    if (assetIds.some(id => isNaN(id))) {
      res.status(400).json({ message: 'Danh sách thiết bị không hợp lệ' });
      return;
    }

    const result = await unregisterAssets(emp_code, assetIds);
    res.json(result);
  } catch (error: any) {
    console.error('Error in unregisterAssetsController:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi hủy đăng ký thiết bị' });
  }
};

export const unregisterAssetsController1 = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emp_code } = req.params;
    const { asset_ids } = req.body;

    if (!Array.isArray(asset_ids) || asset_ids.length === 0) {
      res.status(400).json({ message: 'Vui lòng chọn ít nhất một thiết bị' });
      return;
    }

    // Chuyển đổi asset_ids từ string sang number nếu cần
    const assetIds = asset_ids.map(id => typeof id === 'string' ? parseInt(id) : id);

    // Kiểm tra nếu có id không hợp lệ
    if (assetIds.some(id => isNaN(id))) {
      res.status(400).json({ message: 'Danh sách thiết bị không hợp lệ' });
      return;
    }

    const result = await unregisterAssets(emp_code, assetIds);
    res.json(result);
  } catch (error: any) {
    console.error('Error in unregisterAssetsController:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi hủy đăng ký thiết bị' });
  }
};
// Lấy thông tin người dùng theo id
export const getUserInfoByIdController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Lấy emp_code từ employee_id
    const result = await pool.query(
      'SELECT emp_code FROM Employees WHERE employee_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    const emp_code = result.rows[0].emp_code;
    const userInfo = await getUserInfo(emp_code);
    res.json(userInfo);
  } catch (error: any) {
    console.error('Error in getUserInfoByIdController:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi lấy thông tin người dùng' });
  }
};

// Lấy danh sách nhân viên đang làm việc
export const getActiveEmployeesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const employees = await getActiveEmployees();
    res.json(employees);
  } catch (error: any) {
    console.error('Error in getActiveEmployeesController:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi lấy danh sách nhân viên' });
  }
};


