const fs = require('fs');
const path = require('path');

const AI_CONFIG = {
  provider: 'gemini',
  gemini: {
    textModel: 'gemini-2.0-flash',
    audioModel: 'gemini-2.0-flash'
  },
  openai: {
    textModel: 'gpt-4.1-mini',
    audioModel: 'gpt-4o-mini-transcribe'
  },
  maxInputChars: 7000
};

function buildPrompt(task, payload = {}) {
  const style = 'Use calm, polite, non-alarming language. Avoid fear-based wording. Keep it easy for patients to understand.';

  if (task === 'test_document') {
    return [
      style,
      'Summarize this test report for a patient in 3-5 short bullet points.',
      'Include key metrics or findings if present, and mention if doctor follow-up is generally recommended without urgent tone.',
      `Report tag: ${payload.reportTag || 'general test report'}`,
      `Document text:\n${payload.text || ''}`
    ].join('\n\n');
  }

  if (task === 'diagnosis_document') {
    return [
      style,
      'Summarize this diagnosis report for a patient in 3-5 short bullet points.',
      'Highlight condition notes, treatment direction, and practical next steps in gentle wording.',
      `Document text:\n${payload.text || ''}`
    ].join('\n\n');
  }

  if (task === 'trend_graph') {
    return [
      style,
      'Create a short trend summary in 2-4 bullet points for this health graph data.',
      'Describe direction, consistency, and whether values are mostly in range. Keep it reassuring and factual.',
      `Trend payload:\n${payload.text || ''}`
    ].join('\n\n');
  }

  if (task === 'voice_transcript_cleanup') {
    return [
      'Clean and format this medical voice transcript.',
      'Keep meaning unchanged, remove filler words where obvious, and return plain text only.',
      payload.text || ''
    ].join('\n\n');
  }

  return `${style}\n\n${payload.text || ''}`;
}

function fallbackSummary(task, payload = {}) {
  if (task === 'trend_graph') {
    return 'AI summary is temporarily unavailable. Trend details are shown in the chart and table for review.';
  }
  if (task === 'diagnosis_document') {
    return 'AI summary is temporarily unavailable. Please review this diagnosis document directly.';
  }
  return 'AI summary is temporarily unavailable. Please review this report directly.';
}

async function callGeminiText(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = AI_CONFIG.gemini.textModel;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 400 }
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('\n').trim() || null;
}

async function callOpenAIText(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = AI_CONFIG.openai.textModel;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

async function summarizeTask(task, payload = {}) {
  const inputText = String(payload.text || '').slice(0, AI_CONFIG.maxInputChars);
  const prompt = buildPrompt(task, { ...payload, text: inputText });

  try {
    let output = null;
    if (AI_CONFIG.provider === 'openai') {
      output = await callOpenAIText(prompt);
    } else {
      output = await callGeminiText(prompt);
    }

    return output || fallbackSummary(task, payload);
  } catch {
    return fallbackSummary(task, payload);
  }
}

async function transcribeWithOpenAI(filePath, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !fs.existsSync(filePath)) return null;

  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer], { type: mimeType || 'audio/mpeg' });
  const form = new FormData();
  form.append('model', AI_CONFIG.openai.audioModel);
  form.append('file', blob, path.basename(filePath));

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  if (!response.ok) return null;
  const data = await response.json();
  return String(data?.text || '').trim() || null;
}

async function transcribeWithGemini(filePath, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !fs.existsSync(filePath)) return null;

  const fileBuffer = fs.readFileSync(filePath);
  if (fileBuffer.length > 10 * 1024 * 1024) return null;

  const model = AI_CONFIG.gemini.audioModel;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: 'Transcribe this medical voice note. Return plain transcript text only.' },
            {
              inlineData: {
                mimeType: mimeType || 'audio/mpeg',
                data: fileBuffer.toString('base64')
              }
            }
          ]
        }
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 700 }
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  const transcript = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('\n').trim() || null;
  return transcript;
}

async function transcribeVoiceNote(filePath, mimeType) {
  try {
    let transcript = null;
    if (AI_CONFIG.provider === 'openai') {
      transcript = await transcribeWithOpenAI(filePath, mimeType);
    } else {
      transcript = await transcribeWithGemini(filePath, mimeType);
    }

    if (!transcript) {
      return {
        status: 'failed',
        transcript: 'Automatic transcript is not available right now.',
        error: 'No transcript returned from provider'
      };
    }

    const cleaned = await summarizeTask('voice_transcript_cleanup', { text: transcript });
    return {
      status: 'completed',
      transcript: cleaned || transcript,
      error: ''
    };
  } catch (error) {
    return {
      status: 'failed',
      transcript: 'Automatic transcript is not available right now.',
      error: error?.message || 'Transcription failed'
    };
  }
}

module.exports = {
  summarizeTask,
  transcribeVoiceNote,
  AI_CONFIG
};
