// types.ts - สำหรับกำหนด TypeScript interfaces
export interface Expense {
    id: number;
    title: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    date: Date;
    description?: string;
}

// server.ts - API Server
import fastify, { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import expenseRoutes from './RoutesDB/RoutesApi'; // นำเข้าไฟล์ routes

const server = fastify({
    logger: true
});

server.register(expenseRoutes);
server.register(require('@fastify/formbody'));
server.register(require('@fastify/cors'));

// Authentication setup (จากโค้ดเดิม)
const session: { [key: string]: string } = {};

interface LoginBody {
    username: string;
    password: string;
}

// Authentication routes (จากโค้ดเดิม)
server.post<{ Body: LoginBody }>("/login", {
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
}, async (req, reply) => {
    const { username, password } = req.body;

    if (username === "admin" && password === "password123") {
        const token = crypto.randomBytes(16).toString("hex");
        session[token] = username;
        reply.send({ token });
    } else {
        reply.status(401).send({ message: "Invalid username or password" });
    }
});


// Authentication middleware
server.addHook("preHandler", (req, reply, done) => {
    if (req.url === '/login') {
        done();
        return;
    }

    const token = req.headers['authorization'];
    if (token && session[token as string]) {
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