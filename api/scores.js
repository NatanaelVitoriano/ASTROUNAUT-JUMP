export default async function handler(req, res) {
  const BIN_ID = "693ae9d6d0ea881f40224250";
  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
  const KEY = process.env.JSONBIN_KEY;

  if (!KEY) {
    return res.status(500).json({ error: "Missing JSONBIN_KEY env var" });
  }

  // ==========================================
  // GET → retorna as pontuações
  // ==========================================
  if (req.method === "GET") {
    try {
      const r = await fetch(`${JSONBIN_URL}/latest`, {
        headers: {
          "X-Master-Key": KEY
        }
      });
      const data = await r.json();
      return res.status(200).json(data.record);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao ler JSONBin" });
    }
  }

  // ==========================================
  // POST → salva pontuações
  // ==========================================
  if (req.method === "POST") {
    try {
      const r = await fetch(JSONBIN_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": KEY
        },
        body: JSON.stringify(req.body)
      });

      const data = await r.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao salvar JSONBin" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
