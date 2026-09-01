import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { routes } from './routes/index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolvendo __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Registra as rotas de /users sob o prefixo /api
app.use('/api', routes);

// -------------------------------------------------------------
// Configuração do Multer e Arquivos Estáticos
// -------------------------------------------------------------
const uploadDir = path.join(__dirname, 'uploads', 'pistas');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const nomeUnico = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, nomeUnico + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -------------------------------------------------------------
// Rotas de Pilotos
// -------------------------------------------------------------
app.get('/api/pilotos', async (req, res) => {
  try {
    const pilotos = await prisma.piloto.findMany();
    return res.json(pilotos);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pilotos' });
  }
});

app.get('/api/pilotos/:cpf', async (req, res) => {
  const { cpf } = req.params;
  try {
    const piloto = await prisma.piloto.findUnique({ where: { cpf } });
    if (!piloto) return res.status(404).json({ error: 'Piloto não encontrado' });
    return res.json(piloto);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar piloto' });
  }
});

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

app.delete('/api/pilotos/:cpf', async (req, res) => {
  const { cpf } = req.params;
  try {
    await prisma.piloto.delete({ where: { cpf } });
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao deletar piloto' });
  }
});

// -------------------------------------------------------------
// Rotas de Funcionários
// -------------------------------------------------------------
app.get('/api/funcionarios', async (req, res) => {
  try {
    const funcionarios = await prisma.funcionario.findMany();
    return res.json(funcionarios);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar funcionários' });
  }
});

app.get('/api/funcionarios/:cpf', async (req, res) => {
  const { cpf } = req.params;
  try {
    const funcionario = await prisma.funcionario.findUnique({ where: { cpf } });
    if (!funcionario) return res.status(404).json({ error: 'Funcionário não encontrado' });
    return res.json(funcionario);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar funcionário' });
  }
});

app.post('/api/funcionarios', async (req, res) => {
  const { cpf, nome, cargo, dataNasc, salario, email, foto } = req.body;
  try {
    const novoFuncionario = await prisma.funcionario.upsert({
      where: { cpf },
      update: {
        nome,
        cargo,
        dataNasc: new Date(dataNasc),
        salario: Number(salario),
        email,
        foto,
      },
      create: {
        cpf,
        nome,
        cargo,
        dataNasc: new Date(dataNasc),
        salario: Number(salario),
        email,
        foto,
      },
    });
    return res.status(201).json(novoFuncionario);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao salvar funcionário' });
  }
});

app.delete('/api/funcionarios/:cpf', async (req, res) => {
  const { cpf } = req.params;
  try {
    await prisma.funcionario.delete({ where: { cpf } });
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao deletar funcionário' });
  }
});

// -------------------------------------------------------------
// Rotas de Campeonatos (Unificada para Upload e JSON)
// -------------------------------------------------------------
app.get('/api/campeonatos', async (req, res) => {
  try {
    const campeonatos = await prisma.campeonato.findMany();
    return res.json(campeonatos);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar campeonatos' });
  }
});

app.get('/api/campeonatos/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    const campeonato = await prisma.campeonato.findUnique({ where: { nome } });
    if (!campeonato) return res.status(404).json({ error: 'Campeonato não encontrado' });
    return res.json(campeonato);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar campeonato' });
  }
});

// Rota POST híbrida: aceita upload multipart (HTML) ou JSON com strings de caminho (VB.NET)
app.post('/api/campeonatos', upload.fields([
  { name: 'fotoPista1', maxCount: 1 },
  { name: 'fotoPista2', maxCount: 1 },
  { name: 'fotoPista3', maxCount: 1 },
  { name: 'fotoPista4', maxCount: 1 },
]), async (req: any, res: any) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const { nome, voltas, fotoPista1: bodyPista1, fotoPista2: bodyPista2, fotoPista3: bodyPista3, fotoPista4: bodyPista4 } = req.body;

    // Prioriza o arquivo enviado por upload; se não houver, usa a string enviada no body
    const fotoPista1 = files?.['fotoPista1']?.[0] ? `/uploads/pistas/${files['fotoPista1'][0].filename}` : (bodyPista1 || null);
    const fotoPista2 = files?.['fotoPista2']?.[0] ? `/uploads/pistas/${files['fotoPista2'][0].filename}` : (bodyPista2 || null);
    const fotoPista3 = files?.['fotoPista3']?.[0] ? `/uploads/pistas/${files['fotoPista3'][0].filename}` : (bodyPista3 || null);
    const fotoPista4 = files?.['fotoPista4']?.[0] ? `/uploads/pistas/${files['fotoPista4'][0].filename}` : (bodyPista4 || null);

    const campeonato = await prisma.campeonato.upsert({
      where: { nome },
      update: { voltas: Number(voltas), fotoPista1, fotoPista2, fotoPista3, fotoPista4 },
      create: { nome, voltas: Number(voltas), fotoPista1, fotoPista2, fotoPista3, fotoPista4 },
    });

    return res.json(campeonato);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao salvar campeonato' });
  }
});

// -------------------------------------------------------------
// Inicialização da API
// -------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Node.js rodando em http://localhost:${PORT}`);
});