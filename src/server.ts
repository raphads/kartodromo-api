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
  const { 
    cpf, nome, cargo, dataNasc, dataAdmissao, salario, email, foto,
    cep, logradouro, numero, bairro, cidade, uf 
  } = req.body;

  // Conversão e validação da data de nascimento
  const dataNascValida = new Date(dataNasc);
  if (!dataNasc || isNaN(dataNascValida.getTime())) {
    return res.status(400).json({ error: 'Data de nascimento inválida ou não informada.' });
  }

  // Tratamento da data de admissão (opcional)
  const dataAdmissaoValida = dataAdmissao ? new Date(dataAdmissao) : null;

  try {
    const novoFuncionario = await prisma.funcionario.upsert({
      where: { cpf },
      update: {
        nome,
        cargo,
        dataNasc: dataNascValida,
        dataAdmissao: dataAdmissaoValida, // 👈 Atualizado
        salario: Number(salario),
        email,
        foto,
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
      },
      create: {
        cpf,
        nome,
        cargo,
        dataNasc: dataNascValida,
        dataAdmissao: dataAdmissaoValida, // 👈 Criado
        salario: Number(salario),
        email,
        foto,
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
      },
    });
    return res.status(201).json(novoFuncionario);
  } catch (error) {
    console.error('Erro ao salvar funcionário:', error);
    return res.status(400).json({ error: 'Erro ao salvar funcionário no banco de dados.' });
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
      orderBy: {
        id: 'asc' // 'asc' para ordem crescente (1, 2, 3...) ou 'desc' para decrescente
      }
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

// 4. EXCLUIR CAMPEONATO (DELETE)
app.delete('/api/campeonatos/:identificador', async (req, res) => {
  try {
    const identificador = decodeURIComponent(req.params.identificador);
    const idNumerico = Number(identificador);

    const whereClause =
      Number.isInteger(idNumerico) && String(idNumerico) === identificador
        ? { id: idNumerico }
        : { nome: identificador };

    await prisma.campeonato.delete({
      where: whereClause,
    });

    return res.status(204).send();
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Campeonato não encontrado' });
    }
    console.error('Erro ao excluir campeonato:', error);
    return res.status(400).json({ error: 'Erro ao excluir campeonato' });
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



// GET /api/historico -> Listar histórico
app.get('/api/historico', async (req, res) => {
  try {
    const historico = await prisma.historico.findMany({
      orderBy: { id: 'desc' }
    });
    return res.json(historico);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// POST /api/historico -> Gravar corrida no histórico buscando voltas e fotos automaticamente
app.post('/api/historico', async (req, res) => {
  try {
    const { nomeCampeonato, nomePrimeiro, nomeSegundo, nomeTerceiro } = req.body;

    if (!nomeCampeonato || !nomePrimeiro || !nomeSegundo || !nomeTerceiro) {
      return res.status(400).json({ error: 'Todos os campos do pódio são obrigatórios.' });
    }

    // 1. Busca os dados do campeonato para obter número de voltas e fotos das pistas
    const campeonato = await prisma.campeonato.findUnique({
      where: { nome: nomeCampeonato }
    });

    if (!campeonato) {
      return res.status(404).json({ error: 'Campeonato não encontrado.' });
    }

    // 2. Busca os dados dos pilotos selecionados para salvar as fotos no histórico
    const [piloto1, piloto2, piloto3] = await Promise.all([
      prisma.piloto.findFirst({ where: { nome: nomePrimeiro } }),
      prisma.piloto.findFirst({ where: { nome: nomeSegundo } }),
      prisma.piloto.findFirst({ where: { nome: nomeTerceiro } })
    ]);

    // 3. Salva a corrida completa na tabela tb_historico
    const novoRegistro = await prisma.historico.create({
      data: {
        nomeCampeonato: campeonato.nome,
        numeroVoltas: campeonato.voltas,
        nomePrimeiro,
        fotoPrimeiro: piloto1?.foto || null,
        nomeSegundo,
        fotoSegundo: piloto2?.foto || null,
        nomeTerceiro,
        fotoTerceiro: piloto3?.foto || null,
        pista1: campeonato.fotoPista1,
        pista2: campeonato.fotoPista2,
        pista3: campeonato.fotoPista3,
        pista4: campeonato.fotoPista4,
      }
    });

    return res.status(201).json(novoRegistro);
  } catch (error) {
    console.error('Erro ao salvar histórico:', error);
    return res.status(500).json({ error: 'Erro ao salvar pódio no banco de dados.' });
  }
});



// -------------------------------------------------------------
// Rotas do Chat Comunitário (Mural Persistente)
// -------------------------------------------------------------
app.get('/api/chat', async (req, res) => {
  try {
    const mensagens = await prisma.mensagem.findMany({
      orderBy: { id: 'asc' },
      take: 50
    });
    return res.json(mensagens);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return res.status(500).json({ error: 'Erro ao carregar mensagens.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const usuarioId = Number(req.body?.usuarioId);
    const texto = (req.body?.texto || '').trim().slice(0, 500);

    if (!usuarioId) {
      return res.status(401).json({ error: 'Faça login para enviar mensagens no chat.' });
    }

    if (!texto) {
      return res.status(400).json({ error: 'A mensagem não pode estar vazia.' });
    }

    const userFound = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, usuario: true }
    });

    if (!userFound) {
      return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
    }

    const novaMensagem = await prisma.mensagem.create({
      data: {
        autor: userFound.usuario,
        texto
      }
    });

    return res.status(201).json(novaMensagem);
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error);
    return res.status(500).json({ error: 'Erro ao salvar mensagem.' });
  }
});


// -------------------------------------------------------------
// Rota do Assistente / Bot (Regras do Banco + Fallback LLM)
// -------------------------------------------------------------
// -------------------------------------------------------------
// Helper: Cache e Leitura do index.html (Horário e Localização)
// -------------------------------------------------------------
const DESENVOLVEDORES = [
  'Raphael Gomes Canova',
  'Naiara Tamires Monteiro da Silva',
  'Anderson da Silva Mazini',
];

let cacheIndexHtml = { texto: '', expiraEm: 0 };

async function lerDadosIndexHtml(): Promise<string> {
  if (cacheIndexHtml.texto && cacheIndexHtml.expiraEm > Date.now()) {
    return cacheIndexHtml.texto;
  }

  let html = '';
  const urlsTentativa = [
    process.env.FRONTEND_URL,
    'https://raphads.github.io/kim-front/index.html',
    'https://raphads.github.io/kim-front/',
  ].filter(Boolean) as string[];

  for (const url of urlsTentativa) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        html = await resp.text();
        break;
      }
    } catch {
      // tenta a próxima URL
    }
  }

  if (!html) {
    return 'Kartódromo Internacional de Mauá — Cidade: Mauá, Estado: São Paulo (SP).';
  }

  const textoLimpo = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3500);

  cacheIndexHtml = {
    texto: textoLimpo,
    expiraEm: Date.now() + 10 * 60 * 1000,
  };

  return textoLimpo;
}

