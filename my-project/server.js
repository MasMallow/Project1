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
// server.ts
const fastify_1 = __importDefault(require("fastify"));
const RoutesApi_1 = __importDefault(require("./RoutesDB/RoutesApi"));
const auth_1 = __importDefault(require("./RoutesDB/auth"));
const postgres_1 = __importDefault(require("@fastify/postgres"));
// Initialize session storage
const session = {};
// Create cleanup function for expired sessions
const cleanupSessions = () => {
    const now = Date.now();
    Object.entries(session).forEach(([token, data]) => {
        // Remove sessions older than 24 hours
        if (now - data.timestamp > 24 * 60 * 60 * 1000) {
            delete session[token];
        }
    });
};
// Run cleanup every hour
setInterval(cleanupSessions, 60 * 60 * 1000);
const server = (0, fastify_1.default)({
    logger: true
});
// Register plugins
server.register(require('@fastify/formbody'));
server.register(require('@fastify/cors'));
// Register PostgreSQL
server.register(postgres_1.default, {
    connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/database_name'
});
// Decorator to add session to fastify instance
server.decorate('session', session);
// Register routes
server.register(auth_1.default);
server.register(RoutesApi_1.default);
// Authentication middleware
server.addHook("preHandler", (req, reply, done) => {
    if (req.url === '/login' || req.url === '/register') {
        done();
        return;
    }
    const token = req.headers['authorization'];
    if (token && session[token]) {
        // Update timestamp on successful authentication
        session[token].timestamp = Date.now();
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
