import pool from '../database';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load biến môi trường
dotenv.config();

export async function loginUser(emp_code: string, password: string): Promise<string> {
  const query = `
    SELECT employee_id, emp_code, password, role, status_account, full_name, last_name
    FROM employees 
    WHERE emp_code = $1
  `;
  const result = await pool.query(query, [emp_code]);
  if (result.rows.length === 0) throw new Error('Tài khoản không tồn tại');

  const user = result.rows[0];
  if (user.status_account !== 'active') throw new Error('Tài khoản chưa được kích hoạt');

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) throw new Error('Sai mật khẩu');

  const payload = {
    employee_id: user.employee_id,
    emp_code: user.emp_code,
    role: user.role,
    full_name: user.full_name,
    last_name: user.last_name

  };

  const jwtSecret = process.env.JWT_SECRET || 'defaultsecret';
  const signOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any,
  };

  return jwt.sign(payload, jwtSecret, signOptions);
}

export async function registerUser(data: {
  emp_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  business_unit_id: number | string;
  department_id: number | string;
  position: string;
  join_date: string;
  status_work?: string;
  password: string;
  role?: string;
  status_account?: string;
  note?: string;
}) {
  console.log('Data client gửi:', JSON.stringify(data, null, 2));

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
    status_work = 'active',
    password,
    role = 'user',
    status_account = 'active',
    note = '',
  } = data;

  const businessUnitNumber = Number(business_unit_id);
  const departmentNumber = Number(department_id);

  if (isNaN(businessUnitNumber)) {
    throw new Error('business_unit_id phải là số');
  }

  if (isNaN(departmentNumber)) {
    throw new Error('department_id phải là số');
  }

  const check = await pool.query('SELECT emp_code FROM employees WHERE emp_code = $1', [emp_code]);
  if (check.rows.length > 0) throw new Error('Tài khoản đã tồn tại');

  // Xử lý email trùng lặp
  let finalEmail = email;
  let counter = 1;
  let baseEmail = email;
  let emailExists = true;

  while (emailExists) {
    // Kiểm tra email hiện tại có tồn tại không
    const emailCheck = await pool.query('SELECT email FROM employees WHERE email = $1', [finalEmail]);

    if (emailCheck.rows.length === 0) {
      // Email không tồn tại, có thể sử dụng
      emailExists = false;
    } else {
      // Email đã tồn tại, thêm số tăng dần
      if (counter === 1) {
        // Lần đầu tiên trùng, tách email thành phần trước @ và sau @
        const [localPart, domain] = email.split('@');
        baseEmail = `${localPart}${counter}@${domain}`;
      } else {
        // Các lần sau, tăng số
        const [localPart, domain] = baseEmail.split('@');
        const numericPart = localPart.match(/\d+$/)?.[0] || '';
        const basePart = localPart.slice(0, -numericPart.length);
        finalEmail = `${basePart}${parseInt(numericPart) + 1}@${domain}`;
      }
      counter++;
    }
  }
  // Hàm chuẩn hóa tên (bỏ dấu và chuyển về chữ in hoa)
  const normalizeName = (name: string): string => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
      .toUpperCase() // Chuyển về chữ in hoa
      .replace(/[^A-Z0-9\s]/g, '') // Chỉ giữ lại chữ cái, số và khoảng trắng
      .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
      .trim(); // Xóa khoảng trắng đầu cuối
  };

  // Xử lý tên trùng lặp
  let finalFirstName = first_name;
  let finalLastName = last_name;
  let nameExists = true;

  while (nameExists) {
    // Chuẩn hóa tên hiện tại
    const normalizedFirstName = normalizeName(finalFirstName);
    const normalizedLastName = normalizeName(finalLastName);

    // Kiểm tra tên hiện tại có tồn tại không (bất kể phòng ban)
    const nameCheck = await pool.query(
      `SELECT first_name, last_name FROM employees 
       WHERE UPPER(REGEXP_REPLACE(REGEXP_REPLACE(first_name, '[^A-Z0-9\\s]', '', 'g'), '[áàạảãâấầậẩẫăắằặẳẵéèẹẻẽêếềệểễíìịỉĩóòọỏõôốồộổỗơớờợởỡúùụủũưứừựửữýỳỵỷỹđ]', '', 'g')) = $1
       AND UPPER(REGEXP_REPLACE(REGEXP_REPLACE(last_name, '[^A-Z0-9\\s]', '', 'g'), '[áàạảãâấầậẩẫăắằặẳẵéèẹẻẽêếềệểễíìịỉĩóòọỏõôốồộổỗơớờợởỡúùụủũưứừựửữýỳỵỷỹđ]', '', 'g')) = $2`,
      [normalizedFirstName, normalizedLastName]
    );

    if (nameCheck.rows.length === 0) {
      // Tên không trùng, có thể sử dụng
      nameExists = false;
    } else {
      // Tên đã trùng, thêm department_id
      // Lấy tên phòng ban từ department_id
      const departmentResult = await pool.query(
        'SELECT department_name FROM departments WHERE department_id = $1',
        [departmentNumber]
      );

      if (departmentResult.rows.length > 0) {
        const departmentName = departmentResult.rows[0].department_name;
        finalFirstName = `${first_name}_${departmentName}`;
        finalLastName = `${last_name}_${departmentName}`;
      } else {
        // Nếu không tìm thấy tên phòng ban, sử dụng department_id
        finalFirstName = `${first_name}_${departmentNumber}`;
        finalLastName = `${last_name}_${departmentNumber}`;
      }
    }
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const insertQuery = `
    INSERT INTO employees (
      emp_code, first_name, last_name, full_name, email,
      password, role, status_account, department_id, business_unit_id,
      position, join_date, status_work, note
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING employee_id, emp_code, role, status_account
  `;

  const values = [
    emp_code,
    first_name,
    last_name,
    full_name,
    finalEmail,
    hashedPassword,
    role,
    status_account,
    departmentNumber,
    businessUnitNumber,
    position,
    join_date,
    status_work,
    note,
  ];

  try {
    const result = await pool.query(insertQuery, values);
    return result.rows[0];
  } catch (error) {
    console.error('Lỗi khi insert:', error);
    throw error;
  }
}

