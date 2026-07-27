// Função serverless (Vercel) — proxy de escrita para o fluxo do Power Automate.
// A URL do fluxo e o segredo ficam em variáveis de ambiente, nunca no navegador.
//   FLOW_URL  = URL HTTP do gatilho do Power Automate
//   APP_KEY   = segredo compartilhado (o fluxo valida o campo appKey no corpo)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const FLOW_URL = process.env.FLOW_URL;
  const APP_KEY = process.env.APP_KEY || "";

  if (!FLOW_URL) {
    res.status(500).json({ error: "FLOW_URL não configurada no ambiente." });
    return;
  }

  try {
    // Vercel já entrega req.body como objeto quando o Content-Type é JSON.
    const dados = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    // Validação mínima no servidor — não confie apenas no navegador.
    if (!dados.candidato || !dados.candidato.nome || !Array.isArray(dados.respostas)) {
      res.status(400).json({ error: "Payload inválido." });
      return;
    }

    const resposta = await fetch(FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...dados, appKey: APP_KEY }),
    });

    if (!resposta.ok) {
      res.status(502).json({ error: "Falha ao acionar o fluxo.", status: resposta.status });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (erro) {
    console.error("Erro no proxy:", erro);
    res.status(500).json({ error: "Erro interno ao processar o envio." });
  }
}
