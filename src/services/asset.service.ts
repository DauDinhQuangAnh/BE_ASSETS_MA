// src/services/asset.service.ts
import { Request, Response } from 'express';
import pool from '../database';
import { Asset, AssetStatus, AssetCategory, AssetHistory, SoftwareUsed, Department, Vendor, BusinessUnit } from '../types/asset';

export const getAllAssets = async (): Promise<Asset[]> => {
  try {
    const result = await pool.query(`
      SELECT a.*, s.status_name, c.category_name, v.vendor_name, d.department_name
      FROM Assets a
      LEFT JOIN Asset_Statuses s ON a.status_id = s.status_id
      LEFT JOIN Asset_Categories c ON a.category_id = c.category_id
      LEFT JOIN Vendors v ON a.vendor_id = v.vendor_id
      LEFT JOIN Departments d ON a.belongs_to_dept_id = d.department_id
      ORDER BY a.asset_id DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('Error in getAllAssets:', error);
    throw error;
  }
};

export const getAssetById = async (id: number): Promise<Asset | null> => {
  try {
    const result = await pool.query(
      `SELECT a.*, s.status_name, c.category_name, v.vendor_name, d.department_name
       FROM Assets a
       LEFT JOIN Asset_Statuses s ON a.status_id = s.status_id
       LEFT JOIN Asset_Categories c ON a.category_id = c.category_id
       LEFT JOIN Vendors v ON a.vendor_id = v.vendor_id
       LEFT JOIN Departments d ON a.belongs_to_dept_id = d.department_id
       WHERE a.asset_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error in getAssetById:', error);
    throw error;
  }
};

export async function createAsset(asset: Partial<Asset>): Promise<Asset> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert vào bảng assets
    const assetResult = await client.query(
      `INSERT INTO Assets (
        asset_code, asset_name, category_id, brand, model, serial_number,
        type, ip_address, mac_address, hub, vcs_lan_no, start_use_date
        , belongs_to_dept_id, vendor_id, location_id,
        purchase_date, purchase_price, warranty_expiry, maintenance_cycle,
        status_id, upgrade_infor, notes, OS, OFFICE, software_used, configuration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
      RETURNING *`,
      [
        asset.asset_code,
        asset.asset_name,
        asset.category_id,
        asset.brand,
        asset.model,
        asset.serial_number,
        asset.type,
        asset.ip_address,
        asset.mac_address,
        asset.hub,
        asset.vcs_lan_no,
        asset.start_use_date || null,
        asset.belongs_to_dept_id,
        asset.vendor_id,
        asset.location_id,
        asset.purchase_date || null,
        asset.purchase_price,
        asset.warranty_expiry || null,
        asset.maintenance_cycle,
        asset.status_id,
        asset.upgrade_infor,
        asset.notes,
        asset.OS,
        asset.OFFICE,
        asset.software_used,
        asset.configuration
      ]
    );

    const newAsset = assetResult.rows[0];

    // Nếu có thông tin cấp phát ban đầu
    if (asset.initial_assignment) {
      await client.query(
        `INSERT INTO Assets_History (
          asset_id, employee_id, handover_by, department_id,
          handover_date, floor, history_status, is_handover, note
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, true, $7)`,
        [
          newAsset.asset_id,
          asset.initial_assignment.employee_id,
          asset.initial_assignment.handover_by,
          asset.initial_assignment.department_id,
          asset.initial_assignment.floor || null,
          asset.initial_assignment.history_status || 'Assigned',
          asset.initial_assignment.note || null
        ]
      );
    }

    await client.query('COMMIT');
    return newAsset;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const updateAsset = async (assetCode: string, data: Partial<Asset>): Promise<Asset> => {
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const sets = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const query = `
      UPDATE Assets 
      SET ${sets}
      WHERE asset_code = $${keys.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, [...values, assetCode]);
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateAsset:', error);
    throw error;
  }
};

export const deleteAsset = async (id: number): Promise<void> => {
  try {
    await pool.query('DELETE FROM Assets WHERE asset_id = $1', [id]);
  } catch (error) {
    console.error('Error in deleteAsset:', error);
    throw error;
  }
};

export const getStatuses = async (): Promise<AssetStatus[]> => {
  try {
    const result = await pool.query('SELECT * FROM Asset_Statuses');
    return result.rows;
  } catch (error) {
    console.error('Error in getStatuses:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<AssetCategory[]> => {
  try {
    const result = await pool.query('SELECT * FROM Asset_Categories');
    return result.rows;
  } catch (error) {
    console.error('Error in getCategories:', error);
    throw error;
  }
};

export const getSoftwareUsed = async (): Promise<SoftwareUsed[]> => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT unnest(software_used) as software_name
      FROM Assets 
      WHERE software_used IS NOT NULL
      ORDER BY software_name
    `);
    return result.rows;
  } catch (error) {
    console.error('Error in getSoftwareUsed:', error);
    throw error;
  }
};

