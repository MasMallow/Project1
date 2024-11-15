import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from './db';

// สร้าง interface สำหรับ request parameters และ body
interface ExpenseBody {
    title: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    description?: string;
}

interface ExpenseParams {
    id: string;
}

// สร้างฟังก์ชันที่จะ export ไปใช้ใน server.ts
export default async function expenseRoutes(server: FastifyInstance) {
    // 1. เพิ่มรายการใหม่
    server.post<{
        Body: ExpenseBody;
    }>('/expenses', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    amount: { type: 'number' },
                    type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                    category: { type: 'string' },
                    description: { type: 'string' }
                },
                required: ['title', 'amount', 'type', 'category']
            }
        }
    }, async (req, reply: FastifyReply) => {
        try {
            const { title, amount, type, category, description } = req.body;

            const result = await pool.query(
                'INSERT INTO expenses (title, amount, type, category, description, date) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
                [title, amount, type, category, description]
            );

            reply.send(result.rows[0]);
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // 2. ดึงรายการทั้งหมด
    server.get('/expenses', async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
            reply.send(result.rows);
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // 3. ดึงรายการตาม ID
    server.get<{
        Params: ExpenseParams;
    }>('/expenses/:id', async (req, reply: FastifyReply) => {
        try {
            const { id } = req.params;
            const result = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);

            if (result.rows.length === 0) {
                reply.status(404).send({ message: 'Expense not found' });
                return;
            }

            reply.send(result.rows[0]);
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // 4. แก้ไขรายการ
    server.put<{
        Params: ExpenseParams;
        Body: ExpenseBody;
    }>('/expenses/:id', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    amount: { type: 'number' },
                    type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                    category: { type: 'string' },
                    description: { type: 'string' }
                }
            }
        }
    }, async (req, reply: FastifyReply) => {
        try {
            const { id } = req.params;
            const { title, amount, type, category, description } = req.body;

            const result = await pool.query(
                'UPDATE expenses SET title = $1, amount = $2, type = $3, category = $4, description = $5 WHERE id = $6 RETURNING *',
                [title, amount, type, category, description, id]
            );

            if (result.rows.length === 0) {
                reply.status(404).send({ message: 'Expense not found' });
                return;
            }

            reply.send(result.rows[0]);
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // 5. ลบรายการ
    server.delete<{
        Params: ExpenseParams;
    }>('/expenses/:id', async (req, reply: FastifyReply) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                reply.status(404).send({ message: 'Expense not found' });
                return;
            }

            reply.send({ message: 'Expense deleted successfully' });
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // 6. ดึงสรุปรายรับ-รายจ่าย
    server.get('/expenses/summary/monthly', async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = await pool.query(`
                SELECT 
                    EXTRACT(MONTH FROM date) as month,
                    EXTRACT(YEAR FROM date) as year,
                    type,
                    SUM(amount) as total
                FROM expenses
                GROUP BY EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date), type
                ORDER BY year DESC, month DESC
            `);

            reply.send(result.rows);
        } catch (err) {
            reply.status(500).send(err);
        }
    });
}