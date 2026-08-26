import { Router } from 'express';
import { userRoutes } from '../routes/userRoutes.js';

const routes = Router();

routes.use('/users', userRoutes); // prefixo /users

export { routes };