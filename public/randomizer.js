(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const seedInput = $('seedInput');
  const resultCode = $('resultCode');
  const seedLength = $('seedLength');
  const resultLength = $('resultLength');
  const generateBtn = $('generateBtn');
  const copyBtn = $('copyBtn');
  const clearBtn = $('clearBtn');
  const statusText = $('statusText');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#';
  const MAX_LENGTH = 15;

  function setStatus(message, mode = '') {
    statusText.textContent = message;
    statusText.className = `status-text${mode ? ` ${mode}` : ''}`;
  }

  function randomInt(max) {
    if (!Number.isSafeInteger(max) || max < 1) throw new RangeError('max deve essere positivo');
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      // Rejection sampling evita il bias del semplice modulo.
      const range = 0x100000000;
      const limit = Math.floor(range / max) * max;
      const buffer = new Uint32Array(1);
      let n;
      do {
        window.crypto.getRandomValues(buffer);
        n = buffer[0];
      } while (n >= limit);
      return n % max;
    }
    return Math.floor(Math.random() * max);
  }

  function makeCode(length) {
    const safeLength = Math.max(0, Math.min(MAX_LENGTH, Math.floor(Number(length) || 0)));
    let out = '';
    for (let i = 0; i < safeLength; i += 1) out += alphabet[randomInt(alphabet.length)];
    return out;
  }

  function updateCounts() {
    const count = seedInput.value.length;
    const outputCount = Math.min(count, MAX_LENGTH);
    seedLength.textContent = `${count} caratter${count === 1 ? 'e' : 'i'}`;
    resultLength.textContent = `${resultCode.value.length} / ${MAX_LENGTH}`;
    generateBtn.disabled = count === 0;
    copyBtn.disabled = resultCode.value.length === 0;
    return outputCount;
  }

  function regenerate({ announce = true } = {}) {
    const length = updateCounts();
    if (!length) {
      resultCode.value = '';
      resultLength.textContent = `0 / ${MAX_LENGTH}`;
      copyBtn.disabled = true;
      generateBtn.disabled = true;
      if (announce) setStatus('Inserisci un testo per iniziare.');
      return;
    }
    resultCode.value = makeCode(length);
    resultLength.textContent = `${resultCode.value.length} / ${MAX_LENGTH}`;
    copyBtn.disabled = false;
    generateBtn.disabled = false;
    if (announce) setStatus(`Nuovo codice generato · ${resultCode.value.length} caratteri.`, 'success');
  }

  async function copyCode() {
    const value = resultCode.value;
    if (!value) return;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
      } else {
        resultCode.focus();
        resultCode.select();
        const ok = document.execCommand('copy');
        if (!ok) throw new Error('clipboard_unavailable');
      }
      setStatus('Codice copiato negli appunti.', 'success');
      copyBtn.innerHTML = '<span aria-hidden="true">✓</span> Copiato';
      window.setTimeout(() => { copyBtn.innerHTML = '<span aria-hidden="true">⧉</span> Copia'; }, 1300);
    } catch {
      resultCode.focus();
      resultCode.select();
      setStatus('Copia automatica non disponibile: seleziona il codice e copialo manualmente.', 'error');
    }
  }

  seedInput.addEventListener('input', () => regenerate());
  generateBtn.addEventListener('click', () => regenerate());
  copyBtn.addEventListener('click', copyCode);
  clearBtn.addEventListener('click', () => {
    seedInput.value = '';
    resultCode.value = '';
    updateCounts();
    seedInput.focus();
    setStatus('Campi puliti. Inserisci un testo per iniziare.');
  });
  seedInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      regenerate();
      resultCode.focus();
    }
  });

  updateCounts();
})();
