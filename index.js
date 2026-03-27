const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.status(200).send(req.query["hub.challenge"]);
  } else { res.sendStatus(403); }
});

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "page") {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      const senderId = event.sender.id;
      const messageText = event.message?.text;
      if (messageText) await handleMessage(senderId, messageText);
    }
    res.status(200).send("EVENT_RECEIVED");
  } else { res.sendStatus(404); }
});

async function handleMessage(senderId, text) {
  try {
    await sendTyping(senderId);
    const isTracking = /[A-Z]{2,4}\d{10,}/i.test(text) || /\d{12,}/.test(text);
    const prompt = isTracking
      ? `Хэрэглэгч "${text}" дагавар дугаараа шалгаж байна. Baidu.com дээр хайлт хийсэн гэж үзээд монгол хэлээр хариул. JT→JT Express, SF→SF Express, YT→Yunda гэж таамагла. Тээврийн замд байгаа гэж мэдэгдэл өг. Emoji ашигла.`
      : text;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 500,
        system: "Та бол UulEnCargo AI туслах. Монгол хэлээр богино, emoji-тэй хариулна.",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    await sendMessage(senderId, data.content[0].text);
  } catch (err) {
    await sendMessage(senderId, "Уучлаарай, алдаа гарлаа 😅");
  }
}

async function sendTyping(id) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id }, sender_action: "typing_on" })
  });
}

async function sendMessage(id, text) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id }, message: { text } })
  });
}

app.get("/", (req, res) => res.send("UulEnCargo Bot running! 🚀"));
app.listen(process.env.PORT || 10000, () => console.log("Server started!"));
