// DOM Elements
const htmlElement = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const dynamicGreeting = document.getElementById('dynamic-greeting');
const nameInput = document.getElementById('name-input');
const greetingSelect = document.getElementById('greeting-select');
const applyBtn = document.getElementById('apply-btn');
const guestbookForm = document.getElementById('guestbook-form');
const guestNameInput = document.getElementById('guest-name');
const guestMessageInput = document.getElementById('guest-message');
const guestbookList = document.getElementById('guestbook-list');
const clearMessagesBtn = document.getElementById('clear-messages-btn');
const yearSpan = document.getElementById('year');

// Keys for LocalStorage
const STORAGE_KEYS = {
  THEME: 'helloworld_theme',
  CUSTOM_GREETING: 'helloworld_greeting',
  MESSAGES: 'helloworld_guestbook_messages'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initGreeting();
  initGuestbook();
  initFooterYear();
});

/* Theme Handling */
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  setTheme(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });
}

function setTheme(theme) {
  htmlElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

/* Dynamic Greeting Handling */
function initGreeting() {
  const savedGreeting = localStorage.getItem(STORAGE_KEYS.CUSTOM_GREETING);
  if (savedGreeting) {
    try {
      const { text, target } = JSON.parse(savedGreeting);
      if (text) greetingSelect.value = text;
      if (target) nameInput.value = target;
      updateGreetingDisplay(text || 'Hello', target || 'World!');
    } catch (e) {
      console.error('Error parsing stored greeting:', e);
    }
  }

  applyBtn.addEventListener('click', () => {
    const greetingText = greetingSelect.value || 'Hello';
    const targetText = nameInput.value.trim() || 'World!';

    updateGreetingDisplay(greetingText, targetText);

    localStorage.setItem(STORAGE_KEYS.CUSTOM_GREETING, JSON.stringify({
      text: greetingText,
      target: targetText
    }));
  });
}

function updateGreetingDisplay(greeting, target) {
  const heroTitle = document.querySelector('.hero-title');
  heroTitle.childNodes[0].nodeValue = `${greeting}, `;
  dynamicGreeting.textContent = target.endsWith('!') || target.endsWith('?') ? target : `${target}!`;
}

/* Guestbook Handling */
function initGuestbook() {
  renderMessages();

  guestbookForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = guestNameInput.value.trim();
    const message = guestMessageInput.value.trim();

    if (!name || !message) return;

    const newMessage = {
      id: Date.now(),
      name,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString()
    };

    const messages = getStoredMessages();
    messages.unshift(newMessage);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));

    guestbookForm.reset();
    renderMessages();
  });

  clearMessagesBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all guestbook messages?')) {
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
      renderMessages();
    }
  });
}

function getStoredMessages() {
  const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Error reading guestbook messages from storage:', e);
    return [];
  }
}

function renderMessages() {
  const messages = getStoredMessages();

  if (messages.length === 0) {
    guestbookList.innerHTML = `<p class="empty-msg">No messages yet. Be the first to sign!</p>`;
    clearMessagesBtn.classList.add('hidden');
    return;
  }

  clearMessagesBtn.classList.remove('hidden');
  guestbookList.innerHTML = messages.map(msg => `
    <div class="message-item">
      <div class="message-header">
        <span class="message-author">${escapeHTML(msg.name)}</span>
        <span class="message-time">${escapeHTML(msg.timestamp)}</span>
      </div>
      <div class="message-text">${escapeHTML(msg.message)}</div>
    </div>
  `).join('');
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/* Footer Year */
function initFooterYear() {
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}
