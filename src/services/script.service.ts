import pool from '../database';
import { AssetHistory } from '../types/asset';

// Asset History Services
export const getAssetHistoryList = async (status?: string): Promise<AssetHistory[]> => {
  try {
    let query = `
      SELECT 
        ah.history_id,
        ah.asset_id,
        ah.employee_id,
        ah.handover_by,
        ah.department_id,
        ah.handover_date,
        ah.returned_date,
        COALESCE(ah.floor, '') as floor,
        COALESCE(ah.history_status, '') as history_status,
        ah.is_handover,
        COALESCE(ah.note, '') as note,
        COALESCE(a.asset_code, '') as asset_code,
        COALESCE(a.asset_name, '') as asset_name,
        COALESCE(a.brand, '') as brand,
        COALESCE(a.model, '') as model,
        COALESCE(a.serial_number, '') as serial_number,
        COALESCE(a.mac_address, '') as mac_address,
        COALESCE(a.mac_wifi, '') as mac_wifi,
        COALESCE(a.hub, '') as hub,
        COALESCE(a.vcs_lan_no, '') as vcs_lan_no,
        a.start_use_date,
        a.purchase_date,
        a.purchase_price,
        a.warranty_expiry,
        a.maintenance_cycle,
        COALESCE(a.upgrade_infor, '') as upgrade_infor,
        COALESCE(a.notes, '') as asset_notes,
        COALESCE(e1.emp_code, '') as employee_code,
        COALESCE(e1.full_name, '') as employee_name,
        COALESCE(e1.email, '') as employee_email,
        COALESCE(e1.position, '') as employee_position,
        COALESCE(e1.status_work, '') as employee_status,
        COALESCE(e2.emp_code, '') as handover_by_code,
        COALESCE(e2.full_name, '') as handover_by_name,
        COALESCE(e2.email, '') as handover_by_email,
        COALESCE(e2.position, '') as handover_by_position,
        COALESCE(d.department_name, '') as department_name,
        COALESCE(d.department_code, '') as department_code,
        COALESCE(bu.name, '') as business_unit_name,
        COALESCE(ast.status_name, '') as status_name
      FROM Assets_History ah
      LEFT JOIN Assets a ON ah.asset_id = a.asset_id
      LEFT JOIN Employees e1 ON ah.employee_id = e1.employee_id
      LEFT JOIN Employees e2 ON ah.handover_by = e2.employee_id
      LEFT JOIN Departments d ON ah.department_id = d.department_id
      LEFT JOIN Business_Units bu ON d.business_unit_id = bu.business_unit_id
      LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id
    `;

    if (status) {
      query += ` WHERE ah.history_status = $1`;
    }

    query += ` ORDER BY ah.handover_date DESC`;

    const result = await pool.query(status ? query : query.replace(' WHERE', ''), status ? [status] : []);
    return result.rows;
  } catch (error) {
    console.error('Error in getAssetHistoryList:', error);
    throw error;
  }
};

