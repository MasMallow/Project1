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
const db_1 = __importDefault(require("./db"));
function expenseRoutes(server) {
    return __awaiter(this, void 0, void 0, function* () {
        // Utility function สำหรับตรวจสอบ limit
        const validateLimit = (limit) => {
            const allowedLimits = [10, 20, 50, 100];
            const requestedLimit = limit || 10;
            return allowedLimits.includes(requestedLimit) ? requestedLimit : 10;
        };
        // Get expenses with pagination
        server.get("/expenses", (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year, type, category, accountType, startDate, endDate, page = 1, limit, } = req.query;
                // Validate pagination parameters
                const validatedLimit = validateLimit(limit);
                const offset = (page - 1) * validatedLimit;
                // Build base query
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
                const totalResult = yield db_1.default.query(countQuery, params);
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
                const result = yield db_1.default.query(dataQuery, finalParams);
                // Calculate pagination metadata
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
        // Get categories with pagination
        server.get("/categories", (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit } = req.query;
                const validatedLimit = validateLimit(limit);
                const offset = (page - 1) * validatedLimit;
                // Get total count
                const totalResult = yield db_1.default.query("SELECT COUNT(*) FROM categories");
                const total = parseInt(totalResult.rows[0].count);
                // Get paginated data
                const result = yield db_1.default.query("SELECT * FROM categories ORDER BY type, name LIMIT $1 OFFSET $2", [validatedLimit, offset]);
                // Calculate pagination metadata
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
        // ... other routes remain the same ...
    });
}
