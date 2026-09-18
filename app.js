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
  MESSAGES: 'helloworld_guestbook_messages',
  CHECKIN_QUEUE: 'helloworld_checkin_queue',
  MY_TICKET_ID: 'helloworld_my_ticket_id'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initGreeting();
  initCheckin();
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
      updateGreetingDisplay(text || 'Hello', target || 'Scrumdog Team!');
    } catch (e) {
      console.error('Error parsing stored greeting:', e);
    }
  }

  applyBtn.addEventListener('click', () => {
    const greetingText = greetingSelect.value || 'Hello';
    const targetText = nameInput.value.trim() || 'Scrumdog Team!';

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

/* Remote Patient Check-In Handling */
function initCheckin() {
  const checkinFormContainer = document.getElementById('checkin-form-container');
  const checkinForm = document.getElementById('checkin-form');
  const activeTicketCard = document.getElementById('active-ticket-card');
  const cancelCheckinBtn = document.getElementById('cancel-checkin-btn');

  renderCheckinUI();

  if (checkinForm) {
    checkinForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('patient-name');
      const phoneInput = document.getElementById('patient-phone');
      const reasonSelect = document.getElementById('visit-reason');

      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      const reason = reasonSelect.value;

      if (!name || !phone || !reason) return;

      const queue = getStoredQueue();
      const ticketNum = Math.floor(100 + Math.random() * 900);
      const ticketId = `T-${ticketNum}`;

      const newTicket = {
        id: Date.now().toString(),
        ticketId,
        name,
        phone,
        reason,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      queue.push(newTicket);
      localStorage.setItem(STORAGE_KEYS.CHECKIN_QUEUE, JSON.stringify(queue));
      localStorage.setItem(STORAGE_KEYS.MY_TICKET_ID, newTicket.id);

      checkinForm.reset();
      renderCheckinUI();
    });
  }

  if (cancelCheckinBtn) {
    cancelCheckinBtn.addEventListener('click', () => {
      const myTicketId = localStorage.getItem(STORAGE_KEYS.MY_TICKET_ID);
      if (!myTicketId) return;

      let queue = getStoredQueue();
      queue = queue.filter(item => item.id !== myTicketId);

      localStorage.setItem(STORAGE_KEYS.CHECKIN_QUEUE, JSON.stringify(queue));
      localStorage.removeItem(STORAGE_KEYS.MY_TICKET_ID);

      renderCheckinUI();
    });
  }
}

function getStoredQueue() {
  const stored = localStorage.getItem(STORAGE_KEYS.CHECKIN_QUEUE);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Error reading checkin queue from storage:', e);
    return [];
  }
}

function renderCheckinUI() {
  const checkinFormContainer = document.getElementById('checkin-form-container');
  const activeTicketCard = document.getElementById('active-ticket-card');
  const queueList = document.getElementById('queue-list');

  const myTicketId = localStorage.getItem(STORAGE_KEYS.MY_TICKET_ID);
  const queue = getStoredQueue();

  const myIndex = queue.findIndex(item => item.id === myTicketId);

  if (myIndex !== -1) {
    const myTicket = queue[myIndex];
    const position = myIndex + 1;
    const waitTimeMinutes = (position - 1) * 15;

    document.getElementById('ticket-id-display').textContent = `#${myTicket.ticketId}`;
    document.getElementById('ticket-position-display').textContent = `#${position}`;
    document.getElementById('ticket-wait-display').textContent = position === 1 ? 'Next in line' : `~${waitTimeMinutes} mins`;
    document.getElementById('ticket-patient-display').textContent = myTicket.name;
    document.getElementById('ticket-reason-display').textContent = myTicket.reason;
    document.getElementById('ticket-time-display').textContent = myTicket.timestamp;

    checkinFormContainer.classList.add('hidden');
    activeTicketCard.classList.remove('hidden');
  } else {
    // If ticket was removed or user doesn't have active ticket
    localStorage.removeItem(STORAGE_KEYS.MY_TICKET_ID);
    checkinFormContainer.classList.remove('hidden');
    activeTicketCard.classList.add('hidden');
  }

  // Render Queue List
  if (!queueList) return;

  if (queue.length === 0) {
    queueList.innerHTML = `<p class="empty-msg">No patients currently in line.</p>`;
    return;
  }

  queueList.innerHTML = queue.map((item, index) => {
    const isMe = item.id === myTicketId;
    return `
      <div class="queue-item ${isMe ? 'active-user-item' : ''}">
        <div class="queue-patient-info">
          <span class="queue-patient-name">${escapeHTML(item.name)} ${isMe ? '(You)' : ''}</span>
          <span class="queue-patient-reason">${escapeHTML(item.reason)} — Checked in ${escapeHTML(item.timestamp)}</span>
        </div>
        <div class="queue-position-badge">#${index + 1} in line</div>
      </div>
    `;
  }).join('');
}

/* Footer Year */
function initFooterYear() {
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}
