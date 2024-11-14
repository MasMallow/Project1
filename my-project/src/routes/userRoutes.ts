import { FastifyInstance } from 'fastify';

declare module '@fastify/session' {
  interface FastifySessionObject {
    user?: string;
    isAuthenticated?: boolean;
  }
}

interface LoginBody {
  username: string;
  password: string;
}

export default async function userRoutes(app: FastifyInstance) {
  // Middleware สำหรับตรวจสอบการ authentication
  const authenticateUser = async (request: any, reply: any) => {
    if (!request.session.isAuthenticated) {
      reply.status(401).send({ message: 'Not authenticated' });
      return false;
    }
    return true;
  };

  // Route สำหรับการล็อกอิน
  app.post<{ Body: LoginBody }>('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const { username, password } = request.body;

    try {
      if (username === 'admin' && password === 'password') {
        // TypeScript จะรู้จัก property เหล่านี้แล้ว
        request.session.user = username;
        request.session.isAuthenticated = true;
        
        reply.send({ 
          success: true,
          message: 'Login successful'
        });
      } else {
        reply.status(401).send({ 
          success: false,
          message: 'Invalid credentials' 
        });
      }
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ 
        success: false,
        message: 'Internal server error' 
      });
    }
  });

  // Route อื่นๆ คงเดิม...
}