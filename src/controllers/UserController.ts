import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export class UserController {
  static async list(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany();
      return res.json(users);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name, email } = req.body;
      const user = await prisma.user.create({ data: { name, email } });
      return res.status(201).json(user);
    } catch (error) {
      return res.status(400).json({ error: 'Erro ao criar usuário' });
    }
  }
}