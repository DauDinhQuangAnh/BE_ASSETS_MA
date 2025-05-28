import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware'; // kiểu request có req.user

export function isAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user) {
    res.status(401).json({ message: 'Chưa xác thực người dùng' });
    return;
  }

  if (user.role !== 'admin') {
    res.status(403).json({ message: 'Bạn không có quyền truy cập chức năng này (cần quyền admin)' });
    return;
  }
  next();
}