export const getAssetHistoryDetail = async (historyId: number): Promise<AssetHistory | null> => {
  try {
    const result = await pool.query(`
      SELECT 
        ah.*,
        a.asset_code,
        a.asset_name,
        a.brand,
        a.model,
        a.serial_number,
        a.type,
        a.ip_address,
        a.mac_address,
        a.hub,
        a.vcs_lan_no,
        a.start_use_date,
        a.OS,
        a.OFFICE,
        a.software_used,
        a.configuration,
        a.purchase_date,
        a.purchase_price,
        a.warranty_expiry,
        a.maintenance_cycle,
        a.upgrade_infor,
        a.notes,
        e1.emp_code as employee_code,
        e1.full_name as employee_name,
        e1.email as employee_email,
        e1.position as employee_position,
        e2.emp_code as handover_by_code,
        e2.full_name as handover_by_name,
        e2.email as handover_by_email,
        e2.position as handover_by_position,
        d.department_name,
        d.department_code,
        bu.name as business_unit_name,
        v.vendor_name,
        v.Representative as vendor_representative,
        v.contact_info as vendor_contact,
        v.adress_infor as vendor_address,
        ast.status_name
      FROM Assets_History ah
      LEFT JOIN Assets a ON ah.asset_id = a.asset_id
      LEFT JOIN Employees e1 ON ah.employee_id = e1.employee_id
      LEFT JOIN Employees e2 ON ah.handover_by = e2.employee_id
      LEFT JOIN Departments d ON ah.department_id = d.department_id
      LEFT JOIN Business_Units bu ON d.business_unit_id = bu.business_unit_id
      LEFT JOIN Vendors v ON a.vendor_id = v.vendor_id
      LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id
      WHERE ah.history_id = $1
    `, [historyId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error in getAssetHistoryDetail:', error);
    throw error;
  }
};

// Organization Services
export const getBusinessUnits = async () => {
  try {
    const result = await pool.query(`
      SELECT 
        business_unit_id,
        name
      FROM Business_Units
      ORDER BY name
    `);
    return result.rows;
  } catch (error) {
    console.error('Error in getBusinessUnits:', error);
    throw error;
  }
};

export const getDepartmentsByBU = async (businessUnitId: number) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.department_id,
        d.department_code,
        d.department_name,
        d.business_unit_id,
        bu.name as business_unit_name
      FROM Departments d
      LEFT JOIN Business_Units bu ON d.business_unit_id = bu.business_unit_id
      WHERE d.business_unit_id = $1
      ORDER BY d.department_name
    `, [businessUnitId]);
    return result.rows;
  } catch (error) {
    console.error('Error in getDepartmentsByBU:', error);
    throw error;
  }
};

// AD‑User Services
export const getADUsers = async () => {
  try {
    const query = `
      /* Lấy 1 bản ghi mới nhất cho mỗi nhân viên */
      SELECT DISTINCT ON (e.emp_code)
        e.first_name,
        e.last_name,
        e.full_name,
        e.emp_code,
        e.email,
        e.position,                         
        d.department_name      AS department,
        bu.name                AS business_unit,
        ah.note                AS description,
        a.asset_code,
        a.mac_address,
        a.mac_wifi,
        a.ip_address,                       
        ac.category_name,                  
        e.position             AS jobtitle, 
        ah.is_handover,
        ah.is_borrowed,
        ah.borrow_start_date,
        ah.borrow_due_date,
        ah.history_id,
        ah.floor
      FROM Assets_History ah
      JOIN Employees       e  ON e.employee_id  = ah.employee_id
      JOIN Assets          a  ON a.asset_id     = ah.asset_id
      LEFT JOIN Asset_Categories ac ON a.category_id = ac.category_id
      LEFT JOIN Departments d ON d.department_id = ah.department_id
      LEFT JOIN Business_Units bu ON bu.business_unit_id = d.business_unit_id
      /* 1) Đang chờ đăng ký AD */
      WHERE ah.is_handover   = TRUE
        AND ah.history_status = 'Đã đăng ký'
      /* 2) Không còn máy nào ở trạng thái Đang sử dụng */
        AND NOT EXISTS (
              SELECT 1
              FROM Assets_History ah2
              WHERE ah2.employee_id   = ah.employee_id
                AND ah2.is_handover   = TRUE
                AND ah2.history_status = 'Đang sử dụng'
                AND ah2.returned_date IS NULL   -- vẫn đang dùng
           )
      /* Ưu tiên bản ghi mới nhất của mỗi nhân viên */
      ORDER BY e.emp_code,
               ah.handover_date DESC;      -- hoặc history_id DESC
    `;

    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error in getADUsers:', error);
    throw error;
  }
};

// AD‑User Services
export const getUserSetLogon = async () => {
  try {
    const query = `
      /* Lấy 1 bản ghi mới nhất cho mỗi nhân viên */
      SELECT DISTINCT ON (e.emp_code)
        e.first_name,
        e.last_name,
        e.full_name,
        e.emp_code,
        e.email,
        e.position,
        d.department_name      AS department,
        bu.name                AS business_unit,
        ah.note                AS description,
        a.asset_code,
        a.mac_address,
        a.ip_address,          -- Thêm trường ip_address
        e.position             AS jobtitle, 
        ah.floor,
        ah.is_handover,
        ah.history_id
      FROM Assets_History ah
      JOIN Employees       e  ON e.employee_id  = ah.employee_id
      JOIN Assets          a  ON a.asset_id     = ah.asset_id
      LEFT JOIN Departments d ON d.department_id = ah.department_id
      LEFT JOIN Business_Units bu
           ON bu.business_unit_id = d.business_unit_id
      /* 1) Đang chờ đăng ký AD */
      WHERE (
        (ah.history_status = 'Đã đăng ký'
        AND EXISTS (
              SELECT 1
              FROM Assets_History ah2
              WHERE ah2.employee_id   = ah.employee_id
                AND ah2.is_handover   = TRUE
                AND ah2.history_status = 'Đang sử dụng'
           ))
        OR
        (ah.history_status = 'Cấp phát chờ xóa'
        AND a.status_id = (
          SELECT status_id 
          FROM Asset_Statuses 
          WHERE status_name = 'Đang cài đặt'
        ))
        OR
        (ah.history_status = 'Đã đăng ký'
        AND a.status_id = (
          SELECT status_id 
          FROM Asset_Statuses 
          WHERE status_name = 'Đang cài đặt'
        )
        AND ah.is_handover = FALSE)
      )
      /* Ưu tiên bản ghi mới nhất của mỗi nhân viên */
      ORDER BY e.emp_code,
               ah.handover_date DESC;      -- hoặc history_id DESC
    `;

    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error in getADUsers:', error);
    throw error;
  }
};


// Asset Setup Services
const updateAssetStatus = async (client: any, assetCode: string, empCode: string, historyId: number) => {
  // Kiểm tra nhân viên tồn tại
  const empResult = await client.query(
    'SELECT employee_id FROM Employees WHERE emp_code = $1',
    [empCode]
  );

  if (empResult.rows.length === 0) {
    throw new Error(`Không tìm thấy nhân viên với mã ${empCode}`);
  }

  const employee_id = empResult.rows[0].employee_id;

  // Kiểm tra thiết bị tồn tại và đang ở trạng thái cài đặt
  const assetResult = await client.query(
    `SELECT a.asset_id, a.status_id, ast.status_name 
     FROM Assets a
     JOIN Asset_Statuses ast ON a.status_id = ast.status_id
     WHERE a.asset_code = $1`,
    [assetCode]
  );

  if (assetResult.rows.length === 0) {
    throw new Error(`Không tìm thấy thiết bị với mã ${assetCode}`);
  }

  const asset = assetResult.rows[0];

  // Kiểm tra trạng thái "Đang cài đặt" (status_id = 4)
  if (asset.status_id !== 5) {
    throw new Error(`Thiết bị ${assetCode} không ở trạng thái Đang cài đặt (hiện tại: ${asset.status_name})`);
  }

  // Cập nhật trạng thái asset thành "Đang sử dụng"
  const inUseStatusResult = await client.query(
    'SELECT status_id FROM Asset_Statuses WHERE status_name = $1',
    ['Chưa bàn giao']
  );

  if (inUseStatusResult.rows.length === 0) {
    throw new Error('Không tìm thấy trạng thái "Đang sử dụng"');
  }

  await client.query(
    'UPDATE Assets SET status_id = $1 WHERE asset_id = $2',
    [inUseStatusResult.rows[0].status_id, asset.asset_id]
  );

  // Cập nhật Assets_History
  await client.query(
    `UPDATE Assets_History 
     SET history_status = 'Chờ bàn giao'
     WHERE history_id = $1`,
    [historyId]
  );

  return { asset_id: asset.asset_id, employee_id };
};

export const completeAssetSetup = async (assetCode: string, empCode: string, historyId: number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await updateAssetStatus(client, assetCode, empCode, historyId);
    await client.query('COMMIT');
    return { message: 'Đã hoàn thành cài đặt thiết bị' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const completeMultipleAssetSetup = async (users: Array<{ emp_code: string, asset_code: string, history_id: number }>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const user of users) {
      await updateAssetStatus(client, user.asset_code, user.emp_code, user.history_id);
    }

    await client.query('COMMIT');
    return { message: 'Đã hoàn thành cài đặt thiết bị' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateAssetHandoverStatus = async (
  empCode: string,
  assetIds: number[],
  historyIds: number[],
  handoverBy: number,
  departmentId: number,
  note: string
) => {
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

    // Lấy danh sách thiết bị được chọn của nhân viên
    const assetsResult = await client.query(
      `SELECT ah.history_id, ah.asset_id, a.asset_code, a.status_id, ast.status_name
       FROM Assets_History ah
       JOIN Assets a ON ah.asset_id = a.asset_id
       JOIN Asset_Statuses ast ON a.status_id = ast.status_id
       WHERE ah.employee_id = $1 
       AND ah.history_status = 'Chờ bàn giao'
       AND ah.returned_date IS NULL
       AND (
         ah.history_id = ANY($2)
         OR ah.asset_id = ANY($3)
       )`,
      [employee_id, historyIds, assetIds]
    );

    if (assetsResult.rows.length === 0) {
      throw new Error(`Không tìm thấy thiết bị nào hợp lệ để bàn giao cho nhân viên ${empCode}`);
    }

    // Lấy status_id của trạng thái "Đang sử dụng"
    const inUseStatusResult = await client.query(
      'SELECT status_id FROM Asset_Statuses WHERE status_name = $1',
      ['Đang sử dụng']
    );

    if (inUseStatusResult.rows.length === 0) {
      throw new Error('Không tìm thấy trạng thái "Đang sử dụng"');
    }

    const inUseStatusId = inUseStatusResult.rows[0].status_id;

    // Cập nhật trạng thái cho từng thiết bị
    for (const asset of assetsResult.rows) {
      // Cập nhật trạng thái asset
      await client.query(
        'UPDATE Assets SET status_id = $1 WHERE asset_id = $2',
        [inUseStatusId, asset.asset_id]
      );

      // Cập nhật trạng thái lịch sử
      await client.query(
        `UPDATE Assets_History 
         SET history_status = 'Đang sử dụng',
             handover_by = $1,
             department_id = $2,
             note = $3
         WHERE history_id = $4`,
        [handoverBy, departmentId, note, asset.history_id]
      );
    }

    await client.query('COMMIT');
    return {
      message: 'Đã bàn giao thiết bị thành công',
      updatedAssets: assetsResult.rows.map(row => row.asset_code)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Lấy danh sách các tầng đã đăng ký cho một thiết bị
export const getRegisteredFloors = async (assetCode: string): Promise<string[]> => {
  try {
    // Kiểm tra thiết bị tồn tại
    const assetResult = await pool.query(
      'SELECT asset_id FROM Assets WHERE asset_code = $1',
      [assetCode]
    );

    if (assetResult.rows.length === 0) {
      throw new Error(`Không tìm thấy thiết bị với mã ${assetCode}`);
    }

    const asset_id = assetResult.rows[0].asset_id;

    // Lấy danh sách các tầng đã đăng ký cho thiết bị
    const result = await pool.query(
      `SELECT DISTINCT ah.floor
       FROM Assets_History ah
       WHERE ah.asset_id = $1
       AND ah.floor IS NOT NULL
       AND ah.floor != ''
       AND ah.is_handover = TRUE
       AND ah.history_status = 'Đang sử dụng'
       AND ah.returned_date IS NULL
       ORDER BY ah.floor`,
      [asset_id]
    );

    return result.rows.map(row => row.floor);
  } catch (error) {
    console.error('Error in getRegisteredFloors:', error);
    throw error;
  }
};

// Lấy danh sách asset_history đang ở trạng thái chờ xóa
export const getDeleteUser = async () => {
  try {
    const query = `
      SELECT DISTINCT ON (e.emp_code)
        e.first_name,
        e.last_name,
        e.full_name,
        e.emp_code,
        e.email,
        e.position,
        d.department_name AS department,
        bu.name AS business_unit,
        ah.note AS description,
        a.asset_code,
        a.mac_address,
        ah.floor,
        ah.handover_date,
        ah.history_status,
        a.status_id,
        ast.status_name
      FROM Assets_History ah
      JOIN Employees e ON e.employee_id = ah.employee_id
      JOIN Assets a ON a.asset_id = ah.asset_id
      LEFT JOIN Departments d ON d.department_id = ah.department_id
      LEFT JOIN Business_Units bu ON bu.business_unit_id = d.business_unit_id
      LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id
      WHERE ah.history_status = 'Đang chờ xóa'
        AND a.status_id = (
          SELECT status_id 
          FROM Asset_Statuses 
          WHERE status_name = 'Chờ xóa'
        )
        AND ah.returned_date IS NULL
      ORDER BY e.emp_code, ah.handover_date DESC
    `;

    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error in getDeleteUser:', error);
    throw error;
  }
};

export const getReturnedAssets = async () => {
  try {
    const query = `
      SELECT DISTINCT ON (a.asset_code)
        a.asset_code,
        a.asset_name,
        a.brand,
        a.model,
        a.serial_number,
        a.mac_address,
        a.mac_wifi,
        a.type,
        a.ip_address,
        a.hub,
        a.vcs_lan_no,
        a.start_use_date,
        a.OS,
        a.OFFICE,
        a.software_used,
        a.configuration,
        a.purchase_date,
        a.purchase_price,
        a.warranty_expiry,
        a.maintenance_cycle,
        a.upgrade_infor,
        a.notes,
        e.emp_code,
        e.full_name,
        e.email as last_employee_email,
        d.department_name as last_department,
        bu.name as business_unit_name,
        ah.handover_date,
        ah.returned_date,
        ah.floor,
        ah.note as history_note,
        ah.is_borrowed,
        ah.borrow_start_date,
        ah.borrow_due_date,
        ast.status_name,
        ac.category_name
      FROM Assets a
      JOIN Assets_History ah ON a.asset_id = ah.asset_id
      JOIN Employees e ON ah.employee_id = e.employee_id
      LEFT JOIN Departments d ON ah.department_id = d.department_id
      LEFT JOIN Business_Units bu ON d.business_unit_id = bu.business_unit_id
      LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id
      LEFT JOIN Asset_Categories ac ON a.category_id = ac.category_id
      WHERE a.status_id = (
        SELECT status_id 
        FROM Asset_Statuses 
        WHERE status_name = 'Chờ xóa'
      )
      AND ah.history_status = 'Đã trả lại'
    `;

    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error in getReturnedAssets:', error);
    throw error;
  }
};

export const completeDeleteUsers = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE Employees 
       SET status_work = 'Deleted'
       WHERE status_work = 'Resigned'`
    );

    await client.query('COMMIT');

    return {
      message: `Đã cập nhật trạng thái thành công cho ${result.rowCount} người dùng`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const completeDeleteAssets = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lấy status_id của trạng thái "New"
    const newStatusResult = await client.query(
      'SELECT status_id FROM Asset_Statuses WHERE status_name = $1',
      ['New']
    );

    if (newStatusResult.rows.length === 0) {
      throw new Error('Không tìm thấy trạng thái \"New\"');
    }

    const newStatusId = newStatusResult.rows[0].status_id;

    // Lấy danh sách thiết bị cần cập nhật
    const assetsToUpdate = await client.query(
      `SELECT a.asset_id
       FROM Assets a
       JOIN Assets_History ah ON a.asset_id = ah.asset_id
       WHERE a.status_id = (
         SELECT status_id 
         FROM Asset_Statuses 
         WHERE status_name = 'Chờ xóa'
       )
       AND ah.history_status = 'Đã trả lại'
       AND ah.returned_date IS NULL`
    );

    if (assetsToUpdate.rows.length === 0) {
      return {
        message: 'Không có thiết bị nào đáp ứng điều kiện cập nhật'
      };
    }

    const assetIds = assetsToUpdate.rows.map(row => row.asset_id);

    // Cập nhật trạng thái của các thiết bị
    const result = await client.query(
      `UPDATE Assets 
       SET status_id = $1
       WHERE asset_id = ANY($2)`,
      [newStatusId, assetIds]
    );

    // Cập nhật lịch sử thiết bị
    await client.query(
      `UPDATE Assets_History ah
       SET history_status = 'Đã xóa',
           returned_date = CURRENT_DATE
       WHERE ah.asset_id = ANY($1)
       AND ah.history_status = 'Đã trả lại'
       AND ah.returned_date IS NULL`,
      [assetIds]
    );

    await client.query('COMMIT');

    return {
      message: `Đã cập nhật trạng thái thành công cho ${result.rowCount} thiết bị`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};


