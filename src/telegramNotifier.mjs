/**
 * Módulo de Notificações via Telegram para o Dono (Jaislan)
 */

export async function notificarTelegramDono(mensagem) {
  const token = process.env.TELEGRAM_NOTIFY_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || "6079636712";

  if (!token) {
    console.log("[Telegram Notifier] Sem TELEGRAM_NOTIFY_BOT_TOKEN configurado. Log local:\n" + mensagem);
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: mensagem,
        parse_mode: "Markdown"
      })
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error("[Telegram Notifier] Erro ao enviar mensagem:", err.message);
    return false;
  }
}
