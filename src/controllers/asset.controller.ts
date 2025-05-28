// src/controllers/asset.controller.ts
import { Request, Response } from 'express';
import * as AssetService from '../services/asset.service';
import { Asset, AssetHistory } from '../types/asset';
import pool from '../database';

export const getAllAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const assets = await AssetService.getAllAssets();
    res.json(assets);
  } catch (error) {
    console.error('Error in getAllAssets controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách thiết bị' });
  }
};

export const getAssetById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let asset;

    // Kiểm tra nếu id là số
    if (!isNaN(Number(id))) {
      asset = await AssetService.getAssetById(Number(id));
    } else {
      // Nếu không phải số, coi như là mã thiết bị
      asset = await AssetService.getAssetByCode(id);
    }

    if (!asset) {
      res.status(404).json({ message: 'Không tìm thấy thiết bị' });
      return;
    }

    res.json(asset);
  } catch (error) {
    console.error('Error in getAssetById controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin thiết bị' });
  }
};

export const createAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const assetData: Partial<Asset> = req.body;

    // Validate required fields
    const requiredFields = ['asset_code', 'asset_name', 'category_id', 'status_id'] as const;
    const missingFields = requiredFields.filter(field => !assetData[field as keyof Partial<Asset>]);

    if (missingFields.length > 0) {
      res.status(400).json({
        message: 'Thiếu thông tin bắt buộc',
        missingFields
      });
      return;
    }

    // Create new asset
    const newAsset = await AssetService.createAsset(assetData);
    res.status(201).json(newAsset);
  } catch (error) {
    console.error('Error in createAsset controller:', error);
    res.status(500).json({ message: 'Lỗi khi tạo thiết bị mới' });
  }
};

export const updateAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assetCode } = req.params;
    const assetData: Partial<Asset> = req.body;
    const updatedAsset = await AssetService.updateAsset(assetCode, assetData);

    if (!updatedAsset) {
      res.status(404).json({ message: 'Không tìm thấy thiết bị để cập nhật' });
      return;
    }

    res.json(updatedAsset);
  } catch (error) {
    console.error('Error in updateAsset controller:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật thiết bị' });
  }
};

export const deleteAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID thiết bị không hợp lệ' });
      return;
    }

    await AssetService.deleteAsset(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error in deleteAsset controller:', error);
    res.status(500).json({ message: 'Lỗi khi xóa thiết bị' });
  }
};

export const getStatuses = async (req: Request, res: Response): Promise<void> => {
  try {
    const statuses = await AssetService.getStatuses();
    res.json(statuses);
  } catch (error) {
    console.error('Error in getStatuses controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách trạng thái' });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await AssetService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error in getCategories controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách danh mục' });
  }
};

export const getSoftwareUsed = async (req: Request, res: Response): Promise<void> => {
  try {
    const software = await AssetService.getSoftwareUsed();
    res.json(software);
  } catch (error) {
    console.error('Error in getSoftwareUsed controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách phần mềm' });
  }
};

export const getAssetHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const assetId = parseInt(req.params.assetId);
    if (isNaN(assetId)) {
      res.status(400).json({ message: 'ID thiết bị không hợp lệ' });
      return;
    }

    const history = await AssetService.getAssetHistory(assetId);
    res.json(history);
  } catch (error) {
    console.error('Error in getAssetHistory controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy lịch sử thiết bị' });
  }
};

export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await AssetService.getDepartments();
    res.json(departments);
  } catch (error) {
    console.error('Error in getDepartments controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách phòng ban' });
  }
};

export const getVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendors = await AssetService.getVendors();
    res.json(vendors);
  } catch (error) {
    console.error('Error in getVendors controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách nhà cung cấp' });
  }
};

export const getLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    // Lấy danh sách các location_id duy nhất từ bảng Assets
    const result = await pool.query(
      'SELECT DISTINCT location_id FROM Assets WHERE location_id IS NOT NULL AND location_id != \'\' ORDER BY location_id'
    );

    // Chuyển đổi kết quả thành định dạng phù hợp
    const locations = result.rows.map(row => ({
      location_id: row.location_id,
      location_name: row.location_id // Sử dụng location_id làm location_name
    }));

    res.json(locations);
  } catch (error) {
    console.error('Error in getLocations controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách vị trí' });
  }
};

export const getBusinessUnits = async (req: Request, res: Response): Promise<void> => {
  try {
    const businessUnits = await AssetService.getBusinessUnits();
    res.json(businessUnits);
  } catch (error) {
    console.error('Error in getBusinessUnits controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn vị kinh doanh' });
  }
};

