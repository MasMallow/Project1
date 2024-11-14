import fastify, { FastifyInstance, FastifyListenOptions } from 'fastify';
import fastifySession from '@fastify/session';  // เปลี่ยนเป็น @fastify/session
import fastifyCookie from '@fastify/cookie';    // เปลี่ยนเป็น @fastify/cookie
import userRoutes from './routes/userRoutes';
import homeRoute from './routes/homeRoute';
import dotenv from 'dotenv';

dotenv.config();
const app: FastifyInstance = fastify();

// ระบุพอร์ตและโฮสต์
const PORT = process.env.PORT || 3000;

// สร้าง session store
const store = new Map();

// กำหนดการใช้งาน session
app.register(fastifyCookie);  // ต้องลงทะเบียน cookie ก่อน
app.register(fastifySession, {
  secret: process.env.SESSION_SECRET || 'a-secret-key-that-should-be-at-least-32-characters', 
  cookie: { 
    secure: false,  // ตั้งค่าเป็น true ใน production ที่ใช้ HTTPS
  },
  // กำหนด session store
  store: {
    get: async (sessionId: string) => {
      return store.get(sessionId);
    },
    set: async (sessionId: string, session: any) => {
      store.set(sessionId, session);
    },
    destroy: async (sessionId: string) => {
      store.delete(sessionId);
    }
  }
});

app.register(homeRoute);
app.register(userRoutes);

const start = async () => {
  try {
    const listenOptions: FastifyListenOptions = {
      port: Number(PORT),
      host: '0.0.0.0',
    };

    await app.listen(listenOptions);
    console.log(`Server is running at http://localhost:${PORT}`);
  } catch (err: any) {
    console.error(err);
    process.exit(1);
  }
};

start();