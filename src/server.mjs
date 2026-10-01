import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  obterSaldoCanboso,
  listarProdutosCanboso,
  comprarProdutoCanboso
} from "./canbosoClient.mjs";
import {
  criarPedidoPix,
  obterPedido,
  obterPedidoAtualizado,
  confirmarPagamentoPedido,
  listarTodosPedidos
} from "./pixService.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(__dirname, "public");

// Carregar variáveis de ambiente do .env
if (typeof process.loadEnvFile === "function") {
  const envPath = path.join(rootDir, ".env");
  if (fs.existsSync(envPath)) {
    try { process.loadEnvFile(envPath); } catch {}
  }
}

const PORT = process.env.PORT || 4000;

// Configuração dos Planos Autorais JS AI (Preços Competitivos 125, 154, 550)
export const TABELA_PLANOS = {
  "plano-core": {
    id: "plano-core",
    nome: "JS CORE",
    tag: "SALDO $100 USD · SEM VENCIMENTO",
    preco: 125.00,
    precoFormatado: "R$ 125",
    parcelado: "ou 12x de R$ 12,55",
    creditoUsd: 100,
    descricao: "Código oficial de acesso com $100 USD de saldo para usar Claude 3.5 Sonnet, Opus e GPT sem mensalidade recorrente.",
    destaque: false,
    beneficios: [
      "Código oficial com $100 USD de saldo",
      "Saldo NÃO EXPIRA no final do mês (use no seu ritmo)",
      "Rende 15M a 20M de tokens de Claude Sonnet",
      "Rende mais de 80M de tokens em DeepSeek V3",
      "Compatível com Cursor, VS Code, Claude Code e SDKs",
      "Entrega automática imediata na tela após o Pix"
    ],
    productIdCanboso: "6aba30f331a482e3ae1f350b"
  },
  "plano-prime": {
    id: "plano-prime",
    nome: "JS PRIME",
    tag: "MAIS ESCOLHIDO · $200 USD",
    preco: 154.00,
    precoFormatado: "R$ 154",
    parcelado: "ou 12x de R$ 15,46",
    creditoUsd: 200,
    descricao: "Código oficial de acesso com $200 USD de saldo. Alto volume e velocidade para desenvolvimento profissional.",
    destaque: true,
    beneficios: [
      "Código oficial com $200 USD de saldo",
      "Saldo NÃO EXPIRA no final do mês (permanece até consumir)",
      "Rende 30M a 40M de tokens de Claude Sonnet",
      "Rende mais de 160M de tokens em DeepSeek V3",
      "Acesso completo a Claude Opus, GPT-4o e DeepSeek",
      "Entrega automática imediata na tela após o Pix"
    ],
    productIdCanboso: "6aba311931a482e3ae1f3df2"
  },
  "plano-titanium": {
    id: "plano-titanium",
    nome: "JS TITANIUM",
    tag: "MÁXIMA AUTONOMIA · $500 USD",
    preco: 550.00,
    precoFormatado: "R$ 550",
    parcelado: "ou 12x de R$ 55,22",
    creditoUsd: 500,
    descricao: "Cota master com $500 USD de saldo oficial. Libera GPT Astra (o modelo mais atual), o modelo mais atual do Claude Code (Opus 5.5 e Sonnet 5) e máxima autonomia.",
    destaque: false,
    beneficios: [
      "Código oficial com $500 USD de saldo",
      "Saldo NÃO EXPIRA no final do mês (permanece até consumir 100%)",
      "Libera GPT Astra — o modelo mais atual e potente",
      "Libera o modelo mais atual do Claude Code (Opus 5.5 e Sonnet 5)",
      "Acesso completo a Fable 5.1/5, Codex Auto Review e DeepSeek",
      "Rende 75M a 100M de tokens Claude ou 400M+ em DeepSeek",
      "Ideal para repositórios gigantes, automações e squads",
      "Entrega automática imediata na tela após o Pix"
    ],
    productIdCanboso: "6aba314c31a482e3ae1f4822"
  },
  // Aliases de compatibilidade
  "plano-100usd": {
    id: "plano-core",
    nome: "JS CORE",
    tag: "SALDO $100 USD",
    preco: 125.00,
    precoFormatado: "R$ 125",
    parcelado: "ou 12x de R$ 12,55",
    creditoUsd: 100,
    productIdCanboso: "6aba30f331a482e3ae1f350b"
  },
  "plano-200usd": {
    id: "plano-prime",
    nome: "JS PRIME",
    tag: "MAIS ESCOLHIDO",
    preco: 154.00,
    precoFormatado: "R$ 154",
    parcelado: "ou 12x de R$ 15,46",
    creditoUsd: 200,
    productIdCanboso: "6aba311931a482e3ae1f3df2"
  },
  "plano-500usd": {
    id: "plano-titanium",
    nome: "JS TITANIUM",
    tag: "MÁXIMA AUTONOMIA",
    preco: 550.00,
    precoFormatado: "R$ 550",
    parcelado: "ou 12x de R$ 55,22",
    creditoUsd: 500,
    productIdCanboso: "6aba314c31a482e3ae1f4822"
  },
  "plano-1000usd": {
    id: "plano-titanium",
    nome: "JS TITANIUM",
    tag: "MÁXIMA AUTONOMIA",
    preco: 550.00,
    precoFormatado: "R$ 550",
    parcelado: "ou 12x de R$ 55,22",
    creditoUsd: 500,
    productIdCanboso: "6aba314c31a482e3ae1f4822"
  },
  "plano-combo-500usd-chatgpt": {
    id: "plano-titanium",
    nome: "JS TITANIUM",
    tag: "MÁXIMA AUTONOMIA",
    preco: 550.00,
    precoFormatado: "R$ 550",
    parcelado: "ou 12x de R$ 55,22",
    creditoUsd: 500,
    productIdCanboso: "6aba314c31a482e3ae1f4822"
  },
  "plano-pro": {
    id: "plano-core",
    nome: "JS CORE",
    tag: "SALDO $100 USD",
    preco: 125.00,
    precoFormatado: "R$ 125",
    creditoUsd: 100,
    productIdCanboso: "6aba30f331a482e3ae1f350b"
  },
  "plano-max": {
    id: "plano-prime",
    nome: "JS PRIME",
    tag: "MAIS ESCOLHIDO",
    preco: 154.00,
    precoFormatado: "R$ 154",
    creditoUsd: 200,
    productIdCanboso: "6aba311931a482e3ae1f3df2"
  },
  "plano-enterprise": {
    id: "plano-titanium",
    nome: "JS TITANIUM",
    tag: "MÁXIMA AUTONOMIA",
    preco: 550.00,
    precoFormatado: "R$ 550",
    creditoUsd: 500,
    productIdCanboso: "6aba314c31a482e3ae1f4822"
  },
  "plano-1-acesso": {
    id: "plano-1-acesso",
    nome: "JS ACCESS · API UNIFICADA",
    tag: "PLANO 1",
    preco: 297.00,
    precoFormatado: "R$ 297",
    parcelado: "ou 12x de R$ 29,82",
    creditoUsd: 500,
    descricao: "Código oficial de acesso com $500 de saldo para usar todos os modelos de IA sem limites em uma única chave.",
    destaque: false,
    beneficios: [
      "Código oficial de acesso com $500 de saldo",
      "Chave própria de API (compatível com OpenAI SDK)",
      "Acesso instantâneo a Claude 3.5 Sonnet e Opus",
      "Acesso a GPT-4o, DeepSeek V3 e Qwen",
      "Manual passo a passo de ativação e uso",
      "Garantia blindada de 30 dias com suporte"
    ],
    productIdCanboso: "6aba314c31a482e3ae1f4822" // API Claude 500$ 1 mês
  },
  "plano-2-vip": {
    id: "plano-2-vip",
    nome: "JS VIP · ACESSO + SETUP COMPLETO",
    tag: "PLANO 2 · MAIS ESCOLHIDO",
    preco: 397.00,
    precoFormatado: "R$ 397",
    parcelado: "ou 12x de R$ 39,86",
    creditoUsd: 500,
    descricao: "Tudo do plano de acesso + tutorial em vídeo e configuração assistida no VS Code, Cursor e Claude Code.",
    destaque: true,
    beneficios: [
      "Tudo do Plano de Acesso ($500 de saldo)",
      "Tutorial em vídeo gravado em alta definição",
      "Configuração guiada para Claude Code no terminal",
      "Configuração para Codex CLI e VS Code",
      "Configuração no Cursor / Cline / Roo Code",
      "Teste prático de funcionamento ao vivo",
      "Suporte VIP prioritário no WhatsApp",
      "Garantia estendida de 30 dias"
    ],
    productIdCanboso: "6aba314c31a482e3ae1f4822" // API Claude 500$ 1 mês
  },
  "plano-chatgpt-2anos": {
    id: "plano-chatgpt-2anos",
    nome: "CHATGPT PLUS (2 ANOS)",
    tag: "OFERTA ESPECIAL",
    preco: 147.00,
    precoFormatado: "R$ 147",
    parcelado: "ou 12x de R$ 14,76",
    creditoUsd: 0,
    descricao: "Conta ChatGPT Plus K12 Edu com 2 anos de duração para usar no app e web com GPT-4o e geração de imagens.",
    destaque: false,
    beneficios: [
      "Acesso individual direto de 2 Anos",
      "Modelos GPT-4o, GPT-4 e Canvas liberados",
      "Geração de imagens DALL-E e voz avançada",
      "Sem mensalidade por 24 meses",
      "Garantia de reposição 24h"
    ],
    productIdCanboso: "6abbf9c217aa4c8f03447ebc"
  },
  "plano-canva-pro": {
    id: "plano-canva-pro",
    nome: "CANVA PRO ANUAL",
    tag: "DESIGN & VÍDEO",
    preco: 67.00,
    precoFormatado: "R$ 67",
    parcelado: "ou 6x de R$ 12,20",
    creditoUsd: 0,
    descricao: "Ativação direta no seu próprio e-mail pessoal. Todos os templates, removedor de fundo e kits de marca liberados.",
    destaque: false,
    beneficios: [
      "Ativado diretamente no seu e-mail do Canva",
      "Removedor de fundo com 1 clique",
      "Acesso a mais de 100 milhões de fotos e vídeos",
      "Kit de marca e fontes personalizadas",
      "Garantia total durante todo o período"
    ],
    productIdCanboso: "6a5cc41237d1d25ab6b419af"
  }
};

function lerBodyJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => { raw += chunk; });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function responderJson(res, statusCode, dados) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(dados));
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function servirArquivoEstatico(res, caminhoRelativo) {
  const caminhoAbsoluto = path.join(publicDir, caminhoRelativo);
  if (!fs.existsSync(caminhoAbsoluto) || !fs.statSync(caminhoAbsoluto).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Arquivo não encontrado");
  }
  const ext = path.extname(caminhoAbsoluto).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const conteudo = fs.readFileSync(caminhoAbsoluto);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(conteudo);
}

export function iniciarServidor() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    // CORS pre-flight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      return res.end();
    }

    try {
      // Rotas de Páginas e Assets Estáticos
      if (pathname === "/" && req.method === "GET") {
        return servirArquivoEstatico(res, "index.html");
      }

      if (pathname === "/admin" && req.method === "GET") {
        return servirArquivoEstatico(res, "admin.html");
      }

      if (pathname === "/dashboard" && req.method === "GET") {
        return servirArquivoEstatico(res, "dashboard.html");
      }

      if (pathname.startsWith("/assets/") && req.method === "GET") {
        return servirArquivoEstatico(res, pathname.replace(/^\//, ""));
      }

      // API: Lista de Planos e Produtos
      if (pathname === "/api/planos" && req.method === "GET") {
        return responderJson(res, 200, {
          sucesso: true,
          planos: Object.values(TABELA_PLANOS)
        });
      }

      // API: Saldo da Carteira no Fornecedor
      if (pathname === "/api/saldo" && req.method === "GET") {
        const saldo = await obterSaldoCanboso();
        return responderJson(res, 200, saldo);
      }

      // API: Criar Cobrança Pix
      if (pathname === "/api/pix/criar" && req.method === "POST") {
        const body = await lerBodyJson(req);
        const { planoId, nome, email, senha, whatsapp } = body;

        const plano = TABELA_PLANOS[planoId];
        if (!plano) {
          return responderJson(res, 400, { sucesso: false, erro: "Plano inválido selecionado." });
        }
        if (!nome || !email) {
          return responderJson(res, 400, { sucesso: false, erro: "Nome e E-mail são obrigatórios." });
        }

        const ipCliente = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "";

        const pedido = await criarPedidoPix({
          planoId: plano.id,
          planoNome: plano.nome,
          valor: plano.preco,
          nome,
          email,
          senha: senha || "",
          whatsapp,
          productIdCanboso: plano.productIdCanboso,
          ip: ipCliente,
          userAgent
        });

        return responderJson(res, 200, { sucesso: true, pedido });
      }

      // API: Consultar Status do Pedido Pix (com suporte a Mercado Pago ao vivo)
      if (pathname.startsWith("/api/pix/status/") && req.method === "GET") {
        const pedidoId = pathname.replace("/api/pix/status/", "");
        let pedido = await obterPedidoAtualizado(pedidoId);
        if (!pedido) {
          return responderJson(res, 404, { sucesso: false, erro: "Pedido não encontrado." });
        }

        // Se acabou de ser pago no Mercado Pago e ainda não entregou
        if (pedido.status === "PAGO" && !pedido.dadosEntrega) {
          let dadosEntrega = null;
          const saldo = await obterSaldoCanboso();
          const TUTORIAL_VIBI = {
            titulo: "🔑 Como ativar:",
            passos: [
              "1️⃣ Acesse vibi.top, registre-se ou faça login.",
              "2️⃣ Clique na carteira → insira o código de resgate.",
              "3️⃣ Vá para a seção Chave API → crie a chave."
            ],
            guiaUrl: "https://vibi.top/docs-setup/vi",
            videoTutorialUrl: "https://docs.google.com/document/d/1N6REuLBxiXP6VvDVPLiSt6C40PXULDLXGkDP0I7PGUs/edit?usp=sharing"
          };

          if (saldo.success && saldo.balance > 0) {
            const resCompra = await comprarProdutoCanboso({
              productId: pedido.productIdCanboso,
              customerEmail: pedido.email
            });
            dadosEntrega = {
              origem: "FORNECEDOR_REAL",
              resultado: resCompra,
              voucher: resCompra?.data?.code || resCompra?.code || "EMISSÃO EM ANDAMENTO",
              tutorial: TUTORIAL_VIBI
            };
          } else {
            // Saldo no fornecedor zerado ou compra pendente
            dadosEntrega = {
              origem: "PENDENTE_EMISSAO",
              voucher: "EMISSÃO EM ANDAMENTO",
              statusVoucher: "EMITINDO",
              mensagem: "Pagamento Pix confirmado! Seu código oficial de acesso está sendo gerado pela central em instantes.",
              tutorial: TUTORIAL_VIBI
            };
          }
          pedido = confirmarPagamentoPedido(pedido.pedidoId, dadosEntrega);
        }

        return responderJson(res, 200, { sucesso: true, pedido });
      }

      // API: Simular Pagamento Aprovado (Modo Teste / Demonstração)
      if (pathname === "/api/pix/simular-pagamento" && req.method === "POST") {
        const body = await lerBodyJson(req);
        const { pedidoId } = body;
        const pedido = obterPedido(pedidoId);
        if (!pedido) {
          return responderJson(res, 404, { sucesso: false, erro: "Pedido não encontrado." });
        }

        // Tentar comprar na Canboso ou gerar entrega simulada se saldo for 0
        let dadosEntrega = null;
        const saldo = await obterSaldoCanboso();
        const TUTORIAL_VIBI = {
          titulo: "🔑 Como ativar:",
          passos: [
            "1️⃣ Acesse vibi.top, registre-se ou faça login.",
            "2️⃣ Clique na carteira → insira o código de resgate.",
            "3️⃣ Vá para a seção Chave API → crie a chave."
          ],
          guiaUrl: "https://vibi.top/docs-setup/vi",
          videoTutorialUrl: "https://docs.google.com/document/d/1N6REuLBxiXP6VvDVPLiSt6C40PXULDLXGkDP0I7PGUs/edit?usp=sharing"
        };

        if (saldo.success && saldo.balance > 0) {
          console.log(`[Compra] Saldo detectado (${saldo.balanceUsd} USD). Comprando na Canboso...`);
          const resCompra = await comprarProdutoCanboso({
            productId: pedido.productIdCanboso,
            customerEmail: pedido.email
          });
          dadosEntrega = {
            origem: "CANBOSO_REAL",
            resultado: resCompra,
            voucher: resCompra?.data?.code || "JS-KEY-OFFICIAL",
            tutorial: TUTORIAL_VIBI
          };
        } else {
          console.log(`[Compra] Saldo zerado ou modo teste. Gerando entrega simulada de alta fidelidade.`);
          const codigoVoucher = "JS-KEY-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
          dadosEntrega = {
            origem: "DEMO_SIMULADO",
            voucher: codigoVoucher,
            codigoResgate: codigoVoucher,
            plataforma: "https://vibi.top",
            tutorial: TUTORIAL_VIBI,
            garantiaDias: 30,
            entregueEm: new Date().toISOString()
          };
        }

        const atualizado = confirmarPagamentoPedido(pedidoId, dadosEntrega);
        return responderJson(res, 200, { sucesso: true, pedido: atualizado });
      }

      // API: Painel Admin - Listar Pedidos & Métricas
      if (pathname === "/api/admin/pedidos" && req.method === "GET") {
        const pedidos = listarTodosPedidos();
        const totalFaturado = pedidos.filter(p => p.status === "PAGO" || p.status === "ENTREGUE")
          .reduce((acc, p) => acc + p.valor, 0);
        const totalPedidos = pedidos.length;
        const totalPagos = pedidos.filter(p => p.status === "PAGO" || p.status === "ENTREGUE").length;

        return responderJson(res, 200, {
          sucesso: true,
          metricas: {
            totalFaturado,
            totalFaturadoFormatado: `R$ ${totalFaturado.toFixed(2).replace(".", ",")}`,
            totalPedidos,
            totalPagos,
            taxaConversao: totalPedidos > 0 ? `${Math.round((totalPagos / totalPedidos) * 100)}%` : "0%"
          },
          pedidos
        });
      }

      // API: Entrega Manual de Voucher pelo Admin (caso compra manual no Telegram)
      if (pathname === "/api/admin/entregar-voucher" && req.method === "POST") {
        const body = await lerBodyJson(req);
        const { pedidoId, voucher } = body;
        if (!pedidoId || !voucher) {
          return responderJson(res, 400, { sucesso: false, erro: "pedidoId e voucher são obrigatórios." });
        }
        const dadosEntrega = {
          origem: "MANUAL_TELEGRAM",
          voucher: voucher.trim(),
          instrucoes: "Resgate em https://vibi.top na aba Carteira (Wallet)",
          entregueEm: new Date().toISOString()
        };
        const pedido = confirmarPagamentoPedido(pedidoId, dadosEntrega);
        return responderJson(res, 200, { sucesso: true, pedido });
      }

      // 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ erro: "Rota não encontrada" }));

    } catch (err) {
      console.error("[Servidor] Erro:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ erro: "Erro interno do servidor" }));
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`=======================================================`);
    console.log(`🚀 PLATAFORMA DE IA & APIs ONLINE:`);
    console.log(`📡 Acesse no navegador: http://localhost:${PORT}`);
    console.log(`📊 Painel Administrativo: http://localhost:${PORT}/admin`);
    console.log(`=======================================================`);
  });

  return server;
}

if (process.argv[1] && path.basename(process.argv[1]) === "server.mjs") {
  iniciarServidor();
}
