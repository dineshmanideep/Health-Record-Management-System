const OLLAMA_CONFIG = {
  model: 'qwen2.5vl:7b',
  generateUrl: 'http://localhost:11434/api/generate',
  maxInputChars: 7000,
  timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 300000)
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

async function callOllamaGenerate({ prompt, images = [] }) {
  const response = await fetch(OLLAMA_CONFIG.generateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(OLLAMA_CONFIG.timeoutMs),
    body: JSON.stringify({
      model: OLLAMA_CONFIG.model,
      prompt,
      stream: false,
      images: images.length ? images : undefined
    })
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      content: null,
      error: `Ollama request failed (${response.status}): ${body.slice(0, 800)}`
    };
  }

  const data = await response.json();
  return {
    content: String(data?.response || '').trim() || null,
    error: ''
  };
}

async function summarizeTask(task, payload = {}) {
  const inputText = String(payload.text || '').slice(0, OLLAMA_CONFIG.maxInputChars);
  const prompt = buildPrompt(task, { ...payload, text: inputText });

  try {
    const result = await callOllamaGenerate({ prompt });
    return result.content || fallbackSummary(task, payload);
  } catch {
    return fallbackSummary(task, payload);
  }
}

async function transcribeVoiceNote() {
  return {
    status: 'failed',
    transcript: 'Automatic transcript is not available right now.',
    error: 'Voice transcription is not supported by the local Ollama setup'
  };
}

module.exports = {
  summarizeTask,
  transcribeVoiceNote,
  OLLAMA_CONFIG,
  callOllamaGenerate
};
