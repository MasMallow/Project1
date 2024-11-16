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
// server.ts - API Server
const fastify_1 = __importDefault(require("fastify"));
const crypto_1 = __importDefault(require("crypto"));
const RoutesApi_1 = __importDefault(require("./RoutesDB/RoutesApi")); // นำเข้าไฟล์ routes
const server = (0, fastify_1.default)({
    logger: true
});
server.register(RoutesApi_1.default);
server.register(require('@fastify/formbody'));
server.register(require('@fastify/cors'));
// Authentication setup (จากโค้ดเดิม)
const session = {};
// Authentication routes (จากโค้ดเดิม)
server.post("/login", {
    schema: {
        body: {
            type: 'object',
            properties: {
                username: { type: 'string' },
                password: { type: 'string' }
            },
            required: ['username', 'password']
        }
    }
}, (req, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    if (username === "admin" && password === "password123") {
        const token = crypto_1.default.randomBytes(16).toString("hex");
        session[token] = username;
        reply.send({ token });
    }
    else {
        reply.status(401).send({ message: "Invalid username or password" });
    }
}));
// Authentication middleware
server.addHook("preHandler", (req, reply, done) => {
    if (req.url === '/login') {
        done();
        return;
    }
    const token = req.headers['authorization'];
    if (token && session[token]) {
        done();
    }
    else {
        reply.status(401).send({ message: 'Unauthorized' });
    }
});
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield server.listen({ port: 3000, host: '0.0.0.0' });
        console.log("Server is running on port 3000");
    }
    catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
});
start();