export const getAssetHistory = async (assetId: number): Promise<AssetHistory[]> => {
  try {
    const result = await pool.query(`
      SELECT 
        ah.history_id,
        ah.asset_id,
        ah.employee_id,
        ah.handover_by,
        ah.department_id,
        ah.handover_date,
        ah.returned_date,
        ah.floor,
        ah.history_status,
        ah.is_handover,
        ah.note,
        e.emp_code,
        e.full_name as emp_name,
        e.position,
        e.email,
        d.department_name,
        ah.note as handover_note,
        ah.floor as location_position,
        ah.history_status,
        ah.is_handover,
        a.mac_address,
        a.location_id,
        s.status_name AS asset_status_name  -- ✅ Thêm dòng này
      FROM Assets_History ah
      LEFT JOIN Employees e ON ah.employee_id = e.employee_id
      LEFT JOIN Departments d ON ah.department_id = d.department_id
      LEFT JOIN Assets a ON ah.asset_id = a.asset_id
      LEFT JOIN Asset_Statuses s ON a.status_id = s.status_id
      WHERE ah.asset_id = $1
      ORDER BY ah.handover_date DESC
    `, [assetId]);

    return result.rows;
  } catch (error) {
    console.error('Error in getAssetHistory:', error);
    throw error;
  }
};


