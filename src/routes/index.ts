import { Router } from 'express';
import { userRoutes } from './userRoutes';

const routes = Router();

routes.use('/users', userRoutes); // prefixo /users

export { routes };