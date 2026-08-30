import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { routes } from './routes/index.js'; // Importa o agrupador de rotas
import multer from 'multer';
import path from 'path';
import fs from 'fs';


const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Registra as rotas de /users sob o prefixo /api
app.use('/api', routes);

// -------------------------------------------------------------
// Rotas diretas de Pilotos (http://localhost:3000/api/pilotos)
// -------------------------------------------------------------

// GET: Listar todos os pilotos
app.get('/api/pilotos', async (req, res) => {
  try {
    const pilotos = await prisma.piloto.findMany();
    return res.json(pilotos);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pilotos' });
  }
});

// GET: Buscar piloto por CPF
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

// -------------------------------------------------------------
// Rotas diretas de Funcionários (http://localhost:3000/api/funcionarios)
// -------------------------------------------------------------

// GET: Listar todos os funcionários
app.get('/api/funcionarios', async (req, res) => {
  try {
    const funcionarios = await prisma.funcionario.findMany();
    return res.json(funcionarios);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar funcionários' });
  }
});

// GET: Buscar funcionário por CPF
app.get('/api/funcionarios/:cpf', async (req, res) => {
  const { cpf } = req.params;
  try {
    const funcionario = await prisma.funcionario.findUnique({
      where: { cpf },
    });
    if (!funcionario) return res.status(404).json({ error: 'Funcionário não encontrado' });
    return res.json(funcionario);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar funcionário' });
  }
});

// POST: Cadastrar/Salvar funcionário (insere ou atualiza)
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

// DELETE: Excluir funcionário
app.delete('/api/funcionarios/:cpf', async (req, res) => {
  const { cpf } = req.params;

  try {
    await prisma.funcionario.delete({
      where: { cpf },
    });
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao deletar funcionário' });
  }
});


app.post('/api/campeonatos', async (req, res) => {
  try {
    const { nome, voltas, fotoPista1, fotoPista2, fotoPista3, fotoPista4 } = req.body;

    const campeonato = await prisma.campeonato.upsert({
      where: { nome },
      update: { voltas: Number(voltas), fotoPista1, fotoPista2, fotoPista3, fotoPista4 },
      create: { nome, voltas: Number(voltas), fotoPista1, fotoPista2, fotoPista3, fotoPista4 },
    });

    res.json(campeonato);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao salvar campeonato' });
  }
});
// GET: Buscar todos os campeonatos
app.get('/api/campeonatos', async (req, res) => {
  try {
    const campeonatos = await prisma.campeonato.findMany();
    res.json(campeonatos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar campeonatos' });
  }
});

// GET: Buscar um campeonato por nome (para preenchimento/consulta)
app.get('/api/campeonatos/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    const campeonato = await prisma.campeonato.findUnique({
      where: { nome },
    });

    if (!campeonato) {
      return res.status(404).json({ error: 'Campeonato não encontrado' });
    }

    res.json(campeonato);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar campeonato' });
  }
});


// Garante que a pasta de destino exista
const uploadDir = path.join(__dirname, 'uploads', 'pistas');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do armazenamento do Multer
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

// Torna a pasta "uploads" acessível via URL (ex: http://localhost:3000/uploads/pistas/...)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota POST com upload de até 4 arquivos
app.post('/api/campeonatos', upload.fields([
  { name: 'fotoPista1', maxCount: 1 },
  { name: 'fotoPista2', maxCount: 1 },
  { name: 'fotoPista3', maxCount: 1 },
  { name: 'fotoPista4', maxCount: 1 },
]), async (req: any, res: any) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { nome, voltas } = req.body;

    const fotoPista1 = files['fotoPista1']?.[0] ? `/uploads/pistas/${files['fotoPista1'][0].filename}` : null;
    const fotoPista2 = files['fotoPista2']?.[0] ? `/uploads/pistas/${files['fotoPista2'][0].filename}` : null;
    const fotoPista3 = files['fotoPista3']?.[0] ? `/uploads/pistas/${files['fotoPista3'][0].filename}` : null;
    const fotoPista4 = files['fotoPista4']?.[0] ? `/uploads/pistas/${files['fotoPista4'][0].filename}` : null;

    const campeonato = await prisma.campeonato.upsert({
      where: { nome },
      update: { voltas: Number(voltas), fotoPista1, fotoPista2, fotoPista3, fotoPista4 },
      create: { nome, voltas: Number(voltas), fotoPista1, fotoPista2, fotoPista3, fotoPista4 },
    });

    res.json(campeonato);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao salvar campeonato e imagens.' });
  }
});



// Inicialização da API
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Node.js rodando em http://localhost:${PORT}`);
});