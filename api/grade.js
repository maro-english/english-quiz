const https = require('https');

// Node.js built-in https — works on all runtimes regardless of Node.js version
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        port: 443,
        path,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => { chunks += c; });
        res.on('end', () => resolve({ status: res.statusCode, text: chunks }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY が Vercel 環境変数に設定されていません。' });
  }

  // req.body may be a string or already-parsed object depending on Vercel runtime
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { japanese, modelAnswer, userAnswer } = body;
  if (!japanese || !modelAnswer || !userAnswer) {
    return res.status(400).json({ error: 'japanese / modelAnswer / userAnswer が必要です。' });
  }

  const prompt = `You are grading an English translation exercise for a Japanese learner.

Japanese sentence: ${japanese}
Reference English answer: ${modelAnswer}
Student's English answer: ${userAnswer}

Grading rules:
1. CORRECT — meaning matches (even if phrasing differs from reference)
2. NATURAL — meaning is correct but phrasing is awkward or unnatural for an American English speaker. Provide a more natural version.
3. INCORRECT — meaning is wrong or significantly different. Provide the reference phrase or a common equivalent.

Reply with ONLY valid JSON, no other text:
{"result":"CORRECT"}
{"result":"NATURAL","suggestion":"more natural English here"}
{"result":"INCORRECT","suggestion":"correct English here"}`;

  try {
    const { status, text } = await httpsPost(
      'api.anthropic.com',
      '/v1/messages',
      {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }
    );

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: `Anthropic レスポンスのパース失敗: ${text.slice(0, 200)}` });
    }

    if (status !== 200) {
      return res.status(status).json({
        error: data.error?.message || `Anthropic API error: HTTP ${status}`,
      });
    }

    const aiText = data.content[0].text.trim();
    let result;
    try {
      result = JSON.parse(aiText);
    } catch {
      return res.status(500).json({ error: `AI 採点結果のパース失敗: ${aiText.slice(0, 200)}` });
    }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: `サーバーエラー: ${e.message}` });
  }
};
