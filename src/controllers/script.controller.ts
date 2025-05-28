import { Request, Response } from 'express';
import * as ScriptService from '../services/script.service';
import pool from '../database';

// Asset History Controllers
export const getAssetHistoryList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const history = await ScriptService.getAssetHistoryList(status as string);
    res.json(history);
  } catch (error) {
    console.error('Error in getAssetHistoryList controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách lịch sử thiết bị' });
  }
};

export const getAssetHistoryDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const historyId = parseInt(req.params.historyId);
    if (isNaN(historyId)) {
      res.status(400).json({ message: 'ID lịch sử không hợp lệ' });
      return;
    }

    const history = await ScriptService.getAssetHistoryDetail(historyId);
    if (!history) {
      res.status(404).json({ message: 'Không tìm thấy lịch sử thiết bị' });
      return;
    }

    res.json(history);
  } catch (error) {
    console.error('Error in getAssetHistoryDetail controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy chi tiết lịch sử thiết bị' });
  }
};

// Organization Controllers
export const getBusinessUnits = async (req: Request, res: Response): Promise<void> => {
  try {
    const businessUnits = await ScriptService.getBusinessUnits();
    res.json(businessUnits);
  } catch (error) {
    console.error('Error in getBusinessUnits controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn vị kinh doanh' });
  }
};

export const getDepartmentsByBU = async (req: Request, res: Response): Promise<void> => {
  try {
    const businessUnitId = parseInt(req.params.businessUnitId);
    if (isNaN(businessUnitId)) {
      res.status(400).json({ message: 'ID đơn vị kinh doanh không hợp lệ' });
      return;
    }

    const departments = await ScriptService.getDepartmentsByBU(businessUnitId);
    res.json(departments);
  } catch (error) {
    console.error('Error in getDepartmentsByBU controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách phòng ban' });
  }
};

// AD User Controllers
export const getADUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await ScriptService.getADUsers();
    res.json(users);
  } catch (error) {
    console.error('Error in getADUsers controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách AD Users' });
  }
};

export const getUserSetLogon = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await ScriptService.getUserSetLogon();
    res.json(users);
  } catch (error) {
    console.error('Error in getUserSetLogon controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách người dùng cần set logon' });
  }
};

// Asset Setup Controllers
export const completeSetup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assetCode, empCode, historyId } = req.params;
    const result = await ScriptService.completeAssetSetup(assetCode, empCode, parseInt(historyId));
    res.json(result);
  } catch (error: any) {
    console.error('Error in completeSetup controller:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi hoàn thành cài đặt thiết bị' });
  }
};

export const completeSetupMultiple = async (req: Request, res: Response): Promise<void> => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users)) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
      return;
    }

    const result = await ScriptService.completeMultipleAssetSetup(users);
    res.json(result);
  } catch (error: any) {
    console.error('Error in completeSetupMultiple controller:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi hoàn thành cài đặt thiết bị' });
  }
};

export const updateHandoverStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empCode } = req.params;
    const { asset_ids, history_ids, handover_by, department_id, note } = req.body;

    // Kiểm tra ít nhất một trong hai mảng phải có dữ liệu
    if ((!Array.isArray(asset_ids) || asset_ids.length === 0) &&
      (!Array.isArray(history_ids) || history_ids.length === 0)) {
      res.status(400).json({ message: 'Vui lòng chọn ít nhất một thiết bị' });
      return;
    }

    // Chuyển đổi các id từ string sang number nếu cần
    const assetIds = asset_ids?.map((id: string | number) => typeof id === 'string' ? parseInt(id) : id) || [];
    const historyIds = history_ids?.map((id: string | number) => typeof id === 'string' ? parseInt(id) : id) || [];

    // Kiểm tra nếu có id không hợp lệ
    if (assetIds.some((id: number) => isNaN(id)) || historyIds.some((id: number) => isNaN(id))) {
      res.status(400).json({ message: 'Danh sách thiết bị không hợp lệ' });
      return;
    }

    const result = await ScriptService.updateAssetHandoverStatus(
      empCode,
      assetIds,
      historyIds,
      handover_by,
      department_id,
      note
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error in updateHandoverStatus controller:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi bàn giao thiết bị' });
  }
};

// Lấy danh sách các tầng đã đăng ký cho một thiết bị
export const getRegisteredFloors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assetCode } = req.params;

    if (!assetCode) {
      res.status(400).json({ message: 'Mã thiết bị không được để trống' });
      return;
    }

    const floors = await ScriptService.getRegisteredFloors(assetCode);
    res.json({ floors });
  } catch (error: any) {
    console.error('Error in getRegisteredFloors controller:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi lấy danh sách tầng đã đăng ký' });
  }
};

// Lấy danh sách asset_history đang ở trạng thái chờ xóa
export const getDeleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ScriptService.getDeleteUser();
    res.json(result);
  } catch (error: any) {
    console.error('Error in getDeleteUser:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi lấy danh sách người dùng cần xóa' });
  }
};

export const completeDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ScriptService.completeDeleteUsers();
    res.json(result);
  } catch (error: any) {
    console.error('Error in completeDelete:', error);
    res.status(500).json({
      message: error.message || 'Lỗi khi cập nhật trạng thái người dùng'
    });
  }
};

export const completeDeleteAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ScriptService.completeDeleteAssets();
    res.json(result);
  } catch (error: any) {
    console.error('Error in completeDeleteAssets:', error);
    res.status(500).json({
      message: error.message || 'Lỗi khi cập nhật trạng thái thiết bị'
    });
  }
};

export const getReturnedAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const assets = await ScriptService.getReturnedAssets();
    res.json(assets);
  } catch (error: any) {
    console.error('Error in getReturnedAssets:', error);
    res.status(500).json({
      message: error.message || 'Lỗi khi lấy danh sách thiết bị đã trả lại'
    });
  }
};



