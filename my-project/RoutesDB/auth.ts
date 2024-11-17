// auth.ts
import { FastifyInstance } from 'fastify';
import { compare, hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';

const loginSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(6)
});

export default async function authRoutes(fastify: FastifyInstance) {
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
    }, async (request, reply) => {
        const { username, password } = loginSchema.parse(request.body);

        const user = await fastify.pg.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (!user.rows[0]) {
            reply.code(401).send({ message: 'Invalid credentials' });
            return;
        }

        const validPassword = await compare(password, user.rows[0].password);
        if (!validPassword) {
            reply.code(401).send({ message: 'Invalid credentials' });
            return;
        }

        // Generate token and store in session
        const token = crypto.randomBytes(16).toString('hex');
        fastify.session[token] = {
            username: user.rows[0].username,
            timestamp: Date.now()
        };

        reply.send({ token });
    });

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
    }, async (request, reply) => {
        const { username, password } = loginSchema.parse(request.body);

        const existingUser = await fastify.pg.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        if (existingUser.rows[0]) {
            reply.code(400).send({ message: 'Username already exists' });
            return;
        }

        const hashedPassword = await hash(password, 10);
        const result = await fastify.pg.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        );

        reply.code(201).send({ 
            message: 'User created successfully',
            id: result.rows[0].id 
        });
    });
}