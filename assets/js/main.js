/**
 * iMemo Smart Clipboard - Minimalist Client Logic
 * Features: OS Auto-Detection, Binary Downloads, Dark/Light Theme Toggle, FAQ Accordion
 */

(function () {
  'use strict';

  // --- Release & Download Constants ---
  const VERSION = '0.1.0';
  const DOWNLOAD_URLS = {
    WINDOWS: `https://github.com/lwshakib/imemo-smart-clipboard/releases/download/v${VERSION}/iMemo-Smart-Clipboard-Windows-${VERSION}-Setup.exe`,
    MAC: `https://github.com/lwshakib/imemo-smart-clipboard/releases/download/v${VERSION}/iMemo-Smart-Clipboard-Mac-${VERSION}.dmg`,
    LINUX_APPIMAGE: `https://github.com/lwshakib/imemo-smart-clipboard/releases/download/v${VERSION}/iMemo-Smart-Clipboard-Linux-${VERSION}.AppImage`,
    LINUX_DEB: `https://github.com/lwshakib/imemo-smart-clipboard/releases/download/v${VERSION}/iMemo-Smart-Clipboard-Linux-${VERSION}.deb`,
    LINUX_RPM: `https://github.com/lwshakib/imemo-smart-clipboard/releases/download/v${VERSION}/iMemo-Smart-Clipboard-Linux-${VERSION}.rpm`
  };

  // --- OS Detection ---
  function detectClientOS() {
    const userAgent = window.navigator.userAgent || '';
    const platform = window.navigator.platform || '';

    if (/Win/i.test(userAgent) || /Win/i.test(platform)) {
      return 'windows';
    }
    if (/Mac/i.test(userAgent) || /Mac/i.test(platform)) {
      return 'macos';
    }
    if (/Linux/i.test(userAgent) || /Linux/i.test(platform)) {
      return 'linux';
    }
    return 'windows';
  }

  function setupOSDownloads() {
    const os = detectClientOS();
    const heroBtn = document.getElementById('hero-download-btn');
    const heroOsText = document.getElementById('hero-os-name');
    const heroOsHint = document.getElementById('hero-os-detected-hint');

    let downloadUrl = DOWNLOAD_URLS.WINDOWS;
    let osLabel = 'Windows';
    let fileDesc = 'Windows 10 / 11 (x64)';

    if (os === 'macos') {
      downloadUrl = DOWNLOAD_URLS.MAC;
      osLabel = 'macOS';
      fileDesc = 'macOS 12+ (Apple Silicon & Intel)';
    } else if (os === 'linux') {
      downloadUrl = DOWNLOAD_URLS.LINUX_APPIMAGE;
      osLabel = 'Linux';
      fileDesc = 'Universal AppImage / .deb / .rpm';
    }

    if (heroBtn && heroOsText) {
      heroBtn.href = downloadUrl;
      heroOsText.textContent = `Download for ${osLabel}`;
    }

    if (heroOsHint) {
      heroOsHint.textContent = fileDesc;
    }

    // Highlight card in download section
    const targetCard = document.getElementById(`card-download-${os}`);
    if (targetCard) {
      targetCard.classList.add('detected-recommended');
      const badge = document.createElement('div');
      badge.className = 'detected-badge';
      badge.textContent = 'Detected OS';
      targetCard.prepend(badge);
    }
  }

  // --- Theme Toggle (Dark / Light) ---
  function setupTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('imemo-theme') || 'dark';

    applyTheme(savedTheme);

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        localStorage.setItem('imemo-theme', nextTheme);
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    if (sunIcon && moonIcon) {
      if (theme === 'light') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      }
    }
  }

  // --- FAQ Accordion ---
  function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach((item) => {
      const questionBtn = item.querySelector('.faq-question');
      const answerEl = item.querySelector('.faq-answer');

      if (questionBtn && answerEl) {
        questionBtn.addEventListener('click', () => {
          const isOpen = item.classList.contains('open');

          faqItems.forEach((other) => {
            if (other !== item) {
              other.classList.remove('open');
              const otherAnswer = other.querySelector('.faq-answer');
              if (otherAnswer) otherAnswer.style.maxHeight = null;
            }
          });

          if (isOpen) {
            item.classList.remove('open');
            answerEl.style.maxHeight = null;
          } else {
            item.classList.add('open');
            answerEl.style.maxHeight = answerEl.scrollHeight + 20 + 'px';
          }
        });
      }
    });
  }

  // --- Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    const yr = document.getElementById('year');
    if (yr) yr.textContent = new Date().getFullYear();

    setupTheme();
    setupOSDownloads();
    setupFAQ();
  });
})();
