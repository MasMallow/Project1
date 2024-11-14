import Fastify from 'fastify';
import { createConnection } from 'typeorm';
import userRoutes from './routes/userRoutes';

export const app = Fastify();

// เชื่อมต่อกับฐานข้อมูล
createConnection().then(() => {
  console.log('Database connected');
}).catch((error) => console.error('Database connection failed:', error));

// โหลดเส้นทาง
app.register(userRoutes);
