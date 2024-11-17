import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ProfanityFilter } from "./profanityFilter";
import pool from "./db";

// เพิ่ม interface สำหรับ pagination parameters
interface PaginationQuery {
    page?: number;
    limit?: number;
}

// interface สำหรับ response ที่มี pagination
interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        totalPages: number;
        currentPage: number;
        limit: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

// รวม query parameters ทั้งหมดสำหรับ expenses
interface ExpenseQuerystring extends PaginationQuery {
    month?: number;
    year?: number;
    type?: "INCOME" | "EXPENSE";
    category?: string;
    accountType?: string;
    startDate?: string;
    endDate?: string;
}

interface ExpenseQuerystring {
    month?: number;
    year?: number;
    type?: "INCOME" | "EXPENSE";
    accountId?: number;
}

// สำหรับฟังก์ชันที่ใช้ validate limit ของข้อมูล
const validateLimit = (limit?: number): number => {
    const allowedLimits = [10, 20, 50, 100]; // กำหนดค่าที่อนุญาตให้เป็น limit
    const requestedLimit = limit || 10; // กำหนดค่าหากไม่มีการส่ง limit
    return allowedLimits.includes(requestedLimit) ? requestedLimit : 10; // คืนค่าหาก limit ถูกต้อง
};

export default async function expenseRoutes(server: FastifyInstance) {
    // ดึงข้อมูลการใช้จ่ายด้วยการแบ่งหน้า
    server.get<{ Querystring: ExpenseQuerystring }>(
        "/expenses",
        async (req, reply) => {
            try {
                const {
                    month,
                    year,
                    type,
                    category,
                    accountType,
                    startDate,
                    endDate,
                    page = 1,
                    limit,
                } = req.query;

                // ตรวจสอบค่า limit ที่ถูกต้อง
                const validatedLimit = validateLimit(limit);
                const offset = (page - 1) * validatedLimit;

                // สร้าง query สำหรับดึงข้อมูล
                let whereClause = "WHERE 1=1";
                const params: any[] = [];
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
                const totalResult = await pool.query(countQuery, params);
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
                const result = await pool.query(dataQuery, finalParams);

                // คำนวณข้อมูล pagination
                const totalPages = Math.ceil(total / validatedLimit);

                const response: PaginatedResponse<any> = {
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
            } catch (err) {
                reply.status(500).send(err);
            }
        }
    );

    // ดึงข้อมูลหมวดหมู่ (categories) ด้วย pagination
    server.get<{ Querystring: PaginationQuery }>(
        "/categories",
        async (req, reply) => {
            try {
                const { page = 1, limit } = req.query;
                const validatedLimit = validateLimit(limit);
                const offset = (page - 1) * validatedLimit;

                // ดึงจำนวนข้อมูลทั้งหมด
                const totalResult = await pool.query("SELECT COUNT(*) FROM categories");
                const total = parseInt(totalResult.rows[0].count);

                // ดึงข้อมูลหมวดหมู่
                const result = await pool.query(
                    "SELECT * FROM categories ORDER BY type, name LIMIT $1 OFFSET $2",
                    [validatedLimit, offset]
                );

                // คำนวณข้อมูล pagination
                const totalPages = Math.ceil(total / validatedLimit);

                const response: PaginatedResponse<any> = {
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
            } catch (err) {
                reply.status(500).send(err);
            }
        }
    );

    // API สำหรับเพิ่มบัญชีการใช้งาน
    server.post('/accounts', async (req, reply) => {
        const { name } = req.body as { name: string };
        try {
            await pool.query("INSERT INTO accounts (name) VALUES ($1)", [name]);
            reply.send({ message: 'Account added successfully' });
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // API สำหรับลบบัญชีการใช้งาน
    server.delete('/accounts/:id', async (req, reply) => {
        const { id } = req.params as { id: number };
        try {
            await pool.query("DELETE FROM accounts WHERE id = $1", [id]);
            reply.send({ message: 'Account deleted successfully' });
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // API สำหรับเพิ่มประเภทการใช้จ่าย
    server.post('/expense-types', async (req, reply) => {
        const { name } = req.body as { name: string };
        try {
            await pool.query("INSERT INTO expense_types (name) VALUES ($1)", [name]);
            reply.send({ message: 'Expense type added successfully' });
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // API สำหรับลบประเภทการใช้จ่าย
    server.delete('/expense-types/:id', async (req, reply) => {
        const { id } = req.params as { id: number };
        try {
            await pool.query("DELETE FROM expense_types WHERE id = $1", [id]);
            reply.send({ message: 'Expense type deleted successfully' });
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // API สำหรับสรุปยอดการใช้จ่าย
    server.get('/expenses/summary', async (req, reply) => {
        try {
            const result = await pool.query(`
                SELECT type, SUM(amount) AS total_amount
                FROM transactions
                GROUP BY type
            `);
            reply.send(result.rows);
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // API สำหรับ filter ข้อมูลการใช้จ่าย
    server.get('/expenses/filter', async (req, reply) => {
        const { month, year, type, accountId } = req.query as ExpenseQuerystring;
        let whereClause = "WHERE 1=1";
        const params: any[] = [];
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
            const result = await pool.query(`
                SELECT * FROM transactions ${whereClause}
                ORDER BY date DESC
            `, params);
            reply.send(result.rows);
        } catch (err) {
            reply.status(500).send(err);
        }
    });
}
