import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAccessibility } from '../context/useAccessibility';
import { getVoiceHelpContent } from '../utils/voiceHelpContent';

const cleanLabelText = (value) => (value || '')
  .replace(/\*/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const isElementVisible = (element) => {
  if (!element) return false;
  if (element.type === 'hidden' || element.disabled) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return element.offsetParent !== null || style.position === 'fixed';
};

const getFieldName = (field) => {
  if (!field) return 'required field';

  const ariaLabel = cleanLabelText(field.getAttribute('aria-label'));
  if (ariaLabel) return ariaLabel;

  if (field.labels && field.labels.length > 0) {
    const labelText = cleanLabelText(field.labels[0].textContent);
    if (labelText) return labelText;
  }

  const placeholder = cleanLabelText(field.getAttribute('placeholder'));
  if (placeholder) return placeholder;

  const name = cleanLabelText(field.getAttribute('name'));
  if (name) return name;

  const id = cleanLabelText(field.getAttribute('id'));
  if (id) return id;

  return 'required field';
};

const getMissingRequiredFields = () => {
  const requiredFields = Array.from(
    document.querySelectorAll('input[required], select[required], textarea[required]')
  ).filter(isElementVisible);

  const missing = requiredFields
    .filter((field) => {
      if (field instanceof HTMLInputElement && field.type === 'checkbox') {
        return !field.checked;
      }
      const value = (field.value || '').trim();
      return !value;
    })
    .map((field) => ({
      name: getFieldName(field),
      element: field
    }));

  const deduped = [];
  const seen = new Set();

  missing.forEach((item) => {
    if (!seen.has(item.name)) {
      seen.add(item.name);
      deduped.push(item);
    }
  });

  return deduped.slice(0, 5);
};

const getInlineErrorMessages = () => {
  const errorSelectors = [
    '[aria-invalid="true"]',
    '[role="alert"]',
    '.text-red-500',
    '.text-red-600',
    '.text-red-700',
    '.text-amber-700'
  ];

  const nodes = Array.from(document.querySelectorAll(errorSelectors.join(',')))
    .filter(isElementVisible)
    .slice(0, 20);

  const messages = [];

  nodes.forEach((node) => {
    if (node.matches('[aria-invalid="true"]') && node.validationMessage) {
      const fieldName = getFieldName(node);
      messages.push({
        text: `${fieldName}: ${node.validationMessage}`,
        element: node
      });
      return;
    }

    const text = cleanLabelText(node.textContent);
    if (!text) return;

    if (/(error|invalid|required|failed|missing|please|cannot|must)/i.test(text)) {
      messages.push({
        text,
        element: node
      });
    }
  });

  const deduped = [];
  const seen = new Set();

  messages.forEach((item) => {
    if (!seen.has(item.text)) {
      seen.add(item.text);
      deduped.push(item);
    }
  });

  return deduped.slice(0, 4);
};

const normalizeText = (value) => cleanLabelText(value).toLowerCase();

const matchesActionText = (element, action) => {
  const actionText = normalizeText(action);
  if (!actionText) return false;

  const textContent = normalizeText(element.textContent);
  const ariaLabel = normalizeText(element.getAttribute('aria-label'));
  const title = normalizeText(element.getAttribute('title'));
  const name = normalizeText(element.getAttribute('name'));
  const helpId = normalizeText(element.getAttribute('data-help-id'));

  return [textContent, ariaLabel, title, name, helpId].some((value) => value && value.includes(actionText));
};

const getSelectorHintsForAction = (action) => {
  const text = normalizeText(action);
  if (!text) return [];

  const hints = [];

  if (text.includes('login')) {
    hints.push('button[type="submit"]', 'input[type="submit"]');
  }
  if (text.includes('signup') || text.includes('create account')) {
    hints.push('button[type="submit"]', 'input[type="submit"]');
  }
  if (text.includes('save')) {
    hints.push('button[type="submit"]');
  }
  if (text.includes('upload')) {
    hints.push('input[type="file"]');
  }
  if (text.includes('filter')) {
    hints.push('select', 'input[type="date"]', 'input[type="search"]');
  }

  return hints;
};

const getActionTargetElements = (actions) => {
  if (!actions || actions.length === 0) return [];

  const candidates = Array.from(
    document.querySelectorAll('button, a, [role="button"], input[type="submit"], input[type="button"], input[type="file"], select, textarea')
  ).filter(isElementVisible);

  const matched = [];

  actions.forEach((action) => {
    const actionMatches = candidates.filter((element) => matchesActionText(element, action));

    if (actionMatches.length > 0) {
      matched.push(actionMatches[0]);
      return;
    }

    const hinted = getSelectorHintsForAction(action)
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)).filter(isElementVisible));

    if (hinted.length > 0) {
      matched.push(hinted[0]);
    }
  });

  return Array.from(new Set(matched));
};