export const getAssetByCode = async (assetCode: string): Promise<Asset | null> => {
  try {
    const result = await pool.query(
      `SELECT a.*, s.status_name, c.category_name, v.vendor_name, d.department_name
       FROM Assets a
       LEFT JOIN Asset_Statuses s ON a.status_id = s.status_id
       LEFT JOIN Asset_Categories c ON a.category_id = c.category_id
       LEFT JOIN Vendors v ON a.vendor_id = v.vendor_id
       LEFT JOIN Departments d ON a.belongs_to_dept_id = d.department_id
       WHERE a.asset_code = $1`,
      [assetCode]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in getAssetByCode:', error);
    throw error;
  }
};

export const getDepartments = async (): Promise<Department[]> => {
  try {
    const result = await pool.query(`
      SELECT d.*, bu.name as business_unit_name
      FROM Departments d
      LEFT JOIN Business_Units bu ON d.business_unit_id = bu.business_unit_id
      ORDER BY d.department_name
    `);
    return result.rows;
  } catch (error) {
    console.error('Error in getDepartments:', error);
    throw error;
  }
};

export const getVendors = async (): Promise<Vendor[]> => {
  try {
    const result = await pool.query('SELECT * FROM Vendors ORDER BY vendor_name');
    return result.rows;
  } catch (error) {
    console.error('Error in getVendors:', error);
    throw error;
  }
};

export const getBusinessUnits = async (): Promise<BusinessUnit[]> => {
  try {
    const result = await pool.query('SELECT * FROM Business_Units ORDER BY name');
    return result.rows;
  } catch (error) {
    console.error('Error in getBusinessUnits:', error);
    throw error;
  }
};

export const syncAssetStatus = async (assetCode: string, empCode: string): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lấy employee_id từ emp_code
    const empResult = await client.query(
      'SELECT employee_id FROM Employees WHERE emp_code = $1',
      [empCode]
    );

    if (empResult.rows.length === 0) {
      throw new Error('Không tìm thấy nhân viên');
    }

    const employee_id = empResult.rows[0].employee_id;

    // Kiểm tra trạng thái của thiết bị
    const assetResult = await client.query(
      `SELECT a.asset_id, ast.status_name 
       FROM Assets a
       JOIN Asset_Statuses ast ON a.status_id = ast.status_id
       WHERE a.asset_code = $1`,
      [assetCode]
    );

    if (assetResult.rows.length === 0) {
      throw new Error('Không tìm thấy thiết bị');
    }

    const asset = assetResult.rows[0];

    // Nếu trạng thái là "Chờ xóa"
    if (asset.status_name === 'Chờ xóa') {
      // Cập nhật Assets_History
      await client.query(
        `UPDATE Assets_History 
         SET returned_date = CURRENT_DATE,
             history_status = 'Máy đã trả'
         WHERE asset_id = $1 
         AND employee_id = $2
         AND returned_date IS NULL`,
        [asset.asset_id, employee_id]
      );

      const deletedStatusResult = await client.query(
        'SELECT status_id FROM Asset_Statuses WHERE status_id = $1',
        [6]
      );

      if (deletedStatusResult.rows.length === 0) {
        throw new Error('Không tìm thấy trạng thái "Đã xóa"');
      }

      await client.query(
        'UPDATE Assets SET status_id = $1 WHERE asset_id = $2',
        [deletedStatusResult.rows[0].status_id, asset.asset_id]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Lấy số lượng tài sản theo trạng thái
export const getAssetCounts = async () => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ast.status_name = 'Đang sử dụng' THEN 1 ELSE 0 END) as "Đang sử dụng",
        SUM(CASE WHEN ast.status_name = 'Đang cài đặt' THEN 1 ELSE 0 END) as "Đang cài đặt",
        SUM(CASE WHEN ast.status_name = 'Chờ xóa' THEN 1 ELSE 0 END) as "Chờ xóa"
      FROM Assets a
      LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id`
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error in getAssetCounts:', error);
    throw error;
  }
};

export interface AssetRepairHistory {
  repair_id?: number;
  asset_id: number;
  repair_date: Date;
  repaired_by: string;
  repair_description: string;
  cost?: number;
  next_maintenance_date?: Date;
  notes?: string;
  repair_status?: string;
  created_at?: Date;
  updated_at?: Date;
}

export const createRepairHistory = async (repairData: AssetRepairHistory): Promise<AssetRepairHistory> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Kiểm tra thiết bị có tồn tại không
    const assetCheck = await client.query(
      'SELECT asset_id FROM Assets WHERE asset_id = $1',
      [repairData.asset_id]
    );

    if (assetCheck.rows.length === 0) {
      throw new Error('Không tìm thấy thiết bị');
    }

    // Validate required fields
    if (!repairData.repair_date || !repairData.repaired_by || !repairData.repair_description) {
      throw new Error('Thiếu thông tin bắt buộc: ngày sửa chữa, người sửa chữa hoặc mô tả');
    }

    // Convert date strings to Date objects if needed
    const repairDate = repairData.repair_date instanceof Date ? repairData.repair_date : new Date(repairData.repair_date);
    const nextMaintenanceDate = repairData.next_maintenance_date ?
      (repairData.next_maintenance_date instanceof Date ? repairData.next_maintenance_date : new Date(repairData.next_maintenance_date))
      : null;

    // Thêm bản ghi sửa chữa
    const result = await client.query(
      `INSERT INTO Asset_Repair_History (
        asset_id, repair_date, repaired_by, repair_description,
        cost, next_maintenance_date, notes, repair_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        repairData.asset_id,
        repairDate,
        repairData.repaired_by,
        repairData.repair_description,
        repairData.cost || null,
        nextMaintenanceDate,
        repairData.notes || null,
        repairData.repair_status || 'Pending'
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in createRepairHistory:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getRepairHistory = async (assetId: number): Promise<AssetRepairHistory[]> => {
  try {
    const result = await pool.query(
      `SELECT * FROM Asset_Repair_History 
       WHERE asset_id = $1 
       ORDER BY repair_date DESC`,
      [assetId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error in getRepairHistory:', error);
    throw error;
  }
};

export const updateRepairHistory = async (repairId: number, repairData: Partial<AssetRepairHistory>): Promise<AssetRepairHistory> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const keys = Object.keys(repairData);
    const values = Object.values(repairData);
    const sets = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const query = `
      UPDATE Asset_Repair_History 
      SET ${sets}, updated_at = CURRENT_TIMESTAMP
      WHERE repair_id = $${keys.length + 1}
      RETURNING *;
    `;

    const result = await client.query(query, [...values, repairId]);

    if (result.rows.length === 0) {
      throw new Error('Không tìm thấy bản ghi sửa chữa');
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteRepairHistory = async (repairId: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM Asset_Repair_History WHERE repair_id = $1',
      [repairId]
    );

    if (result.rowCount === 0) {
      throw new Error('Không tìm thấy bản ghi sửa chữa');
    }
  } catch (error) {
    console.error('Error in deleteRepairHistory:', error);
    throw error;
  }
};

export const getAllRepairHistory = async (): Promise<AssetRepairHistory[]> => {
  try {
    const result = await pool.query(
      `SELECT arh.*, a.asset_code, a.asset_name
       FROM Asset_Repair_History arh
       LEFT JOIN Assets a ON arh.asset_id = a.asset_id
       ORDER BY arh.repair_date DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error in getAllRepairHistory:', error);
    throw error;
  }
};

export const searchAssets = async (term: string): Promise<Asset[]> => {
  try {
    const result = await pool.query(
      `SELECT asset_id, asset_code, asset_name
       FROM Assets
       WHERE LOWER(asset_code) LIKE LOWER($1) OR LOWER(asset_name) LIKE LOWER($1)
       ORDER BY asset_code
       LIMIT 10`,
      [`%${term}%`]
    );
    return result.rows;
  } catch (error) {
    console.error('Error in searchAssets:', error);
    throw error;
  }
};

export const assignDeleteAsset = async (empCode: string, data: {
  asset_id: number;
  department_id: number;
  handover_by: number;
  floor: string;
  note?: string;
  is_handover: boolean;
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Kiểm tra nhân viên tồn tại
    const empResult = await client.query(
      'SELECT employee_id FROM Employees WHERE emp_code = $1',
      [empCode]
    );

    if (empResult.rows.length === 0) {
      throw new Error(`Không tìm thấy nhân viên với mã ${empCode}`);
    }

    const employee_id = empResult.rows[0].employee_id;

    // Kiểm tra thiết bị tồn tại và đang ở trạng thái chờ xóa
    const assetResult = await client.query(
      `SELECT a.asset_id, a.status_id, ast.status_name 
       FROM Assets a
       JOIN Asset_Statuses ast ON a.status_id = ast.status_id
       WHERE a.asset_id = $1`,
      [data.asset_id]
    );

    if (assetResult.rows.length === 0) {
      throw new Error('Không tìm thấy thiết bị');
    }

    await client.query(
      `UPDATE Assets 
       SET status_id = 5
       WHERE asset_id = $1`,
      [data.asset_id]
    );
    // Tạo bản ghi trong Assets_History
    await client.query(
      `INSERT INTO Assets_History (
        asset_id, employee_id, handover_by, department_id,
        handover_date, floor, history_status, is_handover, note
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8)`,
      [
        data.asset_id,
        employee_id,
        data.handover_by,
        data.department_id,
        data.floor,
        'Cấp phát chờ xóa',
        data.is_handover,
        data.note || null
      ]
    );

    await client.query('COMMIT');
    return { message: 'Đã cấp phát thiết bị chờ xóa thành công' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
