// server.ts
import fastify, { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import expenseRoutes from './RoutesDB/RoutesApi';
import authRoutes from './RoutesDB/auth';
import fastifyPostgres from '@fastify/postgres';

// Define session type
interface Session {
    [key: string]: {
        username: string;
        timestamp: number;
    }
}

// Initialize session storage
const session: Session = {};

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

const server = fastify({
    logger: true
});

// Register plugins
server.register(require('@fastify/formbody'));
server.register(require('@fastify/cors'));

// Register PostgreSQL
server.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/database_name'
});

// Make session available to routes
declare module 'fastify' {
    interface FastifyInstance {
        session: Session;
    }
}

// Decorator to add session to fastify instance
server.decorate('session', session);

// Register routes
server.register(authRoutes);
server.register(expenseRoutes);

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
    } else {
        reply.status(401).send({ message: 'Unauthorized' });
    }
});

const start = async () => {
    try {
        await server.listen({ port: 3000, host: '0.0.0.0' });
        console.log("Server is running on port 3000");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

start();