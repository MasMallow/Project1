"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const db_1 = __importDefault(require("./db"));
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const promises_2 = require("stream/promises");
function expenseRoutes(server) {
    return __awaiter(this, void 0, void 0, function* () {
        // File upload setup
        yield server.register(Promise.resolve().then(() => __importStar(require('@fastify/multipart'))), {
            limits: {
                fieldSize: 1000000, // 1MB
                fields: 10,
                fileSize: 5000000, // 5MB
                files: 1,
            },
        });
        // 1. Create expense with file upload
        server.post('/expenses', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            try {
                const data = yield req.file();
                if (!data) {
                    reply.status(400).send({ message: 'No file or form data provided' });
                    return;
                }
                let receiptPath = null;
                // Parse form data
                const fields = data.fields;
                const body = {
                    title: (_a = fields.title) === null || _a === void 0 ? void 0 : _a.value,
                    amount: parseFloat((_b = fields.amount) === null || _b === void 0 ? void 0 : _b.value),
                    type: (_c = fields.type) === null || _c === void 0 ? void 0 : _c.value,
                    category: (_d = fields.category) === null || _d === void 0 ? void 0 : _d.value,
                    description: (_e = fields.description) === null || _e === void 0 ? void 0 : _e.value,
                    note: (_f = fields.note) === null || _f === void 0 ? void 0 : _f.value,
                    accountType: (_g = fields.accountType) === null || _g === void 0 ? void 0 : _g.value,
                };
                // Validate required fields
                if (!body.title || !body.amount || !body.type || !body.category) {
                    reply.status(400).send({ message: 'Missing required fields' });
                    return;
                }
                // Check for profanity
                const filter = new profanityFilter_1.ProfanityFilter();
                if (filter.containsProfanity(body.title) ||
                    filter.containsProfanity(body.description || '') ||
                    filter.containsProfanity(body.note || '')) {
                    reply.status(400).send({ message: 'Content contains inappropriate language' });
                    return;
                }
                // Handle file upload
                if (data.file) {
                    const filename = `${(0, crypto_1.randomUUID)()}${path_1.default.extname(data.filename)}`;
                    const uploadDir = path_1.default.join(__dirname, '../../uploads');
                    yield promises_1.default.mkdir(uploadDir, { recursive: true });
                    const filepath = path_1.default.join(uploadDir, filename);
                    yield (0, promises_2.pipeline)(data.file, (0, fs_1.createWriteStream)(filepath));
                    receiptPath = `/uploads/${filename}`;
                }
                // Insert to database
                const result = yield db_1.default.query(`INSERT INTO expenses (
                    title, amount, type, category, description, note, 
                    receipt_path, account_type, date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
                RETURNING *`, [
                    body.title, body.amount, body.type, body.category,
                    body.description, body.note, receiptPath, body.accountType
                ]);
                reply.send(result.rows[0]);
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // 2. Get expenses with filters
        server.get('/expenses', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year, type, category, accountType, startDate, endDate } = req.query;
                let query = 'SELECT * FROM expenses WHERE 1=1';
                const params = [];
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
                const result = yield db_1.default.query(query, params);
                reply.send(result.rows);
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // 3. Category Management
        server.get('/categories', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM categories ORDER BY type, name');
                reply.send(result.rows);
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        server.post('/categories', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, type } = req.body;
                const filter = new profanityFilter_1.ProfanityFilter();
                if (filter.containsProfanity(name)) {
                    reply.status(400).send({ message: 'Category name contains inappropriate language' });
                    return;
                }
                const result = yield db_1.default.query('INSERT INTO categories (name, type) VALUES ($1, $2) RETURNING *', [name, type]);
                reply.send(result.rows[0]);
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        server.delete('/categories/:id', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('DELETE FROM categories WHERE id = $1 RETURNING *', [req.params.id]);
                if (result.rows.length === 0) {
                    reply.status(404).send({ message: 'Category not found' });
                    return;
                }
                reply.send({ message: 'Category deleted successfully' });
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        // 4. Profanity Management
        server.post('/profanity', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield profanityFilter_1.ProfanityFilter.addWord(req.body.word);
                reply.send({ message: 'Word added successfully' });
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
        server.delete('/profanity/:word', (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield profanityFilter_1.ProfanityFilter.removeWord(req.params.word);
                reply.send({ message: 'Word removed successfully' });
            }
            catch (err) {
                reply.status(500).send(err);
            }
        }));
    });
}
