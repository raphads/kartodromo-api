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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
// 1. CADASTRAR CAMPEONATO (POST)
app.post('/api/campeonatos', async (req, res) => {
  try {
    const { nome, voltas, data, fotoPista1, fotoPista2, fotoPista3, fotoPista4 } = req.body;

    const novoCampeonato = await prisma.campeonato.create({
      data: {
        nome,
        voltas: Number(voltas),
        // Converte a string 'YYYY-MM-DD' recebida do HTML para DateTime do Prisma
        data: new Date(data),
        fotoPista1,
        fotoPista2,
        fotoPista3,
        fotoPista4
      }
    });

    res.status(201).json(novoCampeonato);
  } catch (error) {
    console.error('Erro ao cadastrar campeonato:', error);
    res.status(400).json({ error: 'Erro ao cadastrar campeonato. Nome pode já existir.' });
  }
});

// 2. LISTAR CAMPEONATOS (GET)
app.get('/api/campeonatos', async (req, res) => {
  try {
    const campeonatos = await prisma.campeonato.findMany({
      orderBy: { data: 'desc' } // Traz os campeonatos mais recentes primeiro
    });
    res.json(campeonatos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar campeonatos' });
  }
});

// Rota PUT para atualizar dados e imagens de um campeonato
app.put('/api/campeonatos/:nome', upload.fields([
  { name: 'fotoPista1', maxCount: 1 },
  { name: 'fotoPista2', maxCount: 1 },
  { name: 'fotoPista3', maxCount: 1 },
  { name: 'fotoPista4', maxCount: 1 },
]), async (req: any, res: any) => {
  try {
    const { nome: nomeParam } = req.params;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const { voltas, fotoPista1: bodyPista1, fotoPista2: bodyPista2, fotoPista3: bodyPista3, fotoPista4: bodyPista4 } = req.body;

    // Busca o cadastro atual para manter as fotos anteriores caso não suba arquivo novo
    const atual = await prisma.campeonato.findUnique({ where: { nome: nomeParam } });
    if (!atual) return res.status(404).json({ error: 'Campeonato não encontrado' });

    const resolverImagem = (file?: Express.Multer.File, bodyVal?: string, imgAntiga?: string | null) => {
      if (file) return `/uploads/pistas/${file.filename}`.replace(/\\/g, '/');
      if (bodyVal) return bodyVal.replace(/\\/g, '/');
      return imgAntiga || null;
    };

    const fotoPista1 = resolverImagem(files?.['fotoPista1']?.[0], bodyPista1, atual.fotoPista1);
    const fotoPista2 = resolverImagem(files?.['fotoPista2']?.[0], bodyPista2, atual.fotoPista2);
    const fotoPista3 = resolverImagem(files?.['fotoPista3']?.[0], bodyPista3, atual.fotoPista3);
    const fotoPista4 = resolverImagem(files?.['fotoPista4']?.[0], bodyPista4, atual.fotoPista4);

    const campeonatoAtualizado = await prisma.campeonato.update({
      where: { nome: nomeParam },
      data: {
        voltas: Number(voltas),
        fotoPista1,
        fotoPista2,
        fotoPista3,
        fotoPista4,
      },
    });

    return res.json(campeonatoAtualizado);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao atualizar campeonato' });
  }
});

// Rota para cadastro de novos usuários
app.post('/api/usuarios', async (req: any, res: any) => {
  try {
    const { usuario, email, senha } = req.body;

    if (!usuario || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verifica se usuário ou e-mail já foram cadastrados
    const existente = await prisma.usuario.findFirst({
      where: {
        OR: [{ usuario }, { email }]
      }
    });

    if (existente) {
      return res.status(400).json({ error: 'Nome de usuário ou e-mail já em uso' });
    }

    // Cria o novo registro no banco de dados
    const novoUsuario = await prisma.usuario.create({
      data: {
        usuario,
        email,
        senha // Dica: Em produção, use o pacote 'bcrypt' para criptografar a senha antes de salvar
      }
    });

    return res.status(201).json(novoUsuario);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// Rota de Login / Autenticação
app.post('/api/login', async (req: any, res: any) => {
  try {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    // Busca o usuário pelo nome cadastrado
    const userFound = await prisma.usuario.findFirst({
      where: { usuario }
    });

    // Se o usuário não existir ou a senha estiver incorreta
    if (!userFound || userFound.senha !== senha) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    // Retorna os dados do usuário autenticado (omitindo a senha por segurança)
    const { senha: _, ...usuarioSemSenha } = userFound;

    return res.json({
      message: 'Autenticado com sucesso',
      usuario: usuarioSemSenha
    });

  } catch (error) {
    console.error('ERRO DETALHADO NO SERVIDOR:', error);
    
    return res.status(500).json({ error: 'Erro interno ao processar o login' });
  }
});

// -------------------------------------------------------------
// Inicialização da API
// -------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Node.js rodando em http://localhost:${PORT}`);
});