const getPrimarySubmitAction = (content) => {
  const submitCandidate = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'))
    .filter(isElementVisible)
    .map((element) => cleanLabelText(element.textContent || element.value || element.getAttribute('aria-label') || ''))
    .find(Boolean);

  if (submitCandidate) {
    return submitCandidate;
  }

  if (Array.isArray(content?.primaryButtons) && content.primaryButtons.length > 0) {
    const preferred = content.primaryButtons.find((button) => /(login|sign in|signup|sign up|save|submit|create|continue|update)/i.test(button));
    if (preferred) return preferred;
    return content.primaryButtons[0];
  }

  return 'Submit';
};

const chooseClearVoice = (voices) => {
  if (!voices || voices.length === 0) return null;

  const preferredNames = [
    'Google UK English Female',
    'Google US English',
    'Microsoft Aria',
    'Microsoft Zira',
    'Samantha',
    'Karen'
  ];

  const exactMatch = voices.find((voice) => preferredNames.some((name) => voice.name.includes(name)));
  if (exactMatch) return exactMatch;

  const englishVoice = voices.find((voice) => /^en(-|_)/i.test(voice.lang));
  return englishVoice || voices[0];
};

const buildSpeechText = ({ content, missingFields, errorMessages, mode, primaryAction }) => {
  if (mode === 'error') {
    const errorLines = [];
    errorLines.push(`Error help on ${content.page}.`);

    if (errorMessages.length > 0) {
      errorLines.push(`Issue detected: ${errorMessages.join(' ')}`);
    }

    if (missingFields.length > 0) {
      errorLines.push(`Complete these fields: ${missingFields.join(', ')}.`);
    }

    errorLines.push('Prevention: complete required inputs, correct invalid values, then submit again.');
    return errorLines.join(' ');
  }

  if (mode === 'recover') {
    return `You are on ${content.page}. It seems you have updated your inputs. Click ${primaryAction} to try again.`;
  }

  if (mode === 'repeat') {
    if (errorMessages.length > 0 || missingFields.length > 0) {
      return `Quick update on ${content.page}. ${errorMessages.length > 0 ? `Current issue: ${errorMessages[0]}. ` : ''}${missingFields.length > 0 ? `Still missing: ${missingFields.join(', ')}.` : ''}`;
    }
    return `Quick update on ${content.page}. No new issues detected.`;
  }

  const lines = [`You are on ${content.page}.`];

  if (content.whatToDo.length > 0) {
    lines.push(`What to do now: ${content.whatToDo.join(' ')}`);
  }

  if (content.primaryButtons.length > 0) {
    lines.push(`Buttons to use: ${content.primaryButtons.join(', ')}.`);
  }

  if (missingFields.length > 0) {
    lines.push(`Fields left to complete: ${missingFields.join(', ')}.`);
  }

  if (errorMessages.length > 0) {
    lines.push(`Current issue detected: ${errorMessages.join(' ')}.`);
    lines.push('Fix this by completing required inputs and correcting invalid values, then submit again.');
  }

  if (missingFields.length === 0 && errorMessages.length === 0) {
    lines.push('No blocking form errors detected on this page right now.');
  }

  return lines.join(' ');
};

