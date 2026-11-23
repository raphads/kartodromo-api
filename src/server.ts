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

let cacheInfoSite: { texto: string; expiraEm: number } | null = null;

async function obterInfoDoIndexHtml(): Promise<string> {
  const agora = Date.now();
  if (cacheInfoSite && cacheInfoSite.expiraEm > agora) {
    return cacheInfoSite.texto;
  }

  let htmlBruto = '';

  // 1. Tenta ler localmente se existir um index.html na pasta public ou raiz
  const caminhosLocais = [
    path.join(__dirname, 'public', 'index.html'),
    path.join(__dirname, '..', 'index.html'),
  ];

  for (const caminho of caminhosLocais) {
    if (fs.existsSync(caminho)) {
      htmlBruto = fs.readFileSync(caminho, 'utf-8');
      break;
    }
  }

  // 2. Se não houver arquivo local, busca direto do front no GitHub Pages
  if (!htmlBruto) {
    const urlFront =
      process.env.FRONTEND_URL ||
      'https://raphads.github.io/kim-front/index'; // <-- ajuste para a URL exata do seu GitHub Pages se necessário

    try {
      const resp = await fetch(urlFront, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        htmlBruto = await resp.text();
      }
    } catch {
      // Ignora erro de rede e usa fallback abaixo
    }
  }

  if (!htmlBruto) {
    return 'Localização: Mauá - SP. Consulte a página inicial do Kartódromo Internacional de Mauá para horários atualizados.';
  }

  // Remove scripts, styles e tags HTML para extrair o texto limpo da página inicial
  const textoLimpo = htmlBruto
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

  // Filtra trechos relevantes sobre horário, endereço, cidade e estado
  const sentencas = textoLimpo
    .split(/(?<=[.!?|•])\s+|\s{2,}/)
    .filter((trecho) =>
      /(hor[aá]rio|funcionamento|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|feriado|\d{1,2}h|\d{2}:\d{2}|mau[aá]|s[aã]o paulo|\bsp\b|endere[cç]o|rua|av\.|avenida|bairro|cidade|estado)/i.test(
        trecho
      )
    );

  const resumoExtraido = (
    sentencas.length > 0 ? sentencas.join(' | ') : textoLimpo
  ).slice(0, 1200);

  cacheInfoSite = {
    texto: resumoExtraido,
    expiraEm: agora + 10 * 60 * 1000, // Cache de 10 minutos
  };

  return resumoExtraido;
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// -------------------------------------------------------------
// Rota do Assistente / Bot (Banco + index.html + Autoria + Gemini)
// -------------------------------------------------------------
app.post('/api/bot', async (req, res) => {
  try {
    const mensagemOriginal = (req.body?.mensagem || '').trim();
    const pergunta = normalizarTexto(mensagemOriginal);

    if (!pergunta) {
      return res.json({
        resposta:
          'Olá! Posso ajudar com ranking, pilotos, campeonatos, pódios, horário de funcionamento, localização, segurança no kart e automobilismo.',
      });
    }

    // 1. Regra: Autoria / Quem criou ou desenvolveu o sistema
    if (
      pergunta.includes('quem criou') ||
      pergunta.includes('quem desenvolveu') ||
      pergunta.includes('desenvolvedor') ||
      pergunta.includes('desenvolvedores') ||
      pergunta.includes('criadores') ||
      pergunta.includes('autores') ||
      pergunta.includes('equipe do projeto') ||
      pergunta.includes('quem fez')
    ) {
      const listaDevs = DESENVOLVEDORES.map((nome) => `• ${nome}`).join('\n');
      return res.json({
        resposta: `🏁 O sistema À la Kart foi desenvolvido pela equipe:\n${listaDevs}`,
      });
    }

    // 2. Regra: Horário de funcionamento e Cidade/Estado (lendo do index.html)
    if (
      pergunta.includes('horario') ||
      pergunta.includes('funcionamento') ||
      pergunta.includes('abre') ||
      pergunta.includes('fecha') ||
      pergunta.includes('cidade') ||
      pergunta.includes('estado') ||
      pergunta.includes('onde fica') ||
      pergunta.includes('localizacao') ||
      pergunta.includes('endereco')
    ) {
      const infoSite = await obterInfoDoIndexHtml();

      // Se tiver Gemini configurado, deixa ele formatar a resposta direto a partir do HTML lido
      if (process.env.GEMINI_API_KEY) {
        try {
          const llmRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `Você é o assistente do Kartódromo Internacional de Mauá (sistema À la Kart). Responda de forma direta e amigável em português usando APENAS as informações extraídas da página inicial (index.html) abaixo.\n\nDados do index.html: ${infoSite}\n\nPergunta do usuário: ${mensagemOriginal}`,
                      },
                    ],
                  },
                ],
              }),
            }
          );

          if (llmRes.ok) {
            const llmData = await llmRes.json();
            const respostaFormatada =
              llmData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (respostaFormatada) {
              return res.json({ resposta: respostaFormatada });
            }
          }
        } catch {
          // Cai no retorno direto extraído do HTML
        }
      }

      return res.json({
        resposta: `📍 Informações da página inicial do Kartódromo:\n${infoSite}`,
      });
    }

    // Carrega dados reais do banco para consultas esportivas e contexto do Gemini
    const [pilotosAtivos, campeonatos, historico] = await Promise.all([
      prisma.piloto.findMany(),
      prisma.campeonato.findMany({ orderBy: { id: 'desc' } }),
      prisma.historico.findMany({ orderBy: { id: 'desc' } }),
    ]);

    const nomesAtivos = new Set(pilotosAtivos.map((p) => p.nome));

    // Calcula tabela de pontuação consolidada (apenas pilotos ativos)
    const tabelaPontos: Record<
      string,
      { pontos: number; ouro: number; prata: number; bronze: number; podios: number }
    > = {};

    pilotosAtivos.forEach((p) => {
      tabelaPontos[p.nome] = { pontos: 0, ouro: 0, prata: 0, bronze: 0, podios: 0 };
    });

    historico.forEach((h) => {
      if (h.nomePrimeiro && nomesAtivos.has(h.nomePrimeiro)) {
        tabelaPontos[h.nomePrimeiro].pontos += 25;
        tabelaPontos[h.nomePrimeiro].ouro += 1;
        tabelaPontos[h.nomePrimeiro].podios += 1;
      }
      if (h.nomeSegundo && nomesAtivos.has(h.nomeSegundo)) {
        tabelaPontos[h.nomeSegundo].pontos += 18;
        tabelaPontos[h.nomeSegundo].prata += 1;
        tabelaPontos[h.nomeSegundo].podios += 1;
      }
      if (h.nomeTerceiro && nomesAtivos.has(h.nomeTerceiro)) {
        tabelaPontos[h.nomeTerceiro].pontos += 15;
        tabelaPontos[h.nomeTerceiro].bronze += 1;
        tabelaPontos[h.nomeTerceiro].podios += 1;
      }
    });

    // 3. Regra: Consulta específica por nome de um piloto ativo
    const pilotoCitado = pilotosAtivos.find((p) =>
      pergunta.includes(normalizarTexto(p.nome))
    );

    if (
      pilotoCitado &&
      (pergunta.includes('ponto') ||
        pergunta.includes('podio') ||
        pergunta.includes('vitoria') ||
        pergunta.includes('kart') ||
        pergunta.includes('equipe') ||
        pergunta.includes('estatistica') ||
        pergunta.includes('desempenho'))
    ) {
      const stats = tabelaPontos[pilotoCitado.nome];
      return res.json({
        resposta: `🏎️ ${pilotoCitado.nome} (Kart #${pilotoCitado.numero}${
          pilotoCitado.equipe ? ` • ${pilotoCitado.equipe}` : ''
        }):\n• Pontuação total: ${stats.pontos} pts\n• Pódios: ${stats.podios} (${stats.ouro}x 1º, ${stats.prata}x 2º, ${stats.bronze}x 3º)`,
      });
    }

    // 4. Regra: Ranking Geral
    if (
      pergunta.includes('ranking') ||
      pergunta.includes('classificacao') ||
      pergunta.includes('lider') ||
      pergunta.includes('pontuacao')
    ) {
      const top = Object.entries(tabelaPontos)
        .filter(([, s]) => s.pontos > 0)
        .sort((a, b) => b[1].pontos - a[1].pontos || b[1].ouro - a[1].ouro)
        .slice(0, 5)
        .map(
          ([nome, s], i) =>
            `${i + 1}º ${nome} — ${s.pontos} pts (${s.ouro}V / ${s.podios} pódios)`
        )
        .join('\n');

      return res.json({
        resposta: top
          ? `🏆 Ranking Geral (pilotos ativos):\n${top}`
          : 'Ainda não há pilotos ativos pontuando no ranking.',
      });
    }

    // 5. Regra: Lista direta de Campeonatos
    if (
      (pergunta.includes('quais campeonatos') ||
        pergunta.includes('listar campeonatos') ||
        pergunta === 'campeonatos') &&
      campeonatos.length > 0
    ) {
      const lista = campeonatos
        .slice(0, 5)
        .map((c) => {
          const dataFmt = c.data
            ? new Date(c.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
            : '';
          return `• ${c.nome} — ${c.voltas} voltas${dataFmt ? ` (${dataFmt})` : ''}`;
        })
        .join('\n');

      return res.json({ resposta: `🏁 Campeonatos cadastrados:\n${lista}` });
    }

    // 6. Gemini AI: Segurança no Kart, Automobilismo, Regras e Perguntas Abertas
    if (process.env.GEMINI_API_KEY) {
      try {
        const infoSite = await obterInfoDoIndexHtml();

        const rankingResumo = Object.entries(tabelaPontos)
          .filter(([, s]) => s.pontos > 0)
          .sort((a, b) => b[1].pontos - a[1].pontos)
          .slice(0, 5)
          .map(([nome, s], i) => `${i + 1}º ${nome} (${s.pontos} pts)`)
          .join(', ');

        const campeonatosResumo = campeonatos
          .slice(0, 5)
          .map((c) => `${c.nome} (${c.voltas} voltas)`)
          .join(', ');

        const podiosResumo = historico
          .slice(0, 4)
          .map((h) => {
            const p1 = nomesAtivos.has(h.nomePrimeiro) ? h.nomePrimeiro : 'piloto inativo';
            const p2 = nomesAtivos.has(h.nomeSegundo) ? h.nomeSegundo : 'piloto inativo';
            const p3 = nomesAtivos.has(h.nomeTerceiro) ? h.nomeTerceiro : 'piloto inativo';
            return `${h.nomeCampeonato}: 1º ${p1}, 2º ${p2}, 3º ${p3}`;
          })
          .join(' | ');

        const promptSistema = `Você é o assistente virtual oficial do sistema "Á la Kart" (Kartódromo Internacional de Mauá).
Responda sempre em português do Brasil, de forma clara, didática e objetiva (máximo 2 parágrafos curtos ou bullet points).

Suas capacidades:
1. Responder dúvidas sobre segurança no kartismo (uso obrigatório de capacete com viseira fechada, balaclava, luvas, macacão/roupa fechada, briefing, bandeiras de sinalização, proibição de roupas soltas/cabelo solto, respeito às zonas de frenagem e não bater propositalmente).
2. Explicar conceitos de automobilismo e kart (traçado ideal/apex, frenagem, bandeiras verde/amarela/vermelha/azul/quadriculada, diferença entre kart indoor/rental e competição, categorias, telemetria, cronometragem).
3. Responder perguntas sobre os dados reais do kartódromo e do sistema usando EXCLUSIVAMENTE o contexto abaixo (nunca invente pilotos, resultados ou horários):

- Desenvolvedores do sistema: ${DESENVOLVEDORES.join(', ')}
- Informações da página inicial (index.html): ${infoSite}
- Pilotos ativos (${pilotosAtivos.length}): ${pilotosAtivos.map((p) => `${p.nome} (Kart #${p.numero})`).join(', ') || 'nenhum'}
- Ranking atual: ${rankingResumo || 'sem pontuação registrada'}
- Campeonatos cadastrados (${campeonatos.length}): ${campeonatosResumo || 'nenhum'}
- Últimos pódios: ${podiosResumo || 'nenhum'}

Pergunta do usuário: ${mensagemOriginal}`;

        const llmRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptSistema }] }],
            }),
          }
        );

        if (llmRes.ok) {
          const llmData = await llmRes.json();
          const textoGerado =
            llmData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (textoGerado) {
            return res.json({ resposta: textoGerado });
          }
        } else {
          const erroTexto = await llmRes.text();
          console.error(`❌ Erro na API Gemini (${llmRes.status}):`, erroTexto);
        }
      } catch (llmErr) {
        console.error('❌ Falha de rede/execução no Gemini:', llmErr);
      }
    }

    // 7. Fallback local final caso a API do Gemini esteja indisponível
    return res.json({
      resposta:
        'Posso ajudar com informações sobre segurança no kart, automobilismo, ranking, pilotos, campeonatos, horários do kartódromo ou sobre a equipe que desenvolveu o sistema!',
    });
  } catch (error) {
    console.error('Erro na rota /api/bot:', error);
    return res.status(500).json({ error: 'Erro ao processar consulta do assistente.' });
  }
});


// -------------------------------------------------------------
// Rota de Ranking de Pilotos (Gamificação por Pódios)
// -------------------------------------------------------------
app.get('/api/ranking', async (req, res) => {
  try {
    const [historico, pilotos] = await Promise.all([
      prisma.historico.findMany(),
      prisma.piloto.findMany()
    ]);

    // Mapa para puxar foto/kart/equipe atualizados do piloto
    const infoPilotos = {};
    pilotos.forEach(p => {
      infoPilotos[p.nome] = {
        foto: p.foto || null,
        numero: p.numero || '-',
        equipe: p.equipe || 'Independente'
      };
    });

    const tabela = {};

    const pontuar = (nome, fotoHistorico, pontos, posicao) => {
      if (!nome|| !infoPilotos[nome]) return;
      if (!tabela[nome]) {
        tabela[nome] = {
          nome,
          foto: infoPilotos[nome]?.foto || fotoHistorico || null,
          numero: infoPilotos[nome]?.numero || '-',
          equipe: infoPilotos[nome]?.equipe || 'Independente',
          pontos: 0,
          ouro: 0,
          prata: 0,
          bronze: 0,
          podios: 0
        };
      }
      tabela[nome].pontos += pontos;
      tabela[nome].podios += 1;
      if (posicao === 1) tabela[nome].ouro += 1;
      if (posicao === 2) tabela[nome].prata += 1;
      if (posicao === 3) tabela[nome].bronze += 1;
    };

    historico.forEach(corrida => {
      pontuar(corrida.nomePrimeiro, corrida.fotoPrimeiro, 25, 1);
      pontuar(corrida.nomeSegundo, corrida.fotoSegundo, 18, 2);
      pontuar(corrida.nomeTerceiro, corrida.fotoTerceiro, 15, 3);
    });

    // Ordena por pontos, depois vitórias (ouro), depois pratas
    const ranking = Object.values(tabela).sort((a, b) =>
      b.pontos - a.pontos || b.ouro - a.ouro || b.prata - a.prata
    );

    return res.json(ranking);
  } catch (error) {
    console.error('Erro ao gerar ranking:', error);
    return res.status(500).json({ error: 'Erro ao calcular ranking de pilotos.' });
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
// Inicialização da API
// -------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Node.js rodando em http://localhost:${PORT}`);
});