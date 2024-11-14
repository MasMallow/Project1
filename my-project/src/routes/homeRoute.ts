import { FastifyInstance } from 'fastify';

export default async function homeRoute(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    return { message: 'Home Page' };
  });
}