export const handoverAsset = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { asset_id, employee_id, department_id, handover_date, note, position, floor, history_status } = req.body;

    await client.query('BEGIN');

    // Update asset status
    await client.query(
      'UPDATE Assets SET status = $1, employee_id = $2, department_id = $3 WHERE asset_id = $4',
      ['Assigned', employee_id, department_id, asset_id]
    );

    // Create history record
    await client.query(
      `INSERT INTO Assets_History 
       (asset_id, employee_id, department_id, handover_date, note, position, floor, history_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [asset_id, employee_id, department_id, handover_date, note, position, floor, history_status]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Asset handed over successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in handoverAsset:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const syncAssetStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assetCode, empCode } = req.params;

    if (!assetCode || !empCode) {
      res.status(400).json({ message: 'Thiếu thông tin assetCode hoặc empCode' });
      return;
    }

    await AssetService.syncAssetStatus(assetCode, empCode);
    res.json({ message: 'Đã cập nhật trạng thái thành công' });
  } catch (error) {
    console.error('Error in syncAssetStatus controller:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái' });
  }
};

// Lấy số lượng tài sản theo trạng thái
export const getAssetCountsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const counts = await AssetService.getAssetCounts();
    res.json(counts);
  } catch (error) {
    console.error('Error in getAssetCountsController:', error);
    res.status(500).json({ message: 'Lỗi khi lấy số lượng tài sản' });
  }
};

export const createRepairHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assetCode } = req.params;
    const repairData = req.body;

    // Lấy asset_id từ asset_code
    const assetResult = await pool.query(
      'SELECT asset_id FROM Assets WHERE asset_code = $1',
      [assetCode]
    );

    if (assetResult.rows.length === 0) {
      res.status(404).json({ message: 'Không tìm thấy thiết bị' });
      return;
    }

    repairData.asset_id = assetResult.rows[0].asset_id;
    const result = await AssetService.createRepairHistory(repairData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in createRepairHistory controller:', error);
    res.status(500).json({ message: 'Lỗi khi tạo lịch sử sửa chữa' });
  }
};

export const getRepairHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assetCode } = req.params;

    // Lấy asset_id từ asset_code
    const assetResult = await pool.query(
      'SELECT asset_id FROM Assets WHERE asset_code = $1',
      [assetCode]
    );

    if (assetResult.rows.length === 0) {
      res.status(404).json({ message: 'Không tìm thấy thiết bị' });
      return;
    }

    const assetId = assetResult.rows[0].asset_id;
    const history = await AssetService.getRepairHistory(assetId);
    res.json(history);
  } catch (error) {
    console.error('Error in getRepairHistory controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy lịch sử sửa chữa' });
  }
};

export const updateRepairHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { repairId } = req.params;
    const repairData = req.body;

    const result = await AssetService.updateRepairHistory(Number(repairId), repairData);
    res.json(result);
  } catch (error) {
    console.error('Error in updateRepairHistory controller:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật lịch sử sửa chữa' });
  }
};

export const deleteRepairHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { repairId } = req.params;
    await AssetService.deleteRepairHistory(Number(repairId));
    res.status(204).send();
  } catch (error) {
    console.error('Error in deleteRepairHistory controller:', error);
    res.status(500).json({ message: 'Lỗi khi xóa lịch sử sửa chữa' });
  }
};

export const getAllRepairHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const history = await AssetService.getAllRepairHistory();
    res.json(history);
  } catch (error) {
    console.error('Error in getAllRepairHistory controller:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách lịch sử sửa chữa' });
  }
};

export const searchAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { term } = req.query;

    if (!term || typeof term !== 'string') {
      res.status(400).json({ message: 'Thiếu từ khóa tìm kiếm' });
      return;
    }

    const assets = await AssetService.searchAssets(term);
    res.json(assets);
  } catch (error) {
    console.error('Error in searchAssets controller:', error);
    res.status(500).json({ message: 'Lỗi khi tìm kiếm thiết bị' });
  }
};

export const assignDeleteAssetController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empCode } = req.params;
    const data = req.body;

    // Validate required fields
    const requiredFields = ['asset_id', 'department_id', 'handover_by', 'floor', 'is_handover'];
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      res.status(400).json({
        message: 'Thiếu thông tin bắt buộc',
        missingFields
      });
      return;
    }

    const result = await AssetService.assignDeleteAsset(empCode, data);
    res.json(result);
  } catch (error: any) {
    console.error('Error in assignDeleteAssetController:', error);
    res.status(500).json({
      message: error.message || 'Lỗi khi cấp phát thiết bị chờ xóa'
    });
  }
};
