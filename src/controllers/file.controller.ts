import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

// Lấy đường dẫn lưu trữ từ biến môi trường
const STORAGE_PATH = process.env.STORAGE_PATH || 'C:\\employees';

// Cấu hình multer để lưu file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Lấy mã nhân viên từ request
    const empCode = req.params.empCode || req.body.emp_code;

    if (!empCode) {
      return cb(new Error('Không tìm thấy mã nhân viên'), '');
    }

    // Tạo đường dẫn đến thư mục của nhân viên
    const userDir = path.join(STORAGE_PATH, empCode, 'Documents');
    console.log(userDir);
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Cấu hình các loại file được phép upload
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Danh sách các định dạng file được phép
  const allowedFileTypes = [
    // Microsoft Office
    'application/pdf',                                    // PDF
    'application/msword',                                 // Word (.doc)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word (.docx)
    'application/vnd.ms-excel',                          // Excel (.xls)
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel (.xlsx)
    'application/vnd.ms-powerpoint',                     // PowerPoint (.ppt)
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PowerPoint (.pptx)
    'application/vnd.ms-outlook',                        // Outlook Message (.msg)
    'application/x-msg',                                 // Outlook Message (.msg) - MIME type khác
    'message/rfc822',                                    // Outlook Message (.msg) - MIME type khác

    // Hình ảnh
    'image/jpeg',                                        // JPEG
    'image/png',                                         // PNG
    'image/gif',                                         // GIF

    // Text
    'text/plain',                                        // TXT
    'text/csv',                                          // CSV

    // Archive
    'application/zip',                                   // ZIP
    'application/x-rar-compressed',                      // RAR
    'application/x-7z-compressed',                       // 7Z

    // Code
    'application/json',                                  // JSON
    'text/x-python',                                     // Python
    'text/x-javascript',                                 // JavaScript
    'text/x-typescript',                                 // TypeScript
    'text/x-html',                                       // HTML
    'text/x-css',                                        // CSS
    'text/x-sql'                                         // SQL
  ];

  // Kiểm tra MIME type
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Kiểm tra phần mở rộng của file
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.msg') {
      // Cho phép file .msg bất kể MIME type
      cb(null, true);
    } else {
      cb(new Error('Loại file không được hỗ trợ'));
    }
  }
};

// Cấu hình multer cho nhiều file
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB mỗi file
  }
});

// Controller xử lý upload nhiều file
export const importFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empCode } = req.params;
    if (!empCode) {
      res.status(400).json({ message: 'Mã nhân viên không được để trống' });
      return;
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({ message: 'Vui lòng tải lên ít nhất một file' });
      return;
    }

    const uploadedFiles = (req.files as Express.Multer.File[]).map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    }));

    res.status(200).json({
      message: 'Upload files thành công',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Lỗi khi upload files:', error);

    // Xóa tất cả files nếu có lỗi
    if (req.files && Array.isArray(req.files)) {
      (req.files as Express.Multer.File[]).forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkError) {
            console.error('Lỗi khi xóa file:', unlinkError);
          }
        }
      });
    }

    res.status(500).json({
      message: 'Lỗi server khi upload files',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Controller mở folder trong Windows Explorer
export const openFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empCode } = req.params;
    console.log('Received request to open folder for empCode:', empCode);

    if (!empCode) {
      res.status(400).json({
        success: false,
        message: 'Mã nhân viên không được để trống',
        error: 'MISSING_EMP_CODE'
      });
      return;
    }

    const folderPath = path.join(STORAGE_PATH, empCode, 'Documents');
    console.log('Attempting to open folder at path:', folderPath);

    if (!fs.existsSync(folderPath)) {
      console.log('Folder does not exist at path:', folderPath);
      res.status(404).json({
        success: false,
        message: 'Thư mục không tồn tại',
        error: 'FOLDER_NOT_FOUND',
        path: folderPath
      });
      return;
    }

    // Mở folder bằng Windows Explorer
    exec(`start "" "${folderPath}"`, (error) => {
      if (error) {
        console.error('Lỗi khi mở thư mục:', error);
        res.status(500).json({
          success: false,
          message: 'Không thể mở thư mục',
          error: 'OPEN_FOLDER_FAILED',
          details: error.message
        });
        return;
      }
      console.log('Successfully opened folder');
      res.status(200).json({
        success: true,
        message: 'Mở thư mục thành công',
        path: folderPath
      });
    });

  } catch (error) {
    console.error('Lỗi khi mở thư mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi mở thư mục',
      error: 'SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 