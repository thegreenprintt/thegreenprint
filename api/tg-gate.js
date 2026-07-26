// The Greenprint — Telegram gate bot (Vercel serverless function)
// Path in repo: api/tg-gate.js   ->   live URL: https://thegreenprint.trade/api/tg-gate
//
// Reuses existing Vercel env vars:
//   TELEGRAM_BOT_TOKEN         (already set)
//   TELEGRAM_SIGNALS_CHAT_ID   (already set  -> the GREENPRINT BETA IDEAS channel)
// New env var to add once the admin channel exists:
//   TELEGRAM_ADMIN_CHAT_ID     (private "Greenprint Admin" channel that approvals land in)

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SIGNALS_CHAT = process.env.TELEGRAM_SIGNALS_CHAT_ID;
const ADMIN_CHAT = process.env.TELEGRAM_ADMIN_CHAT_ID || "-1004342057901";
const BROKER_LINK = "https://members.livvfxtrading.com/client/register/6a65379bb16ad";
const DEPOSIT_LINK = "https://members.livvfxtrading.com/client/dwguide";

function api(method) {
  return "https://api.telegram.org/bot" + TOKEN + "/" + method;
}

async function tg(method, body) {
  const r = await fetch(api(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

function instructions(name) {
  const hi = name ? " " + name : "";
  return (
    "👋 Welcome" + hi + " to The Greenprint!\n\n" +
    "New to trading? No worries — just follow these 3 simple steps and you're in:\n\n" +
    "1️⃣  CREATE YOUR ACCOUNT\n" +
    "Sign up using my broker link (it has to be this exact one):\n" + BROKER_LINK + "\n\n" +
    "2️⃣  ADD FUNDS ($100+ recommended)\n" +
    "This is the money you'll trade with — never add more than you can afford to lose.\n" +
    "Brand new and not sure how to deposit? This quick guide walks you through it step by step:\n" + DEPOSIT_LINK + "\n\n" +
    "3️⃣  SEND ME A SCREENSHOT\n" +
    "Snap a screenshot of your funded account and send it right here in this chat. I'll check it and send you your private invite to the live signals channel.\n\n" +
    "That's it — once you're verified, you're in.\n\n" +
    "⚠️ Trading involves real risk. Only trade money you can afford to lose. The Greenprint is educational and not financial advice."
  );
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).send("Greenprint gate bot: OK");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  let update = req.body;
  if (typeof update === "string") {
    try { update = JSON.parse(update); } catch (e) { update = {}; }
  }
  update = update || {};

  try {
    // --- 1) Approve / Deny tapped in the admin channel ---
    const cq = update.callback_query;
    if (cq) {
      const data = cq.data || "";
      const idx = data.indexOf(":");
      const action = idx > -1 ? data.slice(0, idx) : data;
      const userId = idx > -1 ? data.slice(idx + 1) : "";

      if (action === "approve" && userId) {
        const inv = await tg("createChatInviteLink", {
          chat_id: SIGNALS_CHAT,
          member_limit: 1,
          name: "member " + userId,
        });
        const link = inv && inv.result && inv.result.invite_link;
        if (link) {
          await tg("sendMessage", {
            chat_id: userId,
            text:
              "✅ You're verified! Here's your private invite to the Greenprint signals channel:\n\n" +
              link + "\n\n" +
              "This link works once — tap it to join. Welcome in.",
            disable_web_page_preview: true,
          });
          await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Approved ✅ — invite sent." });
          if (cq.message) {
            await tg("editMessageCaption", {
              chat_id: cq.message.chat.id,
              message_id: cq.message.message_id,
              caption: (cq.message.caption || "") + "\n\n✅ APPROVED — invite sent.",
            });
          }
        } else {
          await tg("answerCallbackQuery", {
            callback_query_id: cq.id,
            text: "Error creating invite — is the bot an admin of the signals channel?",
            show_alert: true,
          });
        }
        res.status(200).send("ok");
        return;
      }

      if (action === "deny" && userId) {
        await tg("sendMessage", {
          chat_id: userId,
          text:
            "Thanks for your interest. We couldn't verify a funded account under our broker link yet.\n\n" +
            "Make sure you signed up with the link in step 1 and funded your account, then send a fresh screenshot here.",
        });
        await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Denied — user notified." });
        if (cq.message) {
          await tg("editMessageCaption", {
            chat_id: cq.message.chat.id,
            message_id: cq.message.message_id,
            caption: (cq.message.caption || "") + "\n\n❌ DENIED.",
          });
        }
        res.status(200).send("ok");
        return;
      }

      await tg("answerCallbackQuery", { callback_query_id: cq.id });
      res.status(200).send("ok");
      return;
    }

    // --- direct messages ---
    const msg = update.message;
    if (!msg) { res.status(200).send("ok"); return; }
    const chatId = msg.chat.id;
    const from = msg.from || {};
    const firstName = from.first_name || "";
    const lastName = from.last_name || "";

    // 2) /start -> instructions
    if (typeof msg.text === "string" && msg.text.indexOf("/start") === 0) {
      await tg("sendMessage", { chat_id: chatId, text: instructions(firstName), disable_web_page_preview: true });
      res.status(200).send("ok");
      return;
    }

    // 3) screenshot -> forward to admin with buttons
    const isPhoto = Array.isArray(msg.photo) && msg.photo.length > 0;
    const isImageDoc = msg.document && String(msg.document.mime_type || "").indexOf("image/") === 0;
    if (isPhoto || isImageDoc) {
      const fileId = isPhoto ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
      const uname = from.username ? "@" + from.username : "(no username)";
      const caption =
        "🆕 VERIFICATION REQUEST\n\n" +
        "Name: " + firstName + " " + lastName + "\n" +
        "Username: " + uname + "\n" +
        "User ID: " + from.id + "\n\n" +
        "Check this against your Livv FX affiliate dashboard, then Approve or Deny.";
      if (ADMIN_CHAT) {
        await tg("sendPhoto", {
          chat_id: ADMIN_CHAT,
          photo: fileId,
          caption: caption,
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Approve", callback_data: "approve:" + from.id },
              { text: "❌ Deny", callback_data: "deny:" + from.id },
            ]],
          },
        });
      }
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Got it ✅ — your screenshot is under review. You'll get your invite right here as soon as you're verified.",
      });
      res.status(200).send("ok");
      return;
    }

    // 4) anything else -> nudge
    await tg("sendMessage", {
      chat_id: chatId,
      text: "To get access: complete the 3 steps, then send a screenshot of your funded account here.\n\nType /start to see the steps again.",
    });
    res.status(200).send("ok");
    return;
  } catch (e) {
    res.status(200).send("ok");
    return;
  }
};
