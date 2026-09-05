document.addEventListener('DOMContentLoaded', () => {
  initProgrammeIntro();
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    if (!links.id) links.id = 'primary-navigation';
    toggle.setAttribute('aria-controls', links.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Toggle menu');
    });
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => closeNavigation(toggle, links));
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeNavigation(toggle, links);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) closeNavigation(toggle, links);
    }, { passive: true });
  }

  initOpenStatus();
  initHeaderStatus();
  initAvailabilityCalendar();
  initDateHandoff();
  initWhatsOnCarousel();
  initMenuToggle();
  initPackageSelector();
  initPackageHandoff();
  initContactReasonHandoff();
  initEditorialMotion();
});

function initProgrammeIntro() {
  const intro = document.getElementById('programme-intro');
  if (!intro) return;

  const reducedMotion = prefersReducedMotion();
  let lastSeen = '';
  const introStorageKey = 'acidity-programme-intro-seen-v5';
  try { lastSeen = localStorage.getItem(introStorageKey) || ''; } catch (error) {}

  const dayParts = new Intl.DateTimeFormat('en', {
    timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).reduce((parts, part) => {
    if (part.type !== 'literal') parts[part.type] = part.value;
    return parts;
  }, {});
  const melbourneDay = `${dayParts.year}-${dayParts.month}-${dayParts.day}`;
  const isReturnVisit = lastSeen === melbourneDay;

  if (typeof VENUE_EVENTS !== 'undefined') {
    const today = melbourneDay;
    const featured = VENUE_EVENTS.find(event => event.isPublic && event.poster && event.dateStart >= today);
    if (featured) {
      const poster = intro.querySelector('[data-intro-poster]');
      const title = intro.querySelector('[data-intro-title]');
      const date = intro.querySelector('[data-intro-date]');
      if (poster) {
        poster.src = `assets/images/${featured.poster}`;
        poster.alt = `${featured.title} poster`;
      }
      if (title) title.textContent = featured.title;
      if (date) {
        const parts = featured.dateStart.split('-');
        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        date.textContent = `${parts[2]} ${months[Number(parts[1]) - 1]} ${parts[0]}`;
      }
    }
  }

  if (reducedMotion) {
    intro.remove();
    return;
  }

  const duration = isReturnVisit ? 700 : 3200;
  intro.classList.toggle('is-quick', isReturnVisit);
  intro.setAttribute('aria-hidden', 'false');
  document.body.classList.add('programme-intro-open');
  requestAnimationFrame(() => intro.classList.add('is-playing'));

  let timer = window.setTimeout(close, duration);
  function close() {
    if (intro.classList.contains('is-closing')) return;
    window.clearTimeout(timer);
    intro.classList.add('is-closing');
    document.body.classList.remove('programme-intro-open');
    try { localStorage.setItem(introStorageKey, melbourneDay); } catch (error) {}
    window.setTimeout(() => intro.remove(), 850);
  }

  intro.querySelector('.programme-intro-skip')?.addEventListener('click', close);
  intro.addEventListener('click', event => {
    if (event.target.closest('.programme-intro-skip')) return;
    close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Enter') close();
  }, { once: true });
}

function closeNavigation(toggle, links) {
  links.classList.remove('open');
  toggle.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Toggle menu');
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function initEditorialMotion() {
  document.documentElement.classList.add('motion-ready');

  const hero = document.querySelector('.hero-feature');
  if (hero) {
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-entered')));
  }

  const revealSelectors = [
    '.about > *',
    '#events-preview .section-label',
    '#events-preview .wo-head',
    '#events-preview > .whats-on-inner > .section-intro',
    '.feature-programme-inner',
    '.field-note',
    '.availability > *',
    '.cal',
    '.run-item',
    '.programme-index li:not(.pi-month)',
    '.gallery-item'
  ];
  const revealItems = Array.from(document.querySelectorAll(revealSelectors.join(',')));
  revealItems.forEach(item => item.classList.add('motion-reveal'));

  [
    '.field-notes-track',
    '.run-list',
    '.programme-index',
    '.gallery-grid',
    '.availability'
  ].forEach(selector => {
    document.querySelectorAll(selector).forEach(group => {
      Array.from(group.children).forEach((item, index) => {
        item.style.setProperty('--reveal-delay', `${Math.min(index, 7) * 55}ms`);
      });
    });
  });

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    revealItems.forEach(item => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

  revealItems.forEach(item => observer.observe(item));
}

function initPackageSelector() {
  const track = document.getElementById('pkg-track');
  if (!track) return;

  const panels = Array.from(track.querySelectorAll('.pkg-panel'));
  const indexLabel = document.getElementById('pkg-index');
  const prev = document.querySelector('.pkg-prev');
  const next = document.querySelector('.pkg-next');
  let activeIndex = 0;

  function setActive(i) {
    activeIndex = Math.max(0, Math.min(panels.length - 1, i));
    panels.forEach((p, idx) => p.classList.toggle('is-active', idx === activeIndex));
    if (indexLabel) {
      indexLabel.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}`;
    }
  }

  panels.forEach((p, idx) => {
    p.addEventListener('click', () => {
      setActive(idx);
      p.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  });

  prev?.addEventListener('click', () => {
    setActive(activeIndex - 1);
    panels[activeIndex].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  });
  next?.addEventListener('click', () => {
    setActive(activeIndex + 1);
    panels[activeIndex].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  });

  setActive(0);
}

function initPackageHandoff() {
  const params = new URLSearchParams(window.location.search);
  const pkg = params.get('package');
  if (!pkg) return;

  const reasonField = document.getElementById('reason');
  const messageField = document.getElementById('message');
  if (reasonField) reasonField.value = 'Private Event / Venue Booking';
  if (messageField && !messageField.value) {
    messageField.value = `Enquiring about the ${pkg} package. `;
  }
  document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function initContactReasonHandoff() {
  const reason = new URLSearchParams(window.location.search).get('reason');
  if (!reason) return;
  const reasonField = document.getElementById('reason');
  if (reasonField && Array.from(reasonField.options).some(option => option.value === reason)) {
    reasonField.value = reason;
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function initHeaderStatus() {
  const header = document.querySelector('.site-header');
  const badge = document.getElementById('header-status');
  if (!header || !badge || !header.dataset.hours) return;

  try {
    const hours = JSON.parse(header.dataset.hours);
    const now = getMelbourneNow();
    const ranges = hours[String(now.day)] || [];
    const isOpen = ranges.some(([start, end]) => {
      return now.minutes >= toMinutes(start) && now.minutes < toMinutes(end);
    });

    badge.textContent = isOpen ? 'Open Now' : 'Closed';
    badge.classList.toggle('is-open', isOpen);
  } catch (e) {
    // Leave the neutral "···" placeholder already in the HTML.
  }
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

  function updateCarouselState() {
    if (!cards.length) return;
    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    let closest = cards[0];
    let closestDist = Infinity;
    cards.forEach(card => {
      const r = card.getBoundingClientRect();
      const dist = Math.abs((r.left + r.width / 2) - trackCenter);
      if (dist < closestDist) { closestDist = dist; closest = card; }
    });

    cards.forEach(card => card.classList.toggle('is-focused', card === closest));

    const month = closest.dataset.month;
    if (label && month && label.textContent !== month) {
      label.textContent = month;
      if (!prefersReducedMotion()) {
        label.classList.remove('is-changing');
        void label.offsetWidth;
        label.classList.add('is-changing');
      }
    }
  }

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { updateCarouselState(); ticking = false; });
      ticking = true;
    }
  });

  const scrollAmount = () => (cards[0]?.offsetWidth || 300) + 20;
  prev?.addEventListener('click', () => track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
  next?.addEventListener('click', () => track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
  window.addEventListener('resize', () => requestAnimationFrame(updateCarouselState), { passive: true });

  // Cards are laid out oldest-to-newest (left = past, right = future) so the
  // nav arrows read naturally, but the track opens scrolled to the first
  // upcoming card so visitors see what's on next without scrolling left.
  const firstUpcoming = cards.find(c => c.classList.contains('is-upcoming'));
  if (firstUpcoming) {
    track.scrollLeft = firstUpcoming.offsetLeft - (track.clientWidth - firstUpcoming.offsetWidth) / 2;
  }

  updateCarouselState();
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
  // The full weekly hours table is always visible in the HTML (see the
  // `open` attribute on its <details>) as a static fallback, so this only
  // needs to *enhance* that with today's line + a live open/closed dot.
  // Wrapped in try/catch so any unexpected runtime issue leaves the static
  // "See hours below" text in place rather than nothing at all.
  const table = document.getElementById('hours-table');
  const status = document.getElementById('open-status');
  const today = document.getElementById('hours-today');
  if (!table || !status) return;

  try {
    const hours = JSON.parse(table.dataset.hours);
    const now = getMelbourneNow();
    const ranges = hours[String(now.day)] || [];
    const isOpen = ranges.some(([start, end]) => {
      return now.minutes >= toMinutes(start) && now.minutes < toMinutes(end);
    });

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
      status.lastChild.textContent = ' Closed — see hours below';
      if (dot) dot.style.background = '#5a5a56';
    }
  } catch (e) {
    // Static fallback text already in the HTML covers this case.
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
  let renderTimer = null;

  function pad(n) { return String(n).padStart(2, '0'); }

  function render(direction = 0) {
    const draw = () => {
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
        const typeInfo = {
          private: { cls: 'private', tip: 'Venue unavailable', fallback: 'Private event' },
          feature: { cls: 'feature', tip: 'Feature programme', fallback: 'Feature programme' }
        }[event.type] || { cls: 'session', tip: 'Live session', fallback: 'Live session' };
        const title = event.title || typeInfo.fallback;
        const time = event.time ? ` — ${escapeHtml(event.time)}` : '';
        html += `<button type="button" class="cal-day ${typeInfo.cls}" data-iso="${iso}">${d}` +
          `<span class="cal-tip"><strong>${typeInfo.tip}${time}</strong>${escapeHtml(title)}</span>` +
          `</button>`;
      } else {
        html += `<button type="button" class="cal-day available" data-iso="${iso}">${d}` +
          `<span class="cal-tip"><strong>Available</strong>Tap to enquire about ${new Date(viewYear, viewMonth, d).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>` +
          `</button>`;
      }
    }

    grid.innerHTML = html;

    if (direction && !prefersReducedMotion()) {
      grid.classList.remove('is-exiting-left', 'is-exiting-right');
      grid.classList.add(direction > 0 ? 'is-entering-right' : 'is-entering-left');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        grid.classList.remove('is-entering-left', 'is-entering-right');
      }));
    }

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
    };

    window.clearTimeout(renderTimer);
    if (direction && !prefersReducedMotion()) {
      grid.classList.remove('is-entering-left', 'is-entering-right');
      grid.classList.add(direction > 0 ? 'is-exiting-left' : 'is-exiting-right');
      renderTimer = window.setTimeout(draw, 140);
    } else {
      draw();
    }
  }

  prevBtn.addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    render(-1);
  });
  nextBtn.addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    render(1);
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