const ContextVoiceHelpButton = () => {
  const location = useLocation();
  const { formErrors } = useAccessibility();
  const [voices, setVoices] = useState([]);
  const [errorOnlyMode, setErrorOnlyMode] = useState(false);
  const lastSpokenRef = useRef({ signature: '', time: 0 });
  const lastValidationEventAtRef = useRef(0);
  const lastDetectedErrorAtRef = useRef(0);
  const lastInputChangeAtRef = useRef(0);
  const highlightTimeoutsRef = useRef([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    const onInvalid = () => {
      lastValidationEventAtRef.current = Date.now();
      lastDetectedErrorAtRef.current = Date.now();
    };

    const onSubmitClick = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.closest('button[type="submit"], input[type="submit"]')) {
        lastValidationEventAtRef.current = Date.now();
      }
    };

    const onInputChange = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches('input, select, textarea')) {
        lastInputChangeAtRef.current = Date.now();
      }
    };

    window.addEventListener('invalid', onInvalid, true);
    window.addEventListener('click', onSubmitClick, true);
    window.addEventListener('input', onInputChange, true);
    window.addEventListener('change', onInputChange, true);

    return () => {
      window.removeEventListener('invalid', onInvalid, true);
      window.removeEventListener('click', onSubmitClick, true);
      window.removeEventListener('input', onInputChange, true);
      window.removeEventListener('change', onInputChange, true);
    };
  }, []);

  const content = useMemo(() => getVoiceHelpContent(location.pathname), [location.pathname]);

  const clearHighlights = useCallback(() => {
    highlightTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    highlightTimeoutsRef.current = [];
    document.querySelectorAll('.voice-help-highlight').forEach((element) => {
      element.classList.remove('voice-help-highlight');
    });
  }, []);

  const highlightElements = useCallback((elements) => {
    clearHighlights();
    const uniqueElements = Array.from(new Set((elements || []).filter(Boolean))).slice(0, 4);

    uniqueElements.forEach((element, index) => {
      const timeoutId = window.setTimeout(() => {
        element.classList.add('voice-help-highlight');

        const removeId = window.setTimeout(() => {
          element.classList.remove('voice-help-highlight');
        }, 3200);

        highlightTimeoutsRef.current.push(removeId);
      }, index * 150);

      highlightTimeoutsRef.current.push(timeoutId);
    });
  }, [clearHighlights]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    clearHighlights();
  }, [clearHighlights]);

  const speakHelp = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      window.alert('Voice help is not supported in this browser.');
      return;
    }

    const missingFieldItems = getMissingRequiredFields();
    const missingFields = missingFieldItems.map((item) => item.name);
    const inlineErrors = getInlineErrorMessages();
    const contextErrors = (formErrors || []).slice(0, 4);
    const inlineErrorMessages = inlineErrors.map((item) => item.text);

    const now = Date.now();
    const validationRecent = now - lastValidationEventAtRef.current < 12000;
    const hasInlineFieldErrors = inlineErrors.some((item) => item.element?.matches?.('[aria-invalid="true"]'));
    const hasRawErrors = contextErrors.length > 0 || inlineErrorMessages.length > 0;

    if (hasRawErrors) {
      lastDetectedErrorAtRef.current = now;
    }

    const editedAfterError =
      lastInputChangeAtRef.current > 0
      && lastDetectedErrorAtRef.current > 0
      && lastInputChangeAtRef.current > lastDetectedErrorAtRef.current;

    const shouldUseRecoveryMode =
      editedAfterError
      && missingFields.length === 0
      && !hasInlineFieldErrors;

    const errorMessages = shouldUseRecoveryMode
      ? []
      : Array.from(new Set([...contextErrors, ...inlineErrorMessages]));

    const hasErrorContext = errorMessages.length > 0 || (validationRecent && missingFields.length > 0);
    const primaryAction = getPrimarySubmitAction(content);

    const signature = JSON.stringify({
      path: location.pathname,
      missingFields,
      errorMessages: errorMessages.slice(0, 2),
      modeHint: shouldUseRecoveryMode ? 'recover' : 'normal'
    });

    const repeatedContext =
      signature === lastSpokenRef.current.signature && now - lastSpokenRef.current.time < 15000;

    let mode = 'full';
    if (errorOnlyMode || hasErrorContext) {
      mode = 'error';
    } else if (shouldUseRecoveryMode) {
      mode = 'recover';
    } else if (repeatedContext) {
      mode = 'repeat';
    }

    const actionTargets = getActionTargetElements(content.primaryButtons || []);
    const errorTargets = [
      ...inlineErrors.map((item) => item.element),
      ...missingFieldItems.map((item) => item.element)
    ];

    if (mode === 'error') {
      highlightElements(errorTargets.length > 0 ? errorTargets : actionTargets);
    } else if (mode === 'recover') {
      highlightElements(actionTargets);
    } else {
      highlightElements(actionTargets);
    }

    const text = buildSpeechText({
      content,
      missingFields,
      errorMessages,
      mode,
      primaryAction
    });

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.97;
    utterance.pitch = 1;
    utterance.volume = 1;

    const chosenVoice = chooseClearVoice(voices);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    lastSpokenRef.current = {
      signature,
      time: now
    };
  }, [content, errorOnlyMode, formErrors, highlightElements, location.pathname, voices]);

  useEffect(() => () => {
    stopSpeaking();
  }, [stopSpeaking]);

  return (
    <div className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setErrorOnlyMode((prev) => !prev)}
        className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wide border transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
          errorOnlyMode
            ? 'bg-amber-500 text-white border-amber-500'
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
        }`}
        aria-label="Toggle error only voice help"
        title="Toggle error only voice help"
      >
        {errorOnlyMode ? 'Error Only: ON' : 'Error Only: OFF'}
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={stopSpeaking}
          className="px-3 py-3 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold tracking-wide shadow-lg transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
          aria-label="Stop Voice Help"
          title="Stop Voice Help"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={speakHelp}
          className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          aria-label="Voice Help"
          title="Voice Help"
        >
          Voice Help
        </button>
      </div>
    </div>
  );
};

export default ContextVoiceHelpButton;
