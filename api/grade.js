module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY が Vercel 環境変数に設定されていません。' });
  }

  const { japanese, modelAnswer, userAnswer } = req.body || {};
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
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data.error?.message || `Anthropic API error: ${upstream.status}`
      });
    }

    const text = data.content[0].text.trim();
    const result = JSON.parse(text);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
