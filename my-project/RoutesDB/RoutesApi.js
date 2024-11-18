"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = expenseRoutes;
const profanityFilter_1 = require("./profanityFilter");
const multipart_1 = __importDefault(require("@fastify/multipart"));
const db_1 = __importDefault(require("./db"));
const fastify_multer_1 = __importDefault(require("fastify-multer"));
const path_1 = __importDefault(require("path"));
// ตั้งค่า multer สำหรับอัพโหลดไฟล์
const storage = fastify_multer_1.default.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = (0, fastify_multer_1.default)({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // อนุญาตเฉพาะไฟล์รูปภาพ
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // จำกัดขนาดไฟล์ที่ 5MB
    }
});
// สำหรับฟังก์ชันที่ใช้ validate limit ของข้อมูล
const validateLimit = (limit) => {
    const allowedLimits = [10, 20, 50, 100]; // กำหนดค่าที่อนุญาตให้เป็น limit
    const requestedLimit = limit || 10; // กำหนดค่าหากไม่มีการส่ง limit
    return allowedLimits.includes(requestedLimit) ? requestedLimit : 10; // คืนค่าหาก limit ถูกต้อง
};
function expenseRoutes(server) {
    return __awaiter(this, void 0, void 0, function* () {
        yield server.register(multipart_1.default, {
            attachFieldsToBody: true,
            sharedSchemaId: '#mySharedSchema',
            limits: {
                fieldNameSize: 100,
                fieldSize: 100,
                fields: 10,
                fileSize: 5000000,
                files: 1
            }
        });
        // ดึงข้อมูลการใช้จ่ายด้วยการแบ่งหน้า
        server.get("/expenses", (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year, type, category, accountType, startDate, endDate, page = 1, limit, } = req.query;
                // ตรวจสอบค่า limit ที่ถูกต้อง
                const validatedLimit = validateLimit(limit);
                const offset = (page - 1) * validatedLimit;
                // สร้าง query สำหรับดึงข้อมูล
                let whereClause = "WHERE 1=1";
                const params = [];
                let paramIndex = 1;
                // เพิ่มเงื่อนไขการค้นหาตามเดือน, ปี, ประเภท, หมวดหมู่, และเงื่อนไขอื่นๆ
                if (month) {
                    whereClause += ` AND EXTRACT(MONTH FROM date) = $${paramIndex++}`;
                    params.push(month);
                }
                if (year) {
                    whereClause += ` AND EXTRACT(YEAR FROM date) = $${paramIndex++}`;
                    params.push(year);
                }
                if (type) {
                    whereClause += ` AND type = $${paramIndex++}`;
                    params.push(type);
                }
                if (category) {
                    whereClause += ` AND category = $${paramIndex++}`;
                    params.push(category);
                }
                if (accountType) {
                    whereClause += ` AND account_type = $${paramIndex++}`;
                    params.push(accountType);
                }
                if (startDate) {
                    whereClause += ` AND date >= $${paramIndex++}`;
                    params.push(startDate);
                }
                if (endDate) {
                    whereClause += ` AND date <= $${paramIndex++}`;
                    params.push(endDate);
                }
                // ดึงจำนวนข้อมูลทั้งหมด
                const countQuery = `SELECT COUNT(*) FROM transactions ${whereClause}`;
                const totalResult = yield db_1.default.query(countQuery, params);
                const total = parseInt(totalResult.rows[0].count);
                // ดึงข้อมูลตาม pagination
                const dataQuery = `
                        SELECT * FROM transactions 
                        ${whereClause} 
                        ORDER BY date DESC 
                        LIMIT $${paramIndex++} 
                        OFFSET $${paramIndex++}
                        `;
                const finalParams = [...params, validatedLimit, offset];
                const result = yield db_1.default.query(dataQuery, finalParams);
                // คำนวณข้อมูล pagination
                const totalPages = Math.ceil(total / validatedLimit);
                const response = {
                    data: result.rows,
                    pagination: {
                        total,
                        totalPages,
                        currentPage: page,
                        limit: validatedLimit,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1,
                    },
                };
                reply.send(response);
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // ดึงข้อมูลหมวดหมู่ (categories) ด้วย pagination
        server.get("/categories", (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit } = req.query;
                const validatedLimit = validateLimit(limit);
                const offset = (page - 1) * validatedLimit;
                // ดึงจำนวนข้อมูลทั้งหมด
                const totalResult = yield db_1.default.query("SELECT COUNT(*) FROM categories");
                const total = parseInt(totalResult.rows[0].count);
                // ดึงข้อมูลหมวดหมู่
                const result = yield db_1.default.query("SELECT * FROM categories ORDER BY type, name LIMIT $1 OFFSET $2", [validatedLimit, offset]);
                // คำนวณข้อมูล pagination
                const totalPages = Math.ceil(total / validatedLimit);
                const response = {
                    data: result.rows,
                    pagination: {
                        total,
                        totalPages,
                        currentPage: page,
                        limit: validatedLimit,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1,
                    },
                };
                reply.send(response);
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // API สำหรับเพิ่มบัญชีการใช้งาน
        server.post('/accounts', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            const { name } = req.body;
            try {
                yield db_1.default.query("INSERT INTO accounts (name) VALUES ($1)", [name]);
                reply.send({ message: 'Account added successfully' });
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // API สำหรับลบบัญชีการใช้งาน
        server.delete('/accounts/:id', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            try {
                yield db_1.default.query("DELETE FROM accounts WHERE id = $1", [id]);
                reply.send({ message: 'Account deleted successfully' });
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // API สำหรับเพิ่มประเภทการใช้จ่าย
        server.post('/expense-types', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            const { name } = req.body;
            try {
                yield db_1.default.query("INSERT INTO expense_types (name) VALUES ($1)", [name]);
                reply.send({ message: 'Expense type added successfully' });
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // API สำหรับลบประเภทการใช้จ่าย
        server.delete('/expense-types/:id', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            try {
                yield db_1.default.query("DELETE FROM expense_types WHERE id = $1", [id]);
                reply.send({ message: 'Expense type deleted successfully' });
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // API สำหรับสรุปยอดการใช้จ่าย
        server.get('/expenses/summary', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query(`
                SELECT type, SUM(amount) AS total_amount
                FROM transactions
                GROUP BY type
            `);
                reply.send(result.rows);
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // API สำหรับ filter ข้อมูลการใช้จ่าย
        server.get('/expenses/filter', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            const { month, year, type, accountId } = req.query;
            let whereClause = "WHERE 1=1";
            const params = [];
            let paramIndex = 1;
            if (month) {
                whereClause += ` AND EXTRACT(MONTH FROM date) = $${paramIndex++}`;
                params.push(month);
            }
            if (year) {
                whereClause += ` AND EXTRACT(YEAR FROM date) = $${paramIndex++}`;
                params.push(year);
            }
            if (type) {
                whereClause += ` AND type = $${paramIndex++}`;
                params.push(type);
            }
            if (accountId) {
                whereClause += ` AND account_id = $${paramIndex++}`;
                params.push(accountId);
            }
            try {
                const result = yield db_1.default.query(`
                SELECT * FROM transactions ${whereClause}
                ORDER BY date DESC
            `, params);
                reply.send(result.rows);
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        server.post('/transactions', {
            preHandler: upload.single('receipt')
        }, (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Debug logs
                console.log('Raw request body:', req.body);
                console.log('Request headers:', req.headers);
                console.log('Content-Type:', req.headers['content-type']);
                // Type assertion และ log ค่าหลังจาก type assertion
                const body = req.body;
                console.log('Body after type assertion:', body);
                console.log('Amount value:', body.amount);
                console.log('Amount type:', typeof body.amount);
                // ถ้า amount เป็น undefined หรือ empty string
                if (!body.amount) {
                    console.log('Amount is missing or empty');
                    return reply.status(400).send({
                        message: 'Amount is required',
                        receivedBody: req.body
                    });
                }
                // แปลง amount เป็น number
                const amount = parseFloat(body.amount);
                console.log('Parsed amount:', amount);
                console.log('Is amount NaN?:', isNaN(amount));
                // ตรวจสอบความถูกต้องของข้อมูล
                if (isNaN(amount)) {
                    return reply.status(400).send({
                        message: 'Invalid amount format',
                        receivedValue: body.amount,
                        parsedAmount: amount
                    });
                }
                const { type, note } = body;
                // แปลง category_id และ account_id เป็น number
                const categoryId = parseInt(body.category_id);
                const accountId = parseInt(body.account_id);
                console.log('Parsed IDs:', { categoryId, accountId });
                if (isNaN(categoryId) || isNaN(accountId)) {
                    return reply.status(400).send({
                        message: 'Invalid category_id or account_id',
                        categoryId: body.category_id,
                        accountId: body.account_id
                    });
                }
                const file = req.file;
                console.log('Uploaded file:', file);
                // กรองคำหยาบใน note
                const filter = new profanityFilter_1.ProfanityFilter();
                const cleanedNote = note ? profanityFilter_1.ProfanityFilter.filterText(note) : null;
                const result = yield db_1.default.query(`INSERT INTO transactions 
                (amount, type, category_id, account_id, note, receipt_path) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING *`, [
                    amount.toString(),
                    type,
                    categoryId.toString(),
                    accountId.toString(),
                    cleanedNote,
                    file ? `/receipts/${file.filename}` : null
                ]);
                reply.send(result.rows[0]);
            }
            catch (err) {
                const error = err;
                console.error('Transaction error:', error);
                reply.status(500).send({
                    message: 'Server error processing transaction',
                    error: error.message
                });
            }
        }));
        // API สำหรับอัพเดท note
        server.patch('/transactions/:id/note', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const { note } = req.body;
            // กรองคำหยาบ
            const filter = new profanityFilter_1.ProfanityFilter();
            const cleanedNote = profanityFilter_1.ProfanityFilter.filterText(note);
            try {
                const result = yield db_1.default.query("UPDATE transactions SET note = $1 WHERE id = $2 RETURNING *", [cleanedNote, id]);
                if (result.rows.length === 0) {
                    return reply.status(404).send({ message: 'Transaction not found' });
                }
                reply.send(result.rows[0]);
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // API สำหรับอัพเดทรูปภาพ receipt
        server.patch('/transactions/:id/receipt', {
            preHandler: upload.single('receipt')
        }, (req, reply) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const file = req.file;
            if (!file) {
                return reply.status(400).send({ message: 'No file uploaded' });
            }
            try {
                const result = yield db_1.default.query("UPDATE transactions SET receipt_path = $1 WHERE id = $2 RETURNING *", [`/receipts/${file.filename}`, id]);
                if (result.rows.length === 0) {
                    return reply.status(404).send({ message: 'Transaction not found' });
                }
                reply.send(result.rows[0]);
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
    });
}
