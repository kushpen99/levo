/* =============================================================================
 * reflectUtils.js
 * -----------------------------------------------------------------------------
 * Utilities for detecting and rendering the custom reflection cue token
 * `<<reflect>>` inside scenario text strings, turning it into an interactive
 * reflection widget that can collect short-form student responses *before*
 * they choose an option.
 *
 * Design goals:
 *   • Simple string-level transform (safe to run after HTML sanitization or
 *     after codeTagUtils.transformCodeTags()).
 *   • Localizable UI labels (Hebrew / RTL friendly out of the box).
 *   • Supports two UX modes: "inline" (options always enabled) and "gated"
 *     (options disabled until reflection submitted / skipped).
 *   • Emits CustomEvents (reflect:submit, reflect:skip) so host app can log,
 *     persist, score, or adapt difficulty.
 *   • Zero external deps; plain browser JS.
 *
 * Integration pattern:
 *   import { transformReflectTokens, activateReflect } from './reflectUtils.js';
 *   const html = transformReflectTokens(rawScenarioText, { scenarioId, labels: {...} });
 *   container.innerHTML = html;
 *   activateReflect(container, {
 *     scenarioId,
 *     mode: 'gated',
 *     onSubmit: ({text,scenarioId}) => { / * store * / },
 *     onSkip:   ({scenarioId}) => { / * analytics * / },
 *     optionSelector: '[data-option-id]', // how your option buttons are marked
 *   });
 *
 * NOTE ON RTL: The widget textarea uses dir="auto" so user typing flows naturally.
 * You may override with a fixed direction in options.labels if needed.
 *
 * --------------------------------------------------------------------------- */

// ------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------
const REFLECT_TOKEN_RE = /<<reflect>>/i; // case-insensitive match once
const DEFAULT_MODE = 'inline'; // 'inline' | 'gated'

const DEFAULT_LABELS = {
  heading: '🟡 Reflection Moment',
  explanation: 'Thinking before acting helps you learn more deeply!',
  prompt: 'Pause & predict: what do you do next?',
  submit: 'Submit Reflection',
  skip: 'Skip',
};

// ------------------------------------------------------------------------
// HTML Template Builder
// ---------------------------------------------------------------------
function buildReflectWidgetHtml({ scenarioId, labels = {}, mode = DEFAULT_MODE }) {
  const { heading, explanation, prompt, submit, skip } = { ...DEFAULT_LABELS, ...labels };
  return (
    '<div class="reflect-cue" data-reflect="true" data-mode="' +
    escapeAttr(mode) +
    '"' + (scenarioId ? ' data-scenario-id="' + escapeAttr(scenarioId) + '"' : '') +
    ' style="border:2px solid #ffd700; background:#fffbe6; border-radius:8px; padding:1em; margin:1em 0;">' +
      '<div style="font-weight:bold; margin-bottom:0.5em; color:#ff9800;">' + escapeHtml(heading) + '</div>' +
      '<div style="margin-bottom:0.5em;">' + escapeHtml(explanation) + '</div>' +
      '<label class="reflect-label" style="margin-bottom:0.5em;">' + escapeHtml(prompt) + '</label>' +
      '<textarea class="reflect-text" rows="2" dir="auto" style="width:100%;"></textarea>' +
      '<div class="reflect-actions" style="margin-top:0.5em;">' +
        '<button type="button" class="reflect-submit" data-reflect-submit="true">' + escapeHtml(submit) + '</button>' +
        '<button type="button" class="reflect-skip" data-reflect-skip="true">' + escapeHtml(skip) + '</button>' +
      '</div>' +
    '</div>'
  );
}

// ------------------------------------------------------------------------
// Escaping helpers
// ---------------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '&#96;');
}

// ------------------------------------------------------------------------
// transformReflectTokens(text, opts)
// Replaces the first (recommended: only) instance of <<reflect>> with widget.
// If token not found, optionally append widget if opts.force === true.
// Returns transformed HTML string.
// ---------------------------------------------------------------------
function transformReflectTokens(text, opts = {}) {
  if (text == null) return '';
  const { scenarioId, labels, mode = DEFAULT_MODE, force = false } = opts;

  // If feature is not active, just remove the token
  if (!REFLECT_FEATURE_ACTIVE) {
    return text.replace(REFLECT_TOKEN_RE, '');
  }

  let replaced = false;
  let out = text.replace(REFLECT_TOKEN_RE, function () {
    replaced = true;
    return buildReflectWidgetHtml({ scenarioId, labels, mode });
  });

  if (!replaced && force) {
    out += '\n' + buildReflectWidgetHtml({ scenarioId, labels, mode });
  }
  return out;
}