app.post('/api/bot', async (req, res) => {
  try {
    const mensagemOriginal = (req.body?.mensagem || '').trim();

    if (!mensagemOriginal) {
      return res.json({
        resposta:
          'Olá! Sou o assistente do Á la Kart. Pergunte sobre pilotos, ranking, campeonatos, horários, localização, segurança no kart ou automobilismo!',
      });
    }

    // Carrega banco de dados e texto do index.html em paralelo
    const [pilotosAtivos, campeonatos, historico, textoIndex] = await Promise.all([
      prisma.piloto.findMany(),
      prisma.campeonato.findMany({ orderBy: { id: 'desc' } }),
      prisma.historico.findMany({ orderBy: { id: 'desc' } }),
      lerDadosIndexHtml(),
    ]);

    const nomesAtivos = new Set(pilotosAtivos.map((p) => p.nome));

    // Calcula ranking atual (apenas pilotos ativos)
    const pts: Record<string, number> = {};
    historico.forEach((h) => {
      if (h.nomePrimeiro && nomesAtivos.has(h.nomePrimeiro)) {
        pts[h.nomePrimeiro] = (pts[h.nomePrimeiro] || 0) + 25;
      }
      if (h.nomeSegundo && nomesAtivos.has(h.nomeSegundo)) {
        pts[h.nomeSegundo] = (pts[h.nomeSegundo] || 0) + 18;
      }
      if (h.nomeTerceiro && nomesAtivos.has(h.nomeTerceiro)) {
        pts[h.nomeTerceiro] = (pts[h.nomeTerceiro] || 0) + 15;
      }
    });

    const rankingOrdenado = Object.entries(pts).sort((a, b) => b[1] - a[1]);

    const listaPilotos =
      pilotosAtivos
        .map((p) => `${p.nome} (Kart #${p.numero}${p.equipe ? `, equipe ${p.equipe}` : ''})`)
        .join('; ') || 'nenhum piloto cadastrado';

    const listaRanking =
      rankingOrdenado
        .map(([nome, pontos], i) => `${i + 1}º ${nome}: ${pontos} pts`)
        .join('; ') || 'ninguém pontuando ainda';

    const listaCampeonatos =
      campeonatos
        .map((c) => {
          const dataFmt = c.data
            ? new Date(c.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
            : '';
          return `${c.nome} (${c.voltas} voltas${dataFmt ? `, ${dataFmt}` : ''})`;
        })
        .join('; ') || 'nenhum campeonato cadastrado';

    const listaPodios =
      historico
        .slice(0, 6)
        .map((h) => {
          const p1 = nomesAtivos.has(h.nomePrimeiro) ? h.nomePrimeiro : '(inativo)';
          const p2 = nomesAtivos.has(h.nomeSegundo) ? h.nomeSegundo : '(inativo)';
          const p3 = nomesAtivos.has(h.nomeTerceiro) ? h.nomeTerceiro : '(inativo)';
          return `${h.nomeCampeonato} (${h.numeroVoltas} voltas): 1º ${p1}, 2º ${p2}, 3º ${p3}`;
        })
        .join(' | ') || 'nenhum pódio registrado';

    const contextoSistema = `Você é o assistente virtual oficial do sistema "Á la Kart" (Kartódromo Internacional de Mauá).
Responda sempre em português do Brasil, de forma simpática, clara e objetiva.

REGRAS:
1. Para perguntas sobre pilotos, ranking, campeonatos, pódios, cidade, estado, endereço e horário de funcionamento, use EXCLUSIVAMENTE os dados reais fornecidos abaixo. Nunca invente registros.
2. Se perguntarem quem criou ou desenvolveu o sistema, informe os nomes: ${DESENVOLVEDORES.join(', ')}.
3. Para perguntas sobre kartismo, regras de segurança na pista (capacete, viseira, balaclava, bandeiras, briefing) ou automobilismo em geral, responda naturalmente com seu conhecimento técnico.

=== DADOS REAIS DO SISTEMA E DO SITE ===
- Desenvolvedores: ${DESENVOLVEDORES.join(', ')}
- Pilotos ativos (${pilotosAtivos.length}): ${listaPilotos}
- Ranking atual (25/18/15 pts): ${listaRanking}
- Campeonatos (${campeonatos.length}): ${listaCampeonatos}
- Últimos pódios: ${listaPodios}
- Conteúdo extraído da página inicial (index.html): ${textoIndex}`;

    if (!process.env.GROQ_API_KEY) {
      return res.json({
        resposta: '⚠️ Variável GROQ_API_KEY não configurada no servidor.',
      });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        temperature: 0.4,
        max_tokens: 500,
        messages: [
          { role: 'system', content: contextoSistema },
          { role: 'user', content: mensagemOriginal },
        ],
      }),
    });

    if (!groqRes.ok) {
      const erroTexto = await groqRes.text();
      console.error(`❌ Erro na Groq (${groqRes.status}):`, erroTexto);
      return res.json({
        resposta: '⚠️ A IA demorou ou falhou ao responder agora. Tente novamente em instantes.',
      });
    }

    const groqData = await groqRes.json();
    const respostaIA = groqData?.choices?.[0]?.message?.content?.trim();

    return res.json({
      resposta: respostaIA || 'Não consegui formular uma resposta agora.',
    });
  } catch (error) {
    console.error('Erro na rota /api/bot:', error);
    return res.status(500).json({ error: 'Erro interno no assistente.' });
  }
});


// -------------------------------------------------------------
// Inicialização da API
// -------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Node.js rodando em http://localhost:${PORT}`);
});