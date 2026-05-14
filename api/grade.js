import https from 'https';

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname, port: 443, path, method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } },
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY が未設定です。' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  } else if (body == null) {
    body = await readBody(req);
  }

  const { japanese, modelAnswer, userAnswer, mode } = body || {};

  // ---- 生成モード ----
  if (mode === 'generate') {
    if (!japanese) {
      return res.status(400).json({ error: 'japanese が必要です。' });
    }
    const generatePrompt = `You are helping a Japanese person learn natural American English for travel.

Japanese phrase: ${japanese}

Task:
1. Translate this into natural, casual American English that a native speaker would actually say.
2. Suggest an appropriate category in Japanese (e.g. 接客・日常会話, 電車・移動, 注文・買い物, 道案内, その他表現, etc.)

Reply with ONLY valid JSON, no other text:
{"english":"natural American English here","category":"カテゴリ名"}`;

    try {
      const { status, text } = await httpsPost(
        'api.anthropic.com', '/v1/messages',
        { 'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01' },
        { model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          messages: [{ role: 'user', content: generatePrompt }] }
      );
      let data;
      try { data = JSON.parse(text); } catch { return res.status(500).json({ error: 'パース失敗' }); }
      if (status !== 200) return res.status(status).json({ error: data.error?.message || `HTTP ${status}` });
      const raw = data.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      let result;
      try { result = JSON.parse(raw); } catch { return res.status(500).json({ error: '生成結果のパース失敗' }); }
      return res.status(200).json(result);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ---- 採点モード ----
  if (!japanese || !modelAnswer || !userAnswer) {
    return res.status(400).json({ error: 'japanese / modelAnswer / userAnswer が必要です。' });
  }

  const prompt = `You are grading an English translation exercise for a Japanese learner.

Japanese sentence: ${japanese}
Reference English answer: ${modelAnswer}
Student's English answer: ${userAnswer}

Grading rules:
1. CORRECT — meaning matches (even if phrasing differs from reference)
2. NATURAL — meaning is correct but phrasing is awkward or unnatural for an American English speaker.
   Provide:
   - "nuance": a brief Japanese explanation of what the student's answer sounds like to a native speaker (e.g. "少しぎこちなく聞こえます" or "フォーマルすぎる印象です")
   - "suggestion": a more natural American English version
3. INCORRECT — meaning is wrong or significantly different. Provide the reference phrase or a common equivalent.

Reply with ONLY valid JSON, no other text:
{"result":"CORRECT"}
{"result":"NATURAL","nuance":"日本語でニュアンス説明","suggestion":"more natural English here"}
{"result":"INCORRECT","suggestion":"correct English here"}`;

  try {
    const { status, text } = await httpsPost(
      'api.anthropic.com', '/v1/messages',
      { 'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01' },
      { model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }] }
    );

    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(500).json({ error: `レスポンスのパース失敗: ${text.slice(0, 200)}` }); }

    if (status !== 200) {
      return res.status(status).json({ error: data.error?.message || `Anthropic HTTP ${status}` });
    }

    const aiRaw = data.content[0].text.trim();
    const aiText = aiRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let result;
    try { result = JSON.parse(aiText); }
    catch { return res.status(500).json({ error: `採点結果のパース失敗: ${aiText.slice(0, 200)}` }); }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: `サーバーエラー: ${e.message}` });
  }
}
