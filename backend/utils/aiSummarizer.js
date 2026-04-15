const AI_RUNTIME_CONFIG = {
  provider: String(process.env.AI_PROVIDER || 'local').trim().toLowerCase() === 'gemini'
    ? 'gemini'
    : 'local',
  fallbackProvider: ['local', 'gemini'].includes(String(process.env.AI_FALLBACK_PROVIDER || '').trim().toLowerCase())
    ? String(process.env.AI_FALLBACK_PROVIDER || '').trim().toLowerCase()
    : '',
  maxInputChars: Number(process.env.AI_MAX_INPUT_CHARS || 7000),
  timeoutMs: Number(process.env.AI_TIMEOUT_MS || process.env.OLLAMA_TIMEOUT_MS || 300000),
  failoverOnProviderError: process.env.AI_FAILOVER_ON_PROVIDER_ERROR == null
    ? true
    : ['1', 'true', 'yes', 'on'].includes(String(process.env.AI_FAILOVER_ON_PROVIDER_ERROR).trim().toLowerCase()),
  traceEnabled: process.env.AI_TRACE_ENABLED == null
    ? process.env.NODE_ENV !== 'production'
    : ['1', 'true', 'yes', 'on'].includes(String(process.env.AI_TRACE_ENABLED).trim().toLowerCase())
};

const OLLAMA_CONFIG = {
  model: process.env.OLLAMA_MODEL || 'qwen2.5vl:7b',
  generateUrl: process.env.OLLAMA_GENERATE_URL || 'http://localhost:11434/api/generate',
  timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || process.env.AI_TIMEOUT_MS || 600000),
  numCtx: Number(process.env.OLLAMA_NUM_CTX || process.env.AI_OLLAMA_NUM_CTX || 8192)
};

const GEMINI_CONFIG = {
  model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY || '',
  baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
  timeoutMs: AI_RUNTIME_CONFIG.timeoutMs
};

function createTraceId(prefix = 'ai') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Runtime trace logs help verify whether requests reached provider and returned successfully.
function aiTrace(event, details = {}) {
  if (!AI_RUNTIME_CONFIG.traceEnabled) return;
  const payload = {
    ...details,
    ts: new Date().toISOString()
  };
  console.log(`[AI_TRACE] ${event} ${JSON.stringify(payload)}`);
}

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
  const ollamaImages = (images || [])
    .map((image) => (typeof image === 'string' ? image : image?.data))
    .filter(Boolean);

  const response = await fetch(OLLAMA_CONFIG.generateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(OLLAMA_CONFIG.timeoutMs),
    body: JSON.stringify({
      model: OLLAMA_CONFIG.model,
      prompt,
      stream: false,
      images: ollamaImages.length ? ollamaImages : undefined,
      options: Number.isFinite(OLLAMA_CONFIG.numCtx) && OLLAMA_CONFIG.numCtx > 0
        ? { num_ctx: OLLAMA_CONFIG.numCtx }
        : undefined
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

async function callGeminiGenerate({ prompt, images = [] }) {
  if (!GEMINI_CONFIG.apiKey) {
    return {
      content: null,
      error: 'Gemini API key is missing. Set GEMINI_API_KEY in backend/.env'
    };
  }

  const parts = [{ text: String(prompt || '') }];
  for (const image of images || []) {
    const data = typeof image === 'string' ? image : image?.data;
    if (!data) continue;

    parts.push({
      inlineData: {
        mimeType: image?.mimeType || 'image/jpeg',
        data
      }
    });
  }

  const endpoint = `${GEMINI_CONFIG.baseUrl}/${encodeURIComponent(GEMINI_CONFIG.model)}:generateContent?key=${encodeURIComponent(GEMINI_CONFIG.apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(GEMINI_CONFIG.timeoutMs),
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      content: null,
      error: `Gemini request failed (${response.status}): ${body.slice(0, 800)}`
    };
  }

  const data = await response.json();
  const content = (data?.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => String(part?.text || '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!content) {
    return {
      content: null,
      error: 'Gemini returned no text content'
    };
  }

  return {
    content,
    error: ''
  };
}

function buildProviderChain() {
  const chain = [AI_RUNTIME_CONFIG.provider];
  if (
    AI_RUNTIME_CONFIG.fallbackProvider &&
    AI_RUNTIME_CONFIG.fallbackProvider !== AI_RUNTIME_CONFIG.provider
  ) {
    chain.push(AI_RUNTIME_CONFIG.fallbackProvider);
  }
  return chain;
}

async function callProviderGenerate(provider, payload) {
  if (provider === 'gemini') {
    return callGeminiGenerate(payload);
  }
  return callOllamaGenerate(payload);
}

async function callModelGenerate({ prompt, images = [] }) {
  const providers = buildProviderChain();

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    const traceId = createTraceId('gen');
    const startedAt = Date.now();

    aiTrace('provider_request_start', {
      traceId,
      provider,
      promptChars: String(prompt || '').length,
      imageCount: (images || []).length,
      attempt: index + 1,
      totalAttempts: providers.length
    });

    const result = await callProviderGenerate(provider, { prompt, images });
    const success = Boolean(result.content);

    aiTrace(success ? 'provider_request_success' : 'provider_request_failed', {
      traceId,
      provider,
      durationMs: Date.now() - startedAt,
      outputChars: String(result.content || '').length,
      error: result.error ? result.error.slice(0, 160) : '',
      attempt: index + 1,
      totalAttempts: providers.length
    });

    if (success) {
      return { ...result, providerUsed: provider };
    }

    const canFailover =
      AI_RUNTIME_CONFIG.failoverOnProviderError &&
      index < providers.length - 1;

    if (canFailover) {
      aiTrace('provider_failover', {
        fromProvider: provider,
        toProvider: providers[index + 1],
        reason: String(result.error || 'empty_content').slice(0, 160)
      });
      continue;
    }

    return { ...result, providerUsed: provider };
  }

  return {
    content: null,
    error: 'No configured providers were available',
    providerUsed: ''
  };
}

async function summarizeTask(task, payload = {}) {
  const traceId = createTraceId('sum');
  const inputText = String(payload.text || '').slice(0, AI_RUNTIME_CONFIG.maxInputChars);
  const prompt = buildPrompt(task, { ...payload, text: inputText });
  aiTrace('summary_task_start', {
    traceId,
    task,
    provider: AI_RUNTIME_CONFIG.provider,
    inputChars: inputText.length
  });

  try {
    const result = await callModelGenerate({ prompt });
    const activeProvider = result.providerUsed || AI_RUNTIME_CONFIG.provider;
    if (result.content) {
      aiTrace('summary_task_complete', {
        traceId,
        task,
        provider: activeProvider,
        outputChars: result.content.length
      });
      return result.content;
    }

    aiTrace('summary_task_fallback', {
      traceId,
      task,
      provider: activeProvider,
      reason: (result.error || 'empty_content').slice(0, 160)
    });
    return fallbackSummary(task, payload);
  } catch (error) {
    aiTrace('summary_task_error', {
      traceId,
      task,
      provider: AI_RUNTIME_CONFIG.provider,
      error: String(error?.message || error || 'unknown').slice(0, 160)
    });
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
  AI_RUNTIME_CONFIG,
  GEMINI_CONFIG,
  summarizeTask,
  transcribeVoiceNote,
  OLLAMA_CONFIG,
  callOllamaGenerate,
  callGeminiGenerate,
  callModelGenerate,
  aiTrace,
  createTraceId
};
