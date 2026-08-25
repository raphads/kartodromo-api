import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// GET: Listar todos os pilotos
app.get('/api/pilotos', async (req, res) => {
  try {
    const pilotos = await prisma.piloto.findMany();
    return res.json(pilotos);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pilotos' });
  }
});

// GET: Buscar piloto por CPF (Totalmente seguro contra SQL Injection)
app.get('/api/pilotos/:cpf', async (req, res) => {
  const { cpf } = req.params;
  try {
    const piloto = await prisma.piloto.findUnique({
      where: { cpf },
    });
    if (!piloto) return res.status(404).json({ error: 'Piloto não encontrado' });
    return res.json(piloto);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar piloto' });
  }
});

// POST: Cadastrar/Salvar piloto
app.post('/api/pilotos', async (req, res) => {
  const { cpf, nome, dataNasc, equipe, idade, numero, foto } = req.body;

  try {
    const novoPiloto = await prisma.piloto.upsert({
      where: { cpf },
      update: {
        nome,
        dataNasc: new Date(dataNasc),
        equipe,
        idade: Number(idade),
        numero: Number(numero),
        foto,
      },
      create: {
        cpf,
        nome,
        dataNasc: new Date(dataNasc),
        equipe,
        idade: Number(idade),
        numero: Number(numero),
        foto,
      },
    });

    return res.status(201).json(novoPiloto);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao salvar piloto' });
  }
});

// DELETE: Excluir piloto
app.delete('/api/pilotos/:cpf', async (req, res) => {
  const { cpf } = req.params;

  try {
    await prisma.piloto.delete({
      where: { cpf },
    });
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao deletar piloto' });
  }
});

// Inicialização da API
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Node.js rodando em http://localhost:${PORT}`);
});