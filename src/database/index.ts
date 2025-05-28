import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});

// Thử chạy một truy vấn test khi khởi tạo
pool.query('SELECT NOW() as current_time')
  .then(res => {
    console.log('DB connected successfully!', res.rows[0]);
  })
  .catch(err => {
    console.error('DB connection error:', err);
  });

export default pool;
