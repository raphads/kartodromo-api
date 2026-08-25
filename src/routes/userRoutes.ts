import { Router } from 'express';
import { UserController } from '../controllers/UserController';

const userRoutes = Router();

userRoutes.get('/', UserController.list);
userRoutes.post('/', UserController.create);

export { userRoutes };