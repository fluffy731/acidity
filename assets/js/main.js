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
  initAvailabilityCalendar();
});

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

  const dot = status.querySelector('.status-dot');
  if (isOpen) {
    status.lastChild.textContent = ' Open now';
    if (dot) dot.style.background = '#6fbf73';
  } else {
    status.lastChild.textContent = ' Closed — see hours above';
    if (dot) dot.style.background = '#c1622d';
  }
}

function initAvailabilityCalendar() {
  const el = document.getElementById('availability-cal');
  if (!el) return;

  const grid = document.getElementById('cal-grid');
  const monthLabel = document.getElementById('cal-month-label');
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');

  const sessionDates = (el.dataset.sessions || '').split(',').map(s => s.trim()).filter(Boolean);
  const privateDates = (el.dataset.private || '').split(',').map(s => s.trim()).filter(Boolean);

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
      let cls = 'cal-day';
      if (sessionDates.includes(iso)) cls += ' session';
      if (privateDates.includes(iso)) cls += ' private';
      html += `<div class="${cls}">${d}</div>`;
    }

    grid.innerHTML = html;
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
