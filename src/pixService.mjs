import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const pedidosFile = path.join(dataDir, "pedidos.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function lerPedidos() {
  try {
    if (fs.existsSync(pedidosFile)) {
      return JSON.parse(fs.readFileSync(pedidosFile, "utf8"));
    }
  } catch (err) {
    console.error("[PixService] Erro ao ler pedidos:", err);
  }
  return [];
}

function salvarPedidos(pedidos) {
  try {
    fs.writeFileSync(pedidosFile, JSON.stringify(pedidos, null, 2), "utf8");
  } catch (err) {
    console.error("[PixService] Erro ao salvar pedidos:", err);
  }
}

/**
 * Cria cobrança Pix real no Mercado Pago
 */
async function criarPixMercadoPago({ valor, planoNome, nome, email, token }) {
  const [firstName, ...rest] = nome.trim().split(" ");
  const lastName = rest.join(" ") || "Cliente";

  const payload = {
    transaction_amount: Number(valor.toFixed(2)),
    description: `JS AI - ${planoNome}`,
    payment_method_id: "pix",
    payer: {
      email: email,
      first_name: firstName,
      last_name: lastName
    }
  };

  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID()
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.message || (data.cause && data.cause[0] ? data.cause[0].description : "Erro no Mercado Pago");
    throw new Error(`Falha no Mercado Pago: ${msg}`);
  }

  const txData = data.point_of_interaction?.transaction_data;
  return {
    gatewayPaymentId: data.id,
    copiaECola: txData?.qr_code || "",
    qrCodeUrl: txData?.qr_code_base64
      ? `data:image/png;base64,${txData.qr_code_base64}`
      : `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(txData?.qr_code || "")}`
  };
}

/**
 * Consulta status de pagamento real no Mercado Pago
 */
export async function consultarStatusMercadoPago(gatewayPaymentId, token) {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${gatewayPaymentId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.status; // "pending", "approved", "rejected", "cancelled"
  } catch (err) {
    console.error("[MercadoPago] Erro ao consultar status:", err);
    return null;
  }
}

/**
 * Gera um payload Pix Copia e Cola simulado para modo de desenvolvimento
 */
function gerarCopiaEColaSimulado(chave, valor, txid) {
  const v = valor.toFixed(2);
  return `00020126580014br.gov.bcb.pix0136${chave}520400005303986540${v.length}${v}5802BR5915Jaislan AI Tech6009Sao Paulo62290525${txid}6304ABCD`;
}

/**
 * Cria um novo pedido com cobrança Pix (Real via Mercado Pago ou Simulado)
 */