// ------------------------------------------------------------------------
// activateReflect(containerEl, opts)
// Wire up event handlers and (optionally) gating behavior.
//
// opts:
//   scenarioId?: string (fallback if data attr missing)
//   mode?: 'inline'|'gated' (default inline)
//   onSubmit?: fn({text,scenarioId,el})
//   onSkip?:   fn({scenarioId,el})
//   optionSelector?: CSS selector for decision option UI elements to gate.
//   disableOptions?: fn(containerEl)
//   enableOptions?: fn(containerEl)
//   restoreText?: string previously saved user reflection (prefill textarea)
//
// Returns {submitted:boolean, skipped:boolean, text:string|null}.
// ---------------------------------------------------------------------
function activateReflect(containerEl, opts = {}) {
  if (!containerEl) return { submitted: false, skipped: false, text: null };
  const widget = containerEl.querySelector('.reflect-cue[data-reflect]');
  if (!widget) return { submitted: false, skipped: false, text: null };

  const mode = opts.mode || widget.getAttribute('data-mode') || DEFAULT_MODE;
  const scenarioId = widget.getAttribute('data-scenario-id') || opts.scenarioId || null;
  const ta = widget.querySelector('.reflect-text');
  const btnSubmit = widget.querySelector('[data-reflect-submit]');
  const btnSkip = widget.querySelector('[data-reflect-skip]');

  if (typeof opts.restoreText === 'string' && ta) {
    ta.value = opts.restoreText;
  }

  // gating
  if (mode === 'gated') {
    if (typeof opts.disableOptions === 'function') {
      opts.disableOptions(containerEl);
    } else if (opts.optionSelector) {
      disableElements(containerEl, opts.optionSelector, true);
    }
  }

  let state = { submitted: false, skipped: false, text: null };

  if (btnSubmit) {
    btnSubmit.addEventListener('click', function () {
      const text = ta ? ta.value.trim() : '';
      state.submitted = true;
      state.text = text;
      widget.setAttribute('data-reflect-complete', 'submitted');
      // enable options
      if (mode === 'gated') {
        if (typeof opts.enableOptions === 'function') {
          opts.enableOptions(containerEl);
        } else if (opts.optionSelector) {
          disableElements(containerEl, opts.optionSelector, false);
        }
      }
      // callback
      if (typeof opts.onSubmit === 'function') {
        opts.onSubmit({ text, scenarioId, el: widget });
      }
      // dispatch DOM event
      dispatchReflectEvent(widget, 'reflect:submit', { text, scenarioId });
    });
  }

  if (btnSkip) {
    btnSkip.addEventListener('click', function () {
      state.skipped = true;
      widget.setAttribute('data-reflect-complete', 'skipped');
      if (mode === 'gated') {
        if (typeof opts.enableOptions === 'function') {
          opts.enableOptions(containerEl);
        } else if (opts.optionSelector) {
          disableElements(containerEl, opts.optionSelector, false);
        }
      }
      if (typeof opts.onSkip === 'function') {
        opts.onSkip({ scenarioId, el: widget });
      }
      dispatchReflectEvent(widget, 'reflect:skip', { scenarioId });
    });
  }

  return state;
}

// ------------------------------------------------------------------------
// disableElements(parent, selector, disabled)
// Utility: toggles disabled attr + aria-disabled on matched elements.
// ---------------------------------------------------------------------
function disableElements(parent, selector, disabled) {
  const els = parent.querySelectorAll(selector);
  els.forEach(el => {
    if (disabled) {
      el.setAttribute('disabled', '');
      el.setAttribute('aria-disabled', 'true');
      el.classList.add('is-disabled');
    } else {
      el.removeAttribute('disabled');
      el.setAttribute('aria-disabled', 'false');
      el.classList.remove('is-disabled');
    }
  });
}

// ------------------------------------------------------------------------
// dispatchReflectEvent(el, name, detail)
// Custom DOM events so the host app can listen globally.
// ---------------------------------------------------------------------
function dispatchReflectEvent(el, name, detail) {
  const evt = new CustomEvent(name, { detail, bubbles: true });
  el.dispatchEvent(evt);
}

// ------------------------------------------------------------------------
// getReflectText(containerEl)
// Helper to retrieve current textarea value (if widget present).
// ---------------------------------------------------------------------
function getReflectText(containerEl) {
  const ta = containerEl?.querySelector?.('.reflect-cue[data-reflect] .reflect-text');
  return ta ? ta.value : '';
}

// ------------------------------------------------------------------------
// cssSuggestion – copy/paste minimal styles
// ---------------------------------------------------------------------
const cssSuggestion = `
.reflect-cue {
  margin: 0.75rem 0;
  padding: 0.75rem;
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 0.5rem;
  background: rgba(255,255,0,0.08);
}
.reflect-label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 600;
}
.reflect-text {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0.5rem;
  resize: vertical;
}
.reflect-actions {
  display: flex;
  gap: 0.5rem;
}
.reflect-actions button[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
`;

// ------------------------------------------------------------------------
// Combined convenience: transform + activate in one call
// Optionally passes through codeTagUtils first if available.
// ---------------------------------------------------------------------
function renderScenarioWithReflect(rawText, containerEl, opts = {}) {
  // Optionally run codeTagUtils if global present & opts.transformCode !== false
  let t = rawText;
  if (typeof opts.transformCode === 'undefined' || opts.transformCode) {
    if (typeof codeTagUtils !== 'undefined' && codeTagUtils.transformCodeTags) {
      t = codeTagUtils.transformCodeTags(t);
    }
  }
  t = transformReflectTokens(t, opts);
  containerEl.innerHTML = t;
  return activateReflect(containerEl, opts);
}

// ------------------------------------------------------------------------
// Public API (ES module exports)
// ---------------------------------------------------------------------
export {
  REFLECT_TOKEN_RE,
  transformReflectTokens,
  activateReflect,
  getReflectText,
  renderScenarioWithReflect,
  cssSuggestion,
};

// Global flag to enable/disable the reflect feature
export const REFLECT_FEATURE_ACTIVE = false;
