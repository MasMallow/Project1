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

export default async function expenseRoutes(server: FastifyInstance) {
    // Utility function สำหรับตรวจสอบ limit
    const validateLimit = (limit?: number): number => {
        const allowedLimits = [10, 20, 50, 100];
        const requestedLimit = limit || 10;
        return allowedLimits.includes(requestedLimit) ? requestedLimit : 10;
    };

    // Get expenses with pagination
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

                // Validate pagination parameters
                const validatedLimit = validateLimit(limit);
                const offset = (page - 1) * validatedLimit;

                // Build base query
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

                // Get total count
                const countQuery = `SELECT COUNT(*) FROM transactions ${whereClause}`;
                const totalResult = await pool.query(countQuery, params);
                const total = parseInt(totalResult.rows[0].count);

                // Get paginated data
                const dataQuery = `
                        SELECT * FROM transactions 
                        ${whereClause} 
                        ORDER BY date DESC 
                        LIMIT $${paramIndex++} 
                        OFFSET $${paramIndex++}
                        `;

                const finalParams = [...params, validatedLimit, offset];
                const result = await pool.query(dataQuery, finalParams);

                // Calculate pagination metadata
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

    // Get categories with pagination
    server.get<{ Querystring: PaginationQuery }>(
        "/categories",
        async (req, reply) => {
            try {
                const { page = 1, limit } = req.query;
                const validatedLimit = validateLimit(limit);
                const offset = (page - 1) * validatedLimit;

                // Get total count
                const totalResult = await pool.query("SELECT COUNT(*) FROM categories");
                const total = parseInt(totalResult.rows[0].count);

                // Get paginated data
                const result = await pool.query(
                    "SELECT * FROM categories ORDER BY type, name LIMIT $1 OFFSET $2",
                    [validatedLimit, offset]
                );

                // Calculate pagination metadata
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

    // ... other routes remain the same ...
}