export async function criarPedidoPix({
  planoId,
  planoNome,
  valor,
  nome,
  email,
  senha = "",
  whatsapp = "",
  productIdCanboso,
  ip = "",
  userAgent = ""
}) {
  const pedidos = lerPedidos();
  const pedidoId = "PIX_" + Date.now().toString(36) + "_" + crypto.randomBytes(3).toString("hex").toUpperCase();
  const txid = crypto.randomBytes(8).toString("hex").toUpperCase();
  const expiraEm = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos

  let copiaECola = "";
  let qrCodeUrl = "";
  let gatewayPaymentId = null;
  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

  if (mpToken) {
    try {
      console.log(`[PixService] Gerando Pix REAL via Mercado Pago para ${email} (R$ ${valor})...`);
      const mpResult = await criarPixMercadoPago({ valor, planoNome, nome, email, token: mpToken });
      gatewayPaymentId = mpResult.gatewayPaymentId;
      copiaECola = mpResult.copiaECola;
      qrCodeUrl = mpResult.qrCodeUrl;
      console.log(`[PixService] Pix Mercado Pago criado com sucesso! ID: ${gatewayPaymentId}`);
    } catch (err) {
      console.error("[PixService] Erro ao gerar Pix no Mercado Pago:", err.message);
      // Fallback para simulado se token estiver inválido
      copiaECola = gerarCopiaEColaSimulado("pix@jaislan.ia.br", valor, txid);
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(copiaECola)}&color=00d2ff&bgcolor=06080c`;
    }
  } else {
    // Modo Simulado (Sandbox)
    copiaECola = gerarCopiaEColaSimulado("pix@jaislan.ia.br", valor, txid);
    qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(copiaECola)}&color=00d2ff&bgcolor=06080c`;
  }

  // Se senha foi fornecida, salvar cadastro do usuário
  if (senha && email) {
    try {
      const usuariosFile = path.join(dataDir, "usuarios.json");
      let usuarios = [];
      if (fs.existsSync(usuariosFile)) {
        usuarios = JSON.parse(fs.readFileSync(usuariosFile, "utf8"));
      }
      const existingIdx = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      const usuarioData = {
        email: email.toLowerCase(),
        nome,
        whatsapp,
        senhaHash: crypto.createHash("sha256").update(senha).digest("hex"),
        atualizadoEm: new Date().toISOString()
      };
      if (existingIdx >= 0) {
        usuarios[existingIdx] = { ...usuarios[existingIdx], ...usuarioData };
      } else {
        usuarioData.criadoEm = new Date().toISOString();
        usuarios.push(usuarioData);
      }
      fs.writeFileSync(usuariosFile, JSON.stringify(usuarios, null, 2), "utf8");
    } catch (err) {
      console.error("[PixService] Erro ao salvar cadastro de usuário:", err);
    }
  }

  const novoPedido = {
    id: pedidoId,
    pedidoId,
    txid,
    gatewayPaymentId,
    gateway: mpToken ? "MERCADOPAGO" : "SIMULADO",
    planoId,
    planoNome,
    valor,
    valorFormatado: `R$ ${valor.toFixed(2).replace(".", ",")}`,
    nome,
    email,
    whatsapp,
    productIdCanboso,
    ip: ip || "",
    userAgent: userAgent || "",
    termoAceito: true,
    status: "PENDENTE", // PENDENTE, PAGO, ENTREGUE, EXPIRADO, CANCELADO
    copiaECola,
    qrCodeUrl,
    criadoEm: new Date().toISOString(),
    expiraEm,
    pagoEm: null,
    dadosEntrega: null
  };

  pedidos.push(novoPedido);
  salvarPedidos(pedidos);

  return novoPedido;
}

/**
 * Consulta o status de um pedido e atualiza automaticamente se for Mercado Pago
 */
export async function obterPedidoAtualizado(pedidoId) {
  const pedidos = lerPedidos();
  const pedido = pedidos.find(p => p.pedidoId === pedidoId || p.id === pedidoId);
  if (!pedido) return null;

  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (pedido.status === "PENDENTE" && pedido.gatewayPaymentId && mpToken) {
    const statusMp = await consultarStatusMercadoPago(pedido.gatewayPaymentId, mpToken);
    if (statusMp === "approved") {
      pedido.status = "PAGO";
      pedido.pagoEm = new Date().toISOString();
      salvarPedidos(pedidos);
    }
  }

  return pedido;
}

export function obterPedido(pedidoId) {
  const pedidos = lerPedidos();
  return pedidos.find(p => p.pedidoId === pedidoId || p.id === pedidoId) || null;
}

/**
 * Confirma o pagamento e atualiza o pedido
 */
export function confirmarPagamentoPedido(pedidoId, dadosEntrega = null) {
  const pedidos = lerPedidos();
  const index = pedidos.findIndex(p => p.pedidoId === pedidoId || p.id === pedidoId);
  if (index === -1) return null;

  pedidos[index].status = "PAGO";
  pedidos[index].pagoEm = new Date().toISOString();
  if (dadosEntrega) {
    pedidos[index].dadosEntrega = dadosEntrega;
    pedidos[index].status = "ENTREGUE";
  }

  salvarPedidos(pedidos);
  return pedidos[index];
}

/**
 * Lista todos os pedidos (para o painel de admin)
 */
export function listarTodosPedidos() {
  return lerPedidos().sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}
