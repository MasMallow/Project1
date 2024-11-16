"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
// โหลดตัวแปรจากไฟล์ .env
dotenv_1.default.config();
// สร้างการเชื่อมต่อ PostgreSQL
const pool = new pg_1.Pool({
    user: process.env.DB_USER, // ใช้ค่าจาก .env
    host: process.env.DB_HOST, // ใช้ค่าจาก .env
    database: process.env.DB_NAME, // ใช้ค่าจาก .env
    password: process.env.DB_PASSWORD, // ใช้ค่าจาก .env
    port: parseInt(process.env.DB_PORT || '5432'), // ใช้ค่าจาก .env และแปลงเป็น number
});
exports.default = pool;
