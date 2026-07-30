document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  initOpenStatus();
  initHeaderStatus();
  initAvailabilityCalendar();
  initDateHandoff();
  initWhatsOnCarousel();
  initMenuToggle();
});

function initHeaderStatus() {
  const header = document.querySelector('.site-header');
  const badge = document.getElementById('header-status');
  if (!header || !badge || !header.dataset.hours) return;

  let hours;
  try {
    hours = JSON.parse(header.dataset.hours);
  } catch (e) {
    return;
  }

  const now = getMelbourneNow();
  const ranges = hours[String(now.day)] || [];
  const isOpen = ranges.some(([start, end]) => {
    return now.minutes >= toMinutes(start) && now.minutes < toMinutes(end);
  });

  badge.textContent = isOpen ? 'Open Now' : 'Closed';
  badge.classList.toggle('is-open', isOpen);
}

function initMenuToggle() {
  const buttons = document.querySelectorAll('.menu-toggle-btn');
  if (!buttons.length) return;

  const sections = document.querySelectorAll('.menu-section[data-period]');

  function applyFilter() {
    const activePeriods = Array.from(buttons)
      .filter(b => b.classList.contains('active'))
      .map(b => b.dataset.period);

    sections.forEach(section => {
      const show = activePeriods.length === 0 || activePeriods.includes(section.dataset.period);
      section.style.display = show ? '' : 'none';
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const wasActive = btn.classList.contains('active');
      buttons.forEach(b => b.classList.remove('active'));
      if (!wasActive) btn.classList.add('active');
      applyFilter();
    });
  });
}

function initWhatsOnCarousel() {
  const track = document.getElementById('wo-track');
  if (!track) return;

  const label = document.getElementById('wo-current-month');
  const prev = document.querySelector('.whats-on .wo-prev');
  const next = document.querySelector('.whats-on .wo-next');
  const cards = Array.from(track.querySelectorAll('.wo-card'));

  // Treat every card as a numbered programme file, oldest = 01.
  cards.forEach((card, i) => {
    const photo = card.querySelector('.wo-card-photo');
    if (!photo || photo.querySelector('.wo-card-file')) return;
    const file = document.createElement('span');
    file.className = 'wo-card-file';
    file.textContent = `FILE ${String(i + 1).padStart(2, '0')}`;
    photo.appendChild(file);
  });

  function updateLabel() {
    if (!label || !cards.length) return;
    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    let closest = cards[0];
    let closestDist = Infinity;
    cards.forEach(card => {
      const r = card.getBoundingClientRect();
      const dist = Math.abs((r.left + r.width / 2) - trackCenter);
      if (dist < closestDist) { closestDist = dist; closest = card; }
    });
    const month = closest.dataset.month;
    if (month && label.textContent !== month) label.textContent = month;
  }

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { updateLabel(); ticking = false; });
      ticking = true;
    }
  });

  const scrollAmount = () => (cards[0]?.offsetWidth || 300) + 20;
  prev?.addEventListener('click', () => track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
  next?.addEventListener('click', () => track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));

  // Cards are laid out oldest-to-newest (left = past, right = future) so the
  // nav arrows read naturally, but the track opens scrolled to the first
  // upcoming card so visitors see what's on next without scrolling left.
  const firstUpcoming = cards.find(c => c.classList.contains('is-upcoming'));
  if (firstUpcoming) track.scrollLeft = firstUpcoming.offsetLeft;

  updateLabel();
}

const VENUE_TZ = 'Australia/Melbourne';

function getMelbourneNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });

  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minutes = hour * 60 + parseInt(map.minute, 10);

  return { day: dowMap[map.weekday], minutes };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h === 24 ? 24 : h) * 60 + m;
}

