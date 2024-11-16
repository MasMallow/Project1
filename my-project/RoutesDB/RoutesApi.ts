import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ProfanityFilter } from './profanityFilter';
import pool from './db';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

interface ExpenseBody {
    title: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    description?: string;
    note?: string;
    accountType?: string;
}

interface ExpenseQuerystring {
    month?: number;
    year?: number;
    type?: 'INCOME' | 'EXPENSE';
    category?: string;
    accountType?: string;
    startDate?: string;
    endDate?: string;
}

interface CategoryBody {
    name: string;
    type: string;
}

interface RequestParams {
    id: string;
    word: string;
}

export default async function expenseRoutes(server: FastifyInstance) {
    // File upload setup
    await server.register(import('@fastify/multipart'), {
        limits: {
            fieldSize: 1000000, // 1MB
            fields: 10,
            fileSize: 5000000, // 5MB
            files: 1,
        },
    });

    // 1. Create expense with file upload
    server.post('/expenses', async (req, reply) => {
        try {
            const data = await req.file();
            if (!data) {
                reply.status(400).send({ message: 'No file or form data provided' });
                return;
            }

            let receiptPath: string | null = null;

            // Parse form data
            const fields = data.fields as Record<string, { value: string }>;
            const body: ExpenseBody = {
                title: fields.title?.value,
                amount: parseFloat(fields.amount?.value),
                type: fields.type?.value as 'INCOME' | 'EXPENSE',
                category: fields.category?.value,
                description: fields.description?.value,
                note: fields.note?.value,
                accountType: fields.accountType?.value,
            };

            // Validate required fields
            if (!body.title || !body.amount || !body.type || !body.category) {
                reply.status(400).send({ message: 'Missing required fields' });
                return;
            }

            // Check for profanity
            const filter = new ProfanityFilter();
            if (filter.containsProfanity(body.title) || 
                filter.containsProfanity(body.description || '') ||
                filter.containsProfanity(body.note || '')) {
                reply.status(400).send({ message: 'Content contains inappropriate language' });
                return;
            }

            // Handle file upload
            if (data.file) {
                const filename = `${randomUUID()}${path.extname(data.filename)}`;
                const uploadDir = path.join(__dirname, '../../uploads');
                await fs.mkdir(uploadDir, { recursive: true });
                const filepath = path.join(uploadDir, filename);
                await pipeline(data.file, createWriteStream(filepath));
                receiptPath = `/uploads/${filename}`;
            }

            // Insert to database
            const result = await pool.query(
                `INSERT INTO expenses (
                    title, amount, type, category, description, note, 
                    receipt_path, account_type, date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
                RETURNING *`,
                [
                    body.title, body.amount, body.type, body.category,
                    body.description, body.note, receiptPath, body.accountType
                ]
            );

            reply.send(result.rows[0]);
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // 2. Get expenses with filters
    server.get<{ Querystring: ExpenseQuerystring }>('/expenses', async (req, reply) => {
        try {
            const {
                month, year, type, category, accountType,
                startDate, endDate
            } = req.query;

            let query = 'SELECT * FROM expenses WHERE 1=1';
            const params: any[] = [];
            let paramIndex = 1;

            if (month) {
                query += ` AND EXTRACT(MONTH FROM date) = $${paramIndex++}`;
                params.push(month);
            }

            if (year) {
                query += ` AND EXTRACT(YEAR FROM date) = $${paramIndex++}`;
                params.push(year);
            }

            if (type) {
                query += ` AND type = $${paramIndex++}`;
                params.push(type);
            }

            if (category) {
                query += ` AND category = $${paramIndex++}`;
                params.push(category);
            }

            if (accountType) {
                query += ` AND account_type = $${paramIndex++}`;
                params.push(accountType);
            }

            if (startDate) {
                query += ` AND date >= $${paramIndex++}`;
                params.push(startDate);
            }

            if (endDate) {
                query += ` AND date <= $${paramIndex++}`;
                params.push(endDate);
            }

            query += ' ORDER BY date DESC';

            const result = await pool.query(query, params);
            reply.send(result.rows);
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // 3. Category Management
    server.get('/categories', async (req, reply) => {
        try {
            const result = await pool.query(
                'SELECT * FROM categories ORDER BY type, name'
            );
            reply.send(result.rows);
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    server.post<{ Body: CategoryBody }>('/categories', async (req, reply) => {
        try {
            const { name, type } = req.body;
            
            const filter = new ProfanityFilter();
            if (filter.containsProfanity(name)) {
                reply.status(400).send({ message: 'Category name contains inappropriate language' });
                return;
            }

            const result = await pool.query(
                'INSERT INTO categories (name, type) VALUES ($1, $2) RETURNING *',
                [name, type]
            );
            reply.send(result.rows[0]);
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    server.delete<{ Params: RequestParams }>('/categories/:id', async (req, reply) => {
        try {
            const result = await pool.query(
                'DELETE FROM categories WHERE id = $1 RETURNING *',
                [req.params.id]
            );
            
            if (result.rows.length === 0) {
                reply.status(404).send({ message: 'Category not found' });
                return;
            }
            
            reply.send({ message: 'Category deleted successfully' });
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    // 4. Profanity Management
    server.post<{ Body: { word: string } }>('/profanity', async (req, reply) => {
        try {
            await ProfanityFilter.addWord(req.body.word);
            reply.send({ message: 'Word added successfully' });
        } catch (err) {
            reply.status(500).send(err);
        }
    });

    server.delete<{ Params: RequestParams }>('/profanity/:word', async (req, reply) => {
        try {
            await ProfanityFilter.removeWord(req.params.word);
            reply.send({ message: 'Word removed successfully' });
        } catch (err) {
            reply.status(500).send(err);
        }
    });
}