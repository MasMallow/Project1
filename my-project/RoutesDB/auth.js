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
exports.default = authRoutes;
const bcrypt_1 = require("bcrypt");
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50),
    password: zod_1.z.string().min(6)
});
function authRoutes(fastify) {
    return __awaiter(this, void 0, void 0, function* () {
        // Login
        fastify.post('/login', {
            schema: {
                body: {
                    type: 'object',
                    required: ['username', 'password'],
                    properties: {
                        username: { type: 'string', minLength: 3, maxLength: 50 },
                        password: { type: 'string', minLength: 6 }
                    }
                }
            }
        }, (request, reply) => __awaiter(this, void 0, void 0, function* () {
            const { username, password } = loginSchema.parse(request.body);
            const user = yield fastify.pg.query('SELECT * FROM users WHERE username = $1', [username]);
            if (!user.rows[0]) {
                reply.code(401).send({ message: 'Invalid credentials' });
                return;
            }
            const validPassword = yield (0, bcrypt_1.compare)(password, user.rows[0].password);
            if (!validPassword) {
                reply.code(401).send({ message: 'Invalid credentials' });
                return;
            }
            // Generate token and store in session
            const token = crypto_1.default.randomBytes(16).toString('hex');
            fastify.session[token] = {
                username: user.rows[0].username,
                timestamp: Date.now()
            };
            reply.send({ token });
        }));
        // Register
        fastify.post('/register', {
            schema: {
                body: {
                    type: 'object',
                    required: ['username', 'password'],
                    properties: {
                        username: { type: 'string', minLength: 3, maxLength: 50 },
                        password: { type: 'string', minLength: 6 }
                    }
                }
            }
        }, (request, reply) => __awaiter(this, void 0, void 0, function* () {
            const { username, password } = loginSchema.parse(request.body);
            const existingUser = yield fastify.pg.query('SELECT id FROM users WHERE username = $1', [username]);
            if (existingUser.rows[0]) {
                reply.code(400).send({ message: 'Username already exists' });
                return;
            }
            const hashedPassword = yield (0, bcrypt_1.hash)(password, 10);
            const result = yield fastify.pg.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, hashedPassword]);
            reply.code(201).send({
                message: 'User created successfully',
                id: result.rows[0].id
            });
        }));
    });
}