export async function getUser(emp_code: string) {
  const result = await pool.query(
    `
    SELECT 
      e.employee_id,
      e.emp_code,
      e.first_name,
      e.last_name,
      e.full_name,
      e.email,
      e.role,
      e.status_account,
      e.business_unit_id,
      bu.name AS business_unit_name,
      e.department_id,
      d.department_name,
      e.position,
      e.join_date,
      e.leave_date,
      e.status_work,
      e.note
    FROM employees e
    LEFT JOIN business_units bu ON e.business_unit_id = bu.business_unit_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    WHERE e.emp_code = $1
    `,
    [emp_code]
  );

  if (result.rows.length === 0) {
    const error: any = new Error('Không tìm thấy người dùng');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

export async function updateUser(emp_code: string, data: any) {
  const {
    first_name,
    last_name,
    full_name,
    email,
    business_unit_id,
    department_id,
    position,
    join_date,
    role,
    status_account,
    leave_date,
    status_work,
    note
  } = data;

  const businessUnitNumber = Number(business_unit_id);
  const departmentNumber = Number(department_id);

  if (isNaN(businessUnitNumber)) {
    throw new Error('business_unit_id phải là số');
  }

  if (isNaN(departmentNumber)) {
    throw new Error('department_id phải là số');
  }

  const result = await pool.query(
    `UPDATE employees SET
      first_name = $1,
      last_name = $2,
      full_name = $3,
      email = $4,
      business_unit_id = $5,
      department_id = $6,
      position = $7,
      join_date = $8,
      role = $9,
      status_account = $10,
      leave_date = $11,
      status_work = $12,
      note = $13
    WHERE emp_code = $14
    RETURNING emp_code`,
    [
      first_name,
      last_name,
      full_name,
      email,
      businessUnitNumber,
      departmentNumber,
      position,
      join_date,
      role,
      status_account,
      leave_date,
      status_work,
      note,
      emp_code
    ]
  );

  if (result.rowCount === 0) {
    const error: any = new Error('Không tìm thấy người dùng để cập nhật');
    error.status = 404;
    throw error;
  }

  return result.rows[0].emp_code;
}

export async function getDepartments() {
  const result = await pool.query('SELECT department_id, department_name FROM departments ORDER BY department_name');
  return result.rows;
}

export async function getBusinessUnits() {
  const result = await pool.query('SELECT business_unit_id, name FROM business_units ORDER BY name');
  return result.rows;
}

export async function getDepartmentsByBU(business_unit_id: number) {
  const result = await pool.query(
    `SELECT department_id, department_name 
     FROM departments 
     WHERE business_unit_id = $1 
     ORDER BY department_name`,
    [business_unit_id]
  );
  return result.rows;
}

export async function getUserAssets(emp_code: string) {
  // Kiểm tra user có tồn tại không
  const userCheck = await pool.query(
    'SELECT employee_id FROM Employees WHERE emp_code = $1',
    [emp_code]
  );

  if (userCheck.rows.length === 0) {
    const error: any = new Error('Không tìm thấy người dùng');
    error.status = 404;
    throw error;
  }

  const employee_id = userCheck.rows[0].employee_id;

  // Lấy thông tin các máy đang được sử dụng bởi user
  const result = await pool.query(
    `
    SELECT 
      a.*,
      ac.category_name,
      d.department_name,
      v.vendor_name,
      ast.status_name,
      ah.handover_date,
      ah.returned_date,
      ah.floor,
      ah.history_status,
      ah.note AS history_note,
      ah.is_handover
      
    FROM Assets a
    LEFT JOIN Asset_Categories ac ON a.category_id = ac.category_id
    LEFT JOIN Departments d ON a.belongs_to_dept_id = d.department_id
    LEFT JOIN Vendors v ON a.vendor_id = v.vendor_id
    LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id
    LEFT JOIN Assets_History ah ON a.asset_id = ah.asset_id
    WHERE ah.employee_id = $1 
    AND (ah.returned_date IS NULL OR ah.returned_date > CURRENT_DATE)
    ORDER BY ah.handover_date DESC
    `,
    [employee_id]
  );

  return result.rows;
}

// --- Thêm hàm lấy toàn bộ người dùng ---
export async function getAllUsers() {
  const result = await pool.query(
    `
    SELECT 
      e.employee_id,
      e.emp_code,
      e.first_name,
      e.last_name,
      e.full_name,
      e.email,
      e.role,
      e.status_account,
      e.business_unit_id,
      bu.name AS business_unit_name,
      e.department_id,
      d.department_name,
      e.position,
      e.join_date,
      e.leave_date,
      e.status_work,
      e.note
    FROM employees e
    LEFT JOIN business_units bu ON e.business_unit_id = bu.business_unit_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    ORDER BY e.emp_code ASC
    `
  );
  return result.rows;
}

// --- Thêm hàm lấy người dùng theo trạng thái ---
export async function getUsersByStatus(status: string) {
  const result = await pool.query(
    `
    SELECT 
      e.employee_id,
      e.emp_code,
      e.first_name,
      e.last_name,
      e.full_name,
      e.email,
      e.role,
      e.status_account,
      e.business_unit_id,
      bu.name AS business_unit_name,
      e.department_id,
      d.department_name,
      e.position,
      e.join_date,
      e.leave_date,
      e.status_work,
      e.note
    FROM employees e
    LEFT JOIN business_units bu ON e.business_unit_id = bu.business_unit_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    WHERE e.status_work = $1
    ORDER BY e.emp_code ASC
    `,
    [status]
  );
  return result.rows;
}

// --- Thêm hàm lấy danh sách trạng thái ---
export async function getAllStatuses() {
  const result = await pool.query(
    `SELECT DISTINCT status_work FROM employees WHERE status_work IS NOT NULL ORDER BY status_work`
  );
  return result.rows.map(row => row.status_work);
}


export async function getAvailableAssets() {
  const result = await pool.query(
    `SELECT 
      a.asset_id,
      a.asset_code,
      a.asset_name,
      ac.category_name,
      a.brand,
      a.model,
      a.serial_number,
      a.type,
      ast.status_name,
      a.configuration,
      a.OS,
      a.OFFICE,
      array_to_string(a.ip_address, ', ') as ip_address
    FROM Assets a
    LEFT JOIN Asset_Categories ac ON a.category_id = ac.category_id
    LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id
    WHERE ast.status_name = 'New'
    ORDER BY a.asset_code`
  );
  return result.rows;
}

export async function getAvailableAssets1() {
  const result = await pool.query(
    `SELECT 
      a.asset_id,
      a.asset_code,
      a.asset_name,
      ac.category_name,
      a.brand,
      a.model,
      a.serial_number,
      a.type,
      ast.status_name,
      a.configuration,
      a.OS,
      a.OFFICE,
      array_to_string(a.ip_address, ', ') as ip_address
    FROM Assets a
    LEFT JOIN Asset_Categories ac ON a.category_id = ac.category_id
    LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id
    WHERE ast.status_name = 'Chờ xóa'
    ORDER BY a.asset_code`
  );
  return result.rows;
}
export async function getAvailableAssets2(emp_code: string) {
  // Lấy employee_id từ emp_code
  const empResult = await pool.query(
    'SELECT employee_id FROM Employees WHERE emp_code = $1',
    [emp_code]
  );

  if (empResult.rows.length === 0) {
    throw new Error('Không tìm thấy nhân viên');
  }

  const employee_id = empResult.rows[0].employee_id;

  const result = await pool.query(
    `SELECT 
      a.asset_id,
      a.asset_code,
      a.asset_name,
      ac.category_name,
      a.brand,
      a.model,
      a.serial_number,
      a.type,
      ast.status_name,
      a.configuration,
      a.OS,
      a.OFFICE,
      array_to_string(a.ip_address, ', ') as ip_address
    FROM Assets a
    LEFT JOIN Asset_Categories ac ON a.category_id = ac.category_id
    LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id
    WHERE ast.status_name = 'Đang sử dụng'
    AND NOT EXISTS (
      SELECT 1 
      FROM assets_history ah 
      WHERE ah.asset_id = a.asset_id 
      AND ah.history_status = 'Đang sử dụng'
      AND ah.employee_id = $1
    )
    ORDER BY a.asset_code`,
    [employee_id]
  );
  return result.rows;
}

export async function getAvailableAssets3() {
  const result = await pool.query(
    `SELECT 
      a.asset_id,
      a.asset_code,
      a.asset_name,
      ac.category_name,
      a.brand,
      a.model,
      a.serial_number,
      a.type,
      ast.status_name,
      a.configuration,
      a.OS,
      a.OFFICE,
      array_to_string(a.ip_address, ', ') as ip_address
    FROM Assets a
    LEFT JOIN Asset_Categories ac ON a.category_id = ac.category_id
    LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id
    WHERE a.status_id = 7
    ORDER BY a.asset_code`
  );
  return result.rows;
}

export async function assignAsset(emp_code: string, data: {
  asset_id: string | number;
  handover_by: number;
  department_id: number;
  floor?: string;
  history_status?: string;
  note?: string;
  is_handover?: boolean;
  ip_address?: string[];
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lấy employee_id từ emp_code
    const empResult = await client.query(
      'SELECT employee_id FROM Employees WHERE emp_code = $1',
      [emp_code]
    );

    if (empResult.rows.length === 0) {
      throw new Error('Không tìm thấy người dùng');
    }

    const employee_id = empResult.rows[0].employee_id;

    // Chuyển đổi asset_id thành number nếu là string
    const assetId = typeof data.asset_id === 'string' ? parseInt(data.asset_id) : data.asset_id;

    // Kiểm tra trạng thái asset
    const assetResult = await client.query(
      `SELECT a.asset_id, ast.status_name 
       FROM Assets a
       JOIN Asset_Statuses ast ON a.status_id = ast.status_id
       WHERE a.asset_id = $1`,
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      throw new Error('Không tìm thấy thiết bị');
    }

    if (assetResult.rows[0].status_name !== 'New' && assetResult.rows[0].status_name !== 'Chờ xóa' && assetResult.rows[0].status_name !== 'Đang sử dụng') {
      throw new Error('Thiết bị không khả dụng để cấp phát');
    }

    // Tạo bản ghi trong Assets_History
    await client.query(
      `INSERT INTO Assets_History (
        asset_id, employee_id, handover_by, department_id,
        handover_date, floor, history_status, is_handover, note
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8)`,
      [
        assetId,
        employee_id,
        data.handover_by,
        data.department_id,
        data.floor,
        data.history_status || 'Đã đăng ký',
        data.is_handover,
        data.note || null
      ]
    );

    // Cập nhật trạng thái asset thành "In Use" và ip_address nếu có
    const inUseStatusResult = await client.query(
      'SELECT status_id FROM Asset_Statuses WHERE status_name = $1',
      ['Đang cài đặt']
    );

    if (inUseStatusResult.rows.length === 0) {
      throw new Error('Không tìm thấy trạng thái "Đang cài đặt"');
    }

    // Cập nhật trạng thái và ip_address
    if (data.ip_address && data.ip_address.length > 0) {
      // Chuyển đổi mảng IP thành định dạng PostgreSQL array
      const ipArray = `{${data.ip_address.join(',')}}`;
      await client.query(
        'UPDATE Assets SET status_id = $1, ip_address = $2 WHERE asset_id = $3',
        [inUseStatusResult.rows[0].status_id, ipArray, assetId]
      );
    } else {
      await client.query(
        'UPDATE Assets SET status_id = $1 WHERE asset_id = $2',
        [inUseStatusResult.rows[0].status_id, assetId]
      );
    }

    await client.query('COMMIT');

    // Trả về thông tin asset đã cấp phát
    const result = await client.query(
      `SELECT 
        a.asset_id,
        a.asset_code,
        a.asset_name,
        ac.category_name,
        a.brand,
        a.model,
        a.mac_address,
        a.ip_address,
        ast.status_name,
        ah.handover_date,
        ah.history_status
      FROM Assets a
      LEFT JOIN Asset_Categories ac ON a.category_id = ac.category_id
      LEFT JOIN Asset_Statuses ast ON a.status_id = ast.status_id
      LEFT JOIN Assets_History ah ON a.asset_id = ah.asset_id
      WHERE a.asset_id = $1 AND ah.employee_id = $2
      ORDER BY ah.handover_date DESC
      LIMIT 1`,
      [assetId, employee_id]
    );

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Tạo folder lưu trữ cho người dùng */
export const createUserStorageFolder = async (emp_code: string) => {
  try {
    // Kiểm tra user có tồn tại không
    const user = await pool.query(
      'SELECT * FROM Employees WHERE emp_code = $1',
      [emp_code]
    );

    if (user.rows.length === 0) {
      throw new Error('Không tìm thấy nhân viên');
    }

    // Tạo đường dẫn thư mục
    const folderPath = path.join(process.env.STORAGE_PATH || 'storage', emp_code);
    console.log('Đường dẫn thư mục:', folderPath);
    console.log('STORAGE_PATH:', process.env.STORAGE_PATH);

    // Kiểm tra thư mục đã tồn tại chưa
    if (fs.existsSync(folderPath)) {
      console.log('Thư mục đã tồn tại:', folderPath);
      throw new Error('Folder lưu trữ đã tồn tại');
    }

    try {
      // Tạo thư mục chính
      console.log('Đang tạo thư mục chính:', folderPath);
      fs.mkdirSync(folderPath, { recursive: true });

      // Tạo các thư mục con
      // const subFolders = ['Documents', 'Images', 'Videos'];
      const subFolders = ['Documents'];
      for (const folder of subFolders) {
        const subFolderPath = path.join(folderPath, folder);
        console.log('Đang tạo thư mục con:', subFolderPath);
        fs.mkdirSync(subFolderPath, { recursive: true });
      }

      return {
        emp_code,
        folder_path: folderPath,
        created_at: new Date()
      };
    } catch (error: any) {
      console.error('Lỗi khi tạo thư mục:', error);
      throw new Error(`Không thể tạo thư mục: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Lỗi trong createUserStorageFolder:', error);
    throw error;
  }
};

// Cập nhật trạng thái thiết bị thành "chờ xóa" và history_status thành "Đang chờ xóa"
export const returnAssets = async (empCode: string, assetIds: number[]) => {
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
      `SELECT ah.asset_id, a.asset_code, a.status_id, ast.status_name
       FROM Assets_History ah
       JOIN Assets a ON ah.asset_id = a.asset_id
       JOIN Asset_Statuses ast ON a.status_id = ast.status_id
       WHERE ah.employee_id = $1 
       AND ah.history_status = 'Đang sử dụng'
       AND ah.returned_date IS NULL
       AND ah.asset_id = ANY($2)`,
      [employee_id, assetIds]
    );

    if (assetsResult.rows.length === 0) {
      throw new Error(`Không tìm thấy thiết bị nào hợp lệ để trả lại cho nhân viên ${empCode}`);
    }

    if (assetsResult.rows.length !== assetIds.length) {
      const foundIds = assetsResult.rows.map(row => row.asset_id);
      const invalidIds = assetIds.filter(id => !foundIds.includes(id));
      throw new Error(`Một số thiết bị không hợp lệ hoặc không thuộc về nhân viên: ${invalidIds.join(', ')}`);
    }

    // Lấy status_id của trạng thái "Chờ xóa"
    const deleteStatusResult = await client.query(
      'SELECT status_id FROM Asset_Statuses WHERE status_name = $1',
      ['Chờ xóa']
    );

    if (deleteStatusResult.rows.length === 0) {
      throw new Error('Không tìm thấy trạng thái "Chờ xóa"');
    }

    const deleteStatusId = deleteStatusResult.rows[0].status_id;

    // Cập nhật trạng thái cho từng thiết bị
    for (const asset of assetsResult.rows) {
      // Cập nhật trạng thái asset
      await client.query(
        'UPDATE Assets SET status_id = $1 WHERE asset_id = $2',
        [deleteStatusId, asset.asset_id]
      );

      // Cập nhật trạng thái lịch sử
      await client.query(
        `UPDATE Assets_History 
         SET history_status = 'Đã trả lại'
         WHERE asset_id = $1 
         AND employee_id = $2
         AND returned_date IS NULL`,
        [asset.asset_id, employee_id]
      );
    }

    await client.query('COMMIT');
    return {
      message: 'Đã cập nhật trạng thái thiết bị thành công',
      updatedAssets: assetsResult.rows.map(row => row.asset_code)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Xóa AD User và chuyển trạng thái người dùng sang Resigned
export const deleteADUser = async (empCode: string) => {
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

    // Kiểm tra xem tất cả thiết bị đã được trả lại chưa
    const assetsResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM Assets_History ah
       WHERE ah.employee_id = $1 
       AND ah.history_status != 'Đã trả lại'
       AND ah.returned_date IS NULL`,
      [employee_id]
    );

    if (assetsResult.rows[0].count > 0) {
      throw new Error('Không thể xóa AD User vì vẫn còn thiết bị chưa được trả lại');
    }

    // Cập nhật trạng thái người dùng thành Resigned
    await client.query(
      `UPDATE Employees 
       SET status_work = 'Resigned'
       WHERE emp_code = $1`,
      [empCode]
    );

    await client.query('COMMIT');
    return {
      message: 'Đã xóa AD User và cập nhật trạng thái người dùng thành công'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Xóa hoàn toàn người dùng (chỉ khi trạng thái là Resigned)
export const forceDeleteUser = async (empCode: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Kiểm tra nhân viên tồn tại và có trạng thái Resigned không
    const empResult = await client.query(
      `SELECT employee_id FROM Employees 
       WHERE emp_code = $1 AND status_work = 'Resigned'`,
      [empCode]
    );

    if (empResult.rows.length === 0) {
      throw new Error(`Không tìm thấy người dùng với mã ${empCode} hoặc trạng thái không phải Resigned`);
    }

    const employee_id = empResult.rows[0].employee_id;

    // Xóa các bản ghi trong Activity_Logs trước
    await client.query(
      'DELETE FROM Activity_Logs WHERE changed_by = $1',
      [employee_id]
    );

    // Xóa các bản ghi trong Assets_History trước
    await client.query(
      'DELETE FROM Assets_History WHERE employee_id = $1 OR handover_by = $1',
      [employee_id]
    );

    // Sau đó mới xóa người dùng
    await client.query(
      'DELETE FROM Employees WHERE emp_code = $1',
      [empCode]
    );

    await client.query('COMMIT');
    return {
      message: 'Đã xóa người dùng thành công'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Lấy tên người dùng theo emp_code
export const getUserName = async (empCode: string) => {
  try {
    const result = await pool.query(
      `SELECT full_name 
       FROM Employees 
       WHERE emp_code = $1`,
      [empCode]
    );

    if (result.rows.length === 0) {
      throw new Error(`Không tìm thấy người dùng với mã ${empCode}`);
    }

    return result.rows[0].full_name;
  } catch (error) {
    console.error('Error in getUserName:', error);
    throw error;
  }
};

// Lấy thông tin người dùng theo emp_code
export const getUserInfo = async (empCode: string) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.first_name as firstname,
        e.last_name as lastname,
        e.emp_code,
        e.full_name,
        e.email,
        e.position as jobtitle,
        e.status_work,
        e.status_account,
        d.department_name as department,
        bu.name as business_unit_name
       FROM Employees e
       LEFT JOIN Departments d ON e.department_id = d.department_id
       LEFT JOIN Business_Units bu ON e.business_unit_id = bu.business_unit_id
       WHERE e.emp_code = $1`,
      [empCode]
    );

    if (result.rows.length === 0) {
      throw new Error(`Không tìm thấy người dùng với mã ${empCode}`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error in getUserInfo:', error);
    throw error;
  }
};

// Lấy thông tin người dùng cho chức năng share files
export const getUserShareFiles = async (empCode: string) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.emp_code,
        e.first_name as firstname,
        e.last_name as lastname,
        e.full_name,
        e.email,
        e.position as jobtitle,
        d.department_name as department,
        bu.name as business_unit_name
       FROM Employees e
       LEFT JOIN Departments d ON e.department_id = d.department_id
       LEFT JOIN Business_Units bu ON d.business_unit_id = bu.business_unit_id
       WHERE e.emp_code = $1`,
      [empCode]
    );

    if (result.rows.length === 0) {
      throw new Error(`Không tìm thấy người dùng với mã ${empCode}`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error in getUserShareFiles:', error);
    throw error;
  }
};

// Hủy đăng ký thiết bị
export const unregisterAssets = async (empCode: string, assetIds: number[]) => {
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
      `SELECT ah.history_id, ah.asset_id, a.asset_code, a.status_id, ast.status_name, ah.is_handover, ah.history_status
       FROM Assets_History ah
       JOIN Assets a ON ah.asset_id = a.asset_id
       JOIN Asset_Statuses ast ON a.status_id = ast.status_id
       WHERE ah.employee_id = $1 
       AND (ah.history_status = 'Đã đăng ký' OR ah.history_status = 'Chờ bàn giao' OR ah.history_status = 'Cấp phát chờ xóa')
       AND ah.returned_date IS NULL
       AND ah.asset_id = ANY($2)`,
      [employee_id, assetIds]
    );

    if (assetsResult.rows.length === 0) {
      throw new Error(`Không tìm thấy thiết bị nào hợp lệ để hủy đăng ký cho nhân viên ${empCode}`);
    }

    if (assetsResult.rows.length !== assetIds.length) {
      const foundIds = assetsResult.rows.map(row => row.asset_id);
      const invalidIds = assetIds.filter(id => !foundIds.includes(id));
      throw new Error(`Một số thiết bị không hợp lệ hoặc không thuộc về nhân viên: ${invalidIds.join(', ')}`);
    }

    // Lấy status_id của các trạng thái
    const [newStatusResult, inUseStatusResult, deleteStatusResult] = await Promise.all([
      client.query('SELECT status_id FROM Asset_Statuses WHERE status_name = $1', ['New']),
      client.query('SELECT status_id FROM Asset_Statuses WHERE status_name = $1', ['Đang sử dụng']),
      client.query('SELECT status_id FROM Asset_Statuses WHERE status_name = $1', ['Chờ xóa'])
    ]);

    if (newStatusResult.rows.length === 0) {
      throw new Error('Không tìm thấy trạng thái "New"');
    }

    if (inUseStatusResult.rows.length === 0) {
      throw new Error('Không tìm thấy trạng thái "Đang sử dụng"');
    }

    if (deleteStatusResult.rows.length === 0) {
      throw new Error('Không tìm thấy trạng thái "Chờ xóa"');
    }

    const newStatusId = newStatusResult.rows[0].status_id;
    const inUseStatusId = inUseStatusResult.rows[0].status_id;
    const deleteStatusId = deleteStatusResult.rows[0].status_id;

    // Cập nhật trạng thái cho từng thiết bị
    for (const asset of assetsResult.rows) {
      let newStatus;

      if (asset.history_status === 'Cấp phát chờ xóa') {
        newStatus = deleteStatusId;
      } else {
        newStatus = asset.is_handover ? newStatusId : inUseStatusId;
      }

      // Cập nhật trạng thái asset
      await client.query(
        'UPDATE Assets SET status_id = $1 WHERE asset_id = $2',
        [newStatus, asset.asset_id]
      );

      // Cập nhật trạng thái lịch sử dựa trên history_id
      await client.query(
        `UPDATE Assets_History 
         SET history_status = 'Đã hủy',
             returned_date = CURRENT_DATE
         WHERE history_id = $1`,
        [asset.history_id]
      );
    }

    await client.query('COMMIT');
    return {
      message: 'Đã hủy đăng ký thiết bị thành công',
      updatedAssets: assetsResult.rows.map(row => row.asset_code)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Lấy danh sách nhân viên đang làm việc
export const getActiveEmployees = async () => {
  try {
    const result = await pool.query(
      `SELECT 
        e.employee_id,
        e.emp_code,
        e.first_name,
        e.last_name,
        e.full_name,
        e.email,
        e.position,
        e.status_work,
        e.status_account,
        e.department_id,
        d.department_name,
        bu.name as business_unit_name
       FROM Employees e
       LEFT JOIN Departments d ON e.department_id = d.department_id
       LEFT JOIN Business_Units bu ON e.business_unit_id = bu.business_unit_id
       WHERE e.status_work = 'Working'
       ORDER BY e.emp_code ASC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error in getActiveEmployees:', error);
    throw error;
  }
};


