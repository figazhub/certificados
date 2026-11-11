/* Victor Figueiredo — static, dependency-free website */
(() => {
  'use strict';

  // English is intentionally the default on every new page load.
  const languageButtons = document.querySelectorAll('[data-locale-button]');
  const bilingualNodes = document.querySelectorAll('[data-lang]');
  const form = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');

  let activeLanguage = 'en';
  function setLanguage(language) {
    activeLanguage = language === 'pt' ? 'pt' : 'en';
    document.documentElement.lang = activeLanguage === 'pt' ? 'pt-BR' : 'en';
    document.documentElement.dataset.locale = activeLanguage;
    bilingualNodes.forEach((element) => {
      element.hidden = element.dataset.lang !== activeLanguage;
    });
    document.querySelectorAll('[data-evidence-state-en], [data-evidence-state-pt]').forEach((node) => {
      node.hidden = activeLanguage === 'pt' ? node.hasAttribute('data-evidence-state-en') : node.hasAttribute('data-evidence-state-pt');
    });
    languageButtons.forEach((button) => {
      const isActive = button.dataset.localeButton === activeLanguage;
      button.setAttribute('aria-pressed', String(isActive));
    });
    if (feedback && feedback.dataset.messageKey) {
      setFeedback(feedback.dataset.messageKey);
    }
    const menuButton = document.getElementById('mobile-menu-button');
    if (menuButton) menuButton.setAttribute('aria-label', activeLanguage === 'en' ? 'Toggle navigation' : 'Alternar menu de navegação');
    const msg = document.querySelector('textarea[name="message"]');
    if (msg) msg.placeholder = activeLanguage === 'en'
      ? 'Tell me about your academy and the opportunity...'
      : 'Conte sobre sua academia e a oportunidade...';
  }

  languageButtons.forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.localeButton)));
  setLanguage('en');

  // Responsive navigation, with a proper expanded state.
  const menuButton = document.getElementById('mobile-menu-button');
  const navigation = document.getElementById('primary-navigation');
  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
      const open = navigation.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
    navigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navigation.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        navigation.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Avoid showing 404s as "official evidence". Upload the genuine PDFs/videos
  // under assets/ and these links become active after their HEAD request succeeds.
  async function checkEvidenceLink(link) {
    // Browser file:// previews cannot reliably check local files.
    if (window.location.protocol === 'file:') return;
    try {
      const url = new URL(link.getAttribute('href'), window.location.href);
      if (url.origin !== window.location.origin) return;
      const response = await fetch(url.href, { method: 'HEAD', cache: 'no-store' });
      if (!response.ok) return;
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
      link.classList.remove('evidence-gated');
      const card = link.closest('.legal-card');
      if (card) {
        const en = card.querySelector('[data-evidence-state-en] span');
        const pt = card.querySelector('[data-evidence-state-pt] span');
        if (en) en.textContent = 'File available — verify source';
        if (pt) pt.textContent = 'Arquivo disponível — verifique a fonte';
      }
      if (link.classList.contains('reel-button')) {
        const en = link.querySelector('[data-evidence-state-en]');
        const pt = link.querySelector('[data-evidence-state-pt]');
        if (en) en.textContent = 'Play video';
        if (pt) pt.textContent = 'Reproduzir vídeo';
      }
    } catch (_) {
      // Missing or inaccessible asset: keep the link unavailable.
    }
  }
  document.querySelectorAll('[data-evidence-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('aria-disabled') === 'true') event.preventDefault();
    });
    checkEvidenceLink(link);
  });

  const feedbackMessages = {
    configuration: {
      en: 'Contact form not yet connected. Set your Formspree form ID in index.html before publishing.',
      pt: 'Formulário ainda não conectado. Configure seu ID do Formspree no index.html antes da publicação.'
    }
  };
  function setFeedback(key) {
    if (!feedback) return;
    feedback.dataset.messageKey = key;
    feedback.textContent = feedbackMessages[key]?.[activeLanguage] || '';
  }
  if (form) {
    form.addEventListener('submit', (event) => {
      if (form.action.includes('YOUR_FORM_ID')) {
        event.preventDefault();
        setFeedback('configuration');
      }
      // Once configured, the native HTML POST is handled by Formspree.
      // No false success message is shown before the provider confirms receipt.
    });
  }
  const year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());
})();