function initOpenStatus() {
  const table = document.getElementById('hours-table');
  const status = document.getElementById('open-status');
  if (!table || !status) return;

  let hours;
  try {
    hours = JSON.parse(table.dataset.hours);
  } catch (e) {
    return;
  }

  const now = getMelbourneNow();
  const ranges = hours[String(now.day)] || [];
  const isOpen = ranges.some(([start, end]) => {
    return now.minutes >= toMinutes(start) && now.minutes < toMinutes(end);
  });

  const today = document.getElementById('hours-today');
  const todayRow = table.rows[now.day];
  if (today && todayRow) {
    today.innerHTML = `<span class="hours-today-day">${todayRow.cells[0].textContent}</span>` +
      `<span class="hours-today-time">${todayRow.cells[1].textContent}</span>`;
  }

  const dot = status.querySelector('.status-dot');
  if (isOpen) {
    status.lastChild.textContent = ' Open now';
    if (dot) dot.style.background = '#d99a3d';
  } else {
    status.lastChild.textContent = ' Closed — see hours above';
    if (dot) dot.style.background = '#5a5a56';
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function initAvailabilityCalendar() {
  const el = document.getElementById('availability-cal');
  if (!el) return;

  const grid = document.getElementById('cal-grid');
  const monthLabel = document.getElementById('cal-month-label');
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');
  const bookingUrl = el.dataset.bookingUrl || 'events.html';

  let events = {};
  try {
    events = JSON.parse(el.dataset.events || '{}');
  } catch (e) {
    events = {};
  }

  const todayIso = getMelbourneTodayIso();
  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();

  function pad(n) { return String(n).padStart(2, '0'); }

  function render() {
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startDow = first.getDay();

    monthLabel.textContent = first.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

    let html = '';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
      html += `<div class="cal-dow">${d}</div>`;
    });

    for (let i = 0; i < startDow; i++) {
      html += '<div class="cal-day empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
      const event = events[iso];
      const isPast = iso < todayIso;

      if (isPast) {
        html += `<div class="cal-day past">${d}</div>`;
        continue;
      }

      if (event) {
        const cls = event.type === 'private' ? 'private' : 'session';
        const title = event.title || (event.type === 'private' ? 'Private event' : 'Live session');
        const time = event.time ? ` — ${escapeHtml(event.time)}` : '';
        const tipLabel = event.type === 'private' ? 'Venue unavailable' : 'Live session';
        html += `<button type="button" class="cal-day ${cls}" data-iso="${iso}">${d}` +
          `<span class="cal-tip"><strong>${tipLabel}${time}</strong>${escapeHtml(title)}</span>` +
          `</button>`;
      } else {
        html += `<button type="button" class="cal-day available" data-iso="${iso}">${d}` +
          `<span class="cal-tip"><strong>Available</strong>Tap to enquire about ${new Date(viewYear, viewMonth, d).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>` +
          `</button>`;
      }
    }

    grid.innerHTML = html;

    grid.querySelectorAll('.cal-day.available').forEach(btn => {
      btn.addEventListener('click', () => {
        const iso = btn.dataset.iso;
        window.location.href = `${bookingUrl}?date=${iso}#functions`;
      });
    });

    // Tap-to-toggle tooltip for touch devices on non-navigable (occupied) days
    grid.querySelectorAll('.cal-day.session, .cal-day.private').forEach(btn => {
      btn.addEventListener('click', () => {
        const wasOpen = btn.classList.contains('tip-open');
        grid.querySelectorAll('.cal-day.tip-open').forEach(b => b.classList.remove('tip-open'));
        if (!wasOpen) btn.classList.add('tip-open');
      });
    });
  }

  prevBtn.addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    render();
  });
  nextBtn.addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    render();
  });

  render();
}

function getMelbourneTodayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VENUE_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });
  return `${map.year}-${map.month}-${map.day}`;
}

function initDateHandoff() {
  const params = new URLSearchParams(window.location.search);
  const iso = params.get('date');
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;

  const formatted = new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // On events.html: point the "Enquire Now" CTA at the contact form with the date carried over
  const ctaLink = document.querySelector('.plan-event-cta .cta-link');
  if (ctaLink) {
    ctaLink.href = `index.html?date=${iso}#contact`;
    const note = document.createElement('p');
    note.className = 'plan-event-note';
    note.textContent = `Enquiring about: ${formatted}`;
    ctaLink.parentElement.insertBefore(note, ctaLink);
  }

  // On index.html: prefill the contact form
  const dateField = document.getElementById('preferred_date');
  const reasonField = document.getElementById('reason');
  const note = document.getElementById('date-handoff-note');
  if (dateField) {
    dateField.value = iso;
    if (reasonField) reasonField.value = 'Private Event / Venue Booking';
    if (note) {
      note.hidden = false;
      note.textContent = `Enquiring about ${formatted} — feel free to adjust the date above if needed.`;
    }
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
