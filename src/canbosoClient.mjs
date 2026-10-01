import crypto from "node:crypto";

const NIMO_API_BASE = process.env.NIMO_API_BASE || "https://canboso.com";
const NIMO_BUYER_KEY = process.env.NIMO_BUYER_KEY || "tgb_6bc7ad3ccc9202075ca68b0fd68d844b1ff262b662a51e0a";

/**
 * Consulta o saldo atual da carteira em USDT/USD na Nimo Shop
 */
export async function obterSaldoCanboso(key = NIMO_BUYER_KEY) {
  try {
    const res = await fetch(`${NIMO_API_BASE}/api/v2/telegram-buyer/balance?key=${key}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("[Canboso] Erro ao obter saldo:", err);
    return { success: false, erro: err.message };
  }
}

/**
 * Lista todos os produtos disponíveis na Nimo Shop
 */
export async function listarProdutosCanboso(key = NIMO_BUYER_KEY) {
  try {
    const res = await fetch(`${NIMO_API_BASE}/api/v2/telegram-buyer/products?key=${key}`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Falha ao listar produtos");
    }
    return data.products || [];
  } catch (err) {
    console.error("[Canboso] Erro ao listar produtos:", err);
    return [];
  }
}

/**
 * Executa a compra de um produto na Nimo Shop via API oficial
 * @param {Object} params
 * @param {string} params.productId - ID do produto no fornecedor
 * @param {number} [params.quantity=1] - Quantidade
 * @param {string} [params.customerEmail] - E-mail caso o produto seja do tipo slot
 * @param {Array<string>} [params.customerAccounts] - Contas caso seja do tipo upgrade
 */
export async function comprarProdutoCanboso({
  productId,
  quantity = 1,
  customerEmail = null,
  customerAccounts = null,
  key = NIMO_BUYER_KEY
}) {
  const idempotencyKey = crypto.randomUUID();

  const payload = {
    key,
    product_id: productId,
    quantity
  };

  if (customerEmail) {
    payload.customer_email = customerEmail;
  }
  if (Array.isArray(customerAccounts) && customerAccounts.length > 0) {
    payload.customer_accounts = customerAccounts;
  }

  try {
    const res = await fetch(`${NIMO_API_BASE}/api/v2/telegram-buyer/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return {
      statusHttp: res.status,
      ...data
    };
  } catch (err) {
    console.error("[Canboso] Erro ao comprar produto:", err);
    return {
      success: false,
      erro: err.message
    };
  }
}
