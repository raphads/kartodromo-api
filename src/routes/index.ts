import { Router } from 'express';
import { userRoutes } from './userRoutes.js';

const routes = Router();

routes.use('/users', userRoutes); // prefixo /users -> /api/users

export { routes };