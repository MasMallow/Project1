import { Pool } from 'pg';
import dotenv from 'dotenv';

// โหลดตัวแปรจากไฟล์ .env
dotenv.config();

// สร้างการเชื่อมต่อ PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,         // ใช้ค่าจาก .env
    host: process.env.DB_HOST,         // ใช้ค่าจาก .env
    database: process.env.DB_NAME,     // ใช้ค่าจาก .env
    password: process.env.DB_PASSWORD, // ใช้ค่าจาก .env
    port: parseInt(process.env.DB_PORT || '5432'), // ใช้ค่าจาก .env และแปลงเป็น number
});

export default pool;
