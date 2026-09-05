/**
 * Renders VENUE_EVENTS (assets/js/events-data.js) into every section that
 * needs to agree: homepage Hero, What's On cards, Programme Index, Upcoming
 * Sessions and the Availability calendar's data-events attribute (index.html),
 * plus the running order (events.html). Registered before main.js so the
 * DOM is hydrated before initWhatsOnCarousel() / initAvailabilityCalendar()
 * read it.
 */

(function () {
  const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function toDateObj(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function weekdayShort(iso) { return WEEKDAYS_SHORT[toDateObj(iso).getDay()]; }
  function dayNum(iso) { return toDateObj(iso).getDate(); }
  function monthShort(iso) { return MONTHS_SHORT[toDateObj(iso).getMonth()]; }
  function monthLong(iso) { return MONTHS_LONG[toDateObj(iso).getMonth()]; }
  function yearOf(iso) { return toDateObj(iso).getFullYear(); }

  function todayIsoMelbourne() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });
    return `${map.year}-${map.month}-${map.day}`;
  }

  function fmt12(t) {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function primaryTime(ev) { return ev.music || ev.doors || null; }

  function metaLine(ev) {
    let base = (ev.genres || []).join(' / ');
    if (ev.status === 'free') return (base ? base + ' / ' : '') + 'Free Entry';
    if (ev.status === 'occupied') return base;
    const t = primaryTime(ev);
    return base + (t ? ' / ' + t : '');
  }

  function autoDescription(ev) {
    if (ev.description) return ev.description;
    if (!ev.genres || !ev.genres.length) return null;
    if (ev.artist) {
      return `<strong style="color:var(--cream);">${escapeHtml(ev.artist)}</strong> — ${escapeHtml(ev.genres.join(' · '))}.`;
    }
    return escapeHtml(ev.genres.join(' · ')) + '.';
  }

  function lineupLine(ev) {
    if (!ev.lineup || !ev.lineup.length) return '';
    return ' ' + escapeHtml(ev.lineup.join(', ')) + '.';
  }

  function earlyBirdCountdown(ev, variant) {
    if (!ev.earlyBirdEnds) return '';
    const hasEnded = Date.now() >= Date.parse(ev.earlyBirdEnds);
    if (hasEnded && !ev.earlyBirdShowEnded) return '';
    const modifier = variant ? ` is-${variant}` : '';
    const offer = ev.earlyBirdPrice && ev.generalPrice ? `<div class="early-bird-offer">
      <span class="early-bird-general">GENERAL <s>${escapeHtml(ev.generalPrice)}</s></span>
      <span class="early-bird-special">EARLY BIRD <strong>${escapeHtml(ev.earlyBirdPrice)}</strong></span>
    </div>` : '';
    return `<div class="early-bird-countdown${modifier}${hasEnded ? ' is-ended' : ''}" data-countdown-until="${escapeHtml(ev.earlyBirdEnds)}" data-show-ended="${ev.earlyBirdShowEnded ? 'true' : 'false'}" aria-live="polite">
      ${offer}
      <span class="early-bird-label">${hasEnded ? 'EARLY BIRD ENDED' : escapeHtml(ev.earlyBirdLabel || 'EARLY BIRD')}</span>
      <span class="early-bird-time"${hasEnded ? ' hidden' : ''}>Calculating…</span>
    </div>`;
  }

  function initEarlyBirdCountdowns() {
    const countdowns = Array.from(document.querySelectorAll('[data-countdown-until]'));
    if (!countdowns.length) return;

    const update = () => {
      const now = Date.now();
      countdowns.forEach(el => {
        if (!el.isConnected) return;
        const remaining = Date.parse(el.dataset.countdownUntil) - now;
        if (remaining <= 0) {
          el.classList.remove('is-urgent');
          if (el.dataset.showEnded === 'true') {
            el.classList.add('is-ended');
            const label = el.querySelector('.early-bird-label');
            const output = el.querySelector('.early-bird-time');
            if (label) label.textContent = 'EARLY BIRD ENDED';
            if (output) output.hidden = true;
          } else {
            el.remove();
          }
          return;
        }
        const totalSeconds = Math.floor(remaining / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const value = `${days}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M`;
        const output = el.querySelector('.early-bird-time');
        el.classList.toggle('is-urgent', remaining <= 48 * 60 * 60 * 1000);
        if (output && output.textContent !== value) {
          output.textContent = value;
          output.classList.remove('is-ticking');
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            void output.offsetWidth;
            output.classList.add('is-ticking');
          }
        }
      });
    };

    update();
    const timer = window.setInterval(() => {
      update();
      if (!document.querySelector('[data-countdown-until]')) window.clearInterval(timer);
    }, 30000);
  }

  function dateRangeLabel(ev) {
    if (!ev.dateEnd) return `${dayNum(ev.dateStart)} ${monthShort(ev.dateStart)}`.toUpperCase();
    return `${String(dayNum(ev.dateStart)).padStart(2, '0')}–${String(dayNum(ev.dateEnd)).padStart(2, '0')} ${monthShort(ev.dateStart)}`.toUpperCase();
  }

  function placeholderDateLabel(ev) {
    if (!ev.dateEnd) return `${dayNum(ev.dateStart)} ${monthShort(ev.dateStart)} ${yearOf(ev.dateStart)}`;
    return `${String(dayNum(ev.dateStart)).padStart(2, '0')}–${String(dayNum(ev.dateEnd)).padStart(2, '0')} ${monthShort(ev.dateStart)} ${yearOf(ev.dateStart)}`;
  }

  function longDateRangeLabel(ev) {
    if (!ev.dateEnd) return `${weekdayShort(ev.dateStart)}, ${dayNum(ev.dateStart)} ${monthShort(ev.dateStart)}`;
    return `${weekdayShort(ev.dateStart)}, ${dayNum(ev.dateStart)} – ${weekdayShort(ev.dateEnd)}, ${dayNum(ev.dateEnd)} ${monthShort(ev.dateEnd)}`;
  }

  function titleWithArtist(ev, artistClass) {
    if (!ev.artist) return escapeHtml(ev.title);
    const sep = ev.piArtistSeparator || ' — ';
    return `${escapeHtml(ev.title)}${escapeHtml(sep)}<span class="${artistClass}">${escapeHtml(ev.artist)}</span>`;
  }

  function fullTitle(ev) {
    let t = ev.title;
    if (ev.locationTag) t += ` — ${ev.locationTag}`;
    return t;
  }

  // ---- CTA builders ----------------------------------------------------

  const DEFAULT_CTA_LABELS = { book: 'Book Tickets ↗', rsvp: 'RSVP ↗' };
  function ctaLabel(ev) { return ev.ctaLabel || DEFAULT_CTA_LABELS[ev.ctaType] || ''; }
  function bookingIsActive(ev) { return !['sold-out', 'cancelled'].includes(ev.ticketStatus); }

  function ctaWoCard(ev) {
    if (ev.ticketStatus === 'sold-out') return '<span class="pi-status is-sold-out">Sold Out</span>';
    if (ev.ticketStatus === 'cancelled') return '<span class="pi-status is-cancelled">Cancelled</span>';
    switch (ev.ctaType) {
      case 'book':
      case 'rsvp':
        return `<a href="${ev.ticketUrl}" target="_blank" rel="noopener" class="wo-card-link">${escapeHtml(ctaLabel(ev))}</a>`;
      case 'free':
        return `<span class="pi-status">Free Entry</span>`;
      case 'door':
        return `<span class="pi-status">${escapeHtml(ctaLabel(ev))}</span>`;
      case 'occupied':
        return `<span class="pi-status pi-status-occupied">Occupied</span>`;
      default:
        return `<span class="pi-status">Details Soon</span>`;
    }
  }

  function ctaPiLink(ev) {
    if (ev.ticketStatus === 'sold-out') return '<span class="pi-status is-sold-out">Sold Out</span>';
    if (ev.ticketStatus === 'cancelled') return '<span class="pi-status is-cancelled">Cancelled</span>';
    switch (ev.ctaType) {
      case 'book':
      case 'rsvp':
        return `<a href="${ev.ticketUrl}" target="_blank" rel="noopener" class="pi-link">${escapeHtml(ctaLabel(ev))}</a>`;
      case 'free':
        return `<span class="pi-status">Free Entry</span>`;
      case 'door':
        return `<span class="pi-status">${escapeHtml(ctaLabel(ev))}</span>`;
      case 'occupied':
        return `<span class="pi-status pi-status-occupied">Occupied</span>`;
      default:
        return `<span class="pi-status">Details Soon</span>`;
    }
  }

  function ctaRunStatus(ev) {
    if (ev.ticketStatus === 'sold-out') return '<span class="run-status is-sold-out">Sold Out</span>';
    if (ev.ticketStatus === 'cancelled') return '<span class="run-status is-cancelled">Cancelled</span>';
    switch (ev.ctaType) {
      case 'book':
      case 'rsvp':
        return `<a href="${ev.ticketUrl}" target="_blank" rel="noopener" class="run-status is-link">${escapeHtml(ctaLabel(ev))}</a>`;
      case 'free':
        return `<span class="run-status is-details">Free Entry</span>`;
      case 'door':
        return `<span class="run-status is-details">${escapeHtml(ctaLabel(ev))}</span>`;
      case 'occupied':
        return `<span class="run-status is-occupied">Occupied</span>`;
      default:
        return `<span class="run-status is-details">Details Soon</span>`;
    }
  }

  function eventDetailHtml(ev, variant) {
    const rows = [];
    if (ev.price) rows.push(`<div><dt>Tickets</dt><dd>${escapeHtml(ev.price)}</dd></div>`);
    if (ev.offer) rows.push(`<div><dt>Limited offer</dt><dd>${escapeHtml(ev.offer)}</dd></div>`);
    if (ev.schedule && ev.schedule.length) rows.push(`<div><dt>Running order</dt><dd>${ev.schedule.map(escapeHtml).join('<br>')}</dd></div>`);
    if (ev.lineup && ev.lineup.length) rows.push(`<div><dt>Line-up</dt><dd>${ev.lineup.map(escapeHtml).join('<br>')}</dd></div>`);
    if (ev.admission) rows.push(`<div><dt>Admission</dt><dd>${escapeHtml(ev.admission)}</dd></div>`);
    const copy = ev.detailDescription || ev.description;
    if (!rows.length && !copy && !ev.pageUrl) return '';
    return `<details class="event-detail is-${variant}">
      <summary>Event details</summary>
      ${copy ? `<p>${copy}</p>` : ''}
      ${rows.length ? `<dl>${rows.join('')}</dl>` : ''}
      ${ev.pageUrl ? `<a class="event-page-link" href="${ev.pageUrl}">Full event page →</a>` : ''}
    </details>`;
  }

  // ---- What's On card ----------------------------------------------------

  function renderWoCard(ev, isUpcoming) {
    const monthAttr = `${monthLong(ev.dateStart)} ${yearOf(ev.dateStart)}`;
    const classes = ['wo-card'];
    if (isUpcoming) classes.push('is-upcoming');
    if (ev.isFeature) classes.push('wo-card-feature');
    const statusLabels = { 'selling-fast': 'Selling Fast', 'sold-out': 'Sold Out', door: 'Door Tickets', cancelled: 'Cancelled' };
    const badgeLabel = statusLabels[ev.ticketStatus] || (ev.ctaType === 'occupied' ? 'Occupied' : 'Upcoming');
    const badgeHtml = isUpcoming ? `<span class="wo-card-badge">${badgeLabel}</span>` : '';

    let photo;
    if (ev.poster) {
      const preserveClass = ev.preservePoster ? ' is-contain' : '';
      const posterImage = `<img src="assets/images/${ev.poster}" alt="${escapeHtml(fullTitle(ev))} poster">`;
      const linkedPoster = ev.ticketUrl && bookingIsActive(ev) && (ev.ctaType === 'book' || ev.ctaType === 'rsvp')
        ? `<a href="${ev.ticketUrl}" target="_blank" rel="noopener" class="wo-card-poster-link" aria-label="${escapeHtml(ctaLabel(ev))} for ${escapeHtml(fullTitle(ev))}">${posterImage}</a>`
        : posterImage;
      photo = `<div class="wo-card-photo${preserveClass}">${badgeHtml}${linkedPoster}</div>`;
    } else {
      const sepText = ev.piArtistSeparator || ' — ';
      const subLine = ev.artist ? `<span class="wo-placeholder-sub">${escapeHtml(sepText)}${escapeHtml(ev.artist)}</span>` : '';
      photo = `<div class="wo-card-photo wo-placeholder">${badgeHtml}
          <div class="wo-placeholder-text">
            <span class="wo-placeholder-date">${escapeHtml(placeholderDateLabel(ev))}</span>
            <span class="wo-placeholder-title">${escapeHtml(ev.title)}</span>
            ${subLine}
            ${ev.genres && ev.genres.length ? `<span class="wo-placeholder-cat">${escapeHtml(ev.genres.join(' / '))}</span>` : ''}
          </div>
        </div>`;
    }

    const dateStr = longDateRangeLabel(ev);
    const t = primaryTime(ev);
    let dateLine = dateStr;
    if (ev.doors && ev.music) {
      dateLine += ` · Doors ${fmt12(ev.doors)}, Music ${fmt12(ev.music)}`;
    } else if (t) {
      dateLine += ` · ${fmt12(t)}`;
    }
    if (ev.status === 'free') dateLine += ' · Free Entry';

    const series = ev.series ? `<span class="wo-card-series">${escapeHtml(ev.series)}</span>` : '';
    const badge = ev.badge ? `<span class="wo-card-artist-credit">${escapeHtml(ev.badge)}</span>` : '';
    const desc = autoDescription(ev);
    const note = ev.note ? ` ${escapeHtml(ev.note)}` : '';
    const lineup = lineupLine(ev);
    const bodyPara = desc ? `<p>${desc}${note}${lineup}</p>` : (note || lineup ? `<p>${note}${lineup}</p>` : '');
    const cta = isUpcoming ? ctaWoCard(ev) : '';

    return `<article class="${classes.join(' ')}" data-month="${monthAttr}">
        ${photo}
        <div class="wo-card-body">
          ${series}
          <span class="wo-card-date">${dateLine}</span>${badge}
          <h4>${escapeHtml(fullTitle(ev))}</h4>
          ${ev.offer ? `<span class="programme-offer">Limited Offer <strong>${escapeHtml(ev.offerPrice || '')}</strong>${ev.offerOriginalPrice ? `<span class="programme-offer-was">Was <s>${escapeHtml(ev.offerOriginalPrice)}</s></span>` : ''} — Entry + selected drink</span>` : ''}
          ${isUpcoming ? earlyBirdCountdown(ev, 'card') : ''}
          ${bodyPara}
          ${eventDetailHtml(ev, 'card')}
          ${cta}
        </div>
      </article>`;
  }

  // ---- Programme Index list-item -----------------------------------------

  function renderPiItem(ev, isUpcoming) {
    const classes = [];
    if (isUpcoming) classes.push('pi-upcoming');
    if (ev.ctaType === 'occupied') classes.push('pi-occupied');
    const dateLabel = dateRangeLabel(ev);
    const title = titleWithArtist(ev, 'pi-artist') + (ev.locationTag ? ` — ${escapeHtml(ev.locationTag)}` : '');
    return `<li class="${classes.join(' ')}"><span class="pi-date">${dateLabel}</span><span class="pi-title">${title}</span><span class="pi-meta">${escapeHtml(metaLine(ev).toUpperCase())}</span> ${isUpcoming ? ctaPiLink(ev) : ''}</li>`;
  }

  // ---- events.html running-order item ------------------------------------

  function renderRunItem(ev) {
    const day = ev.dateEnd ? `${String(dayNum(ev.dateStart)).padStart(2, '0')}–${String(dayNum(ev.dateEnd)).padStart(2, '0')}` : String(dayNum(ev.dateStart)).padStart(2, '0');
    const title = titleWithArtist(ev, 'run-artist') + (ev.locationTag ? ` — ${escapeHtml(ev.locationTag)}` : '');
    return `<li class="run-item">
      <span class="run-date"><span class="run-date-day">${day}</span><span class="run-date-month">${monthShort(ev.dateStart)}</span></span>
      <span class="run-body"><span class="run-title">${title}</span><span class="run-meta">${escapeHtml(metaLine(ev))}</span>${ev.offer ? `<span class="programme-offer">Limited Offer <strong>${escapeHtml(ev.offerPrice || '')}</strong>${ev.offerOriginalPrice ? `<span class="programme-offer-was">Was <s>${escapeHtml(ev.offerOriginalPrice)}</s></span>` : ''} — Entry + selected drink</span>` : ''}${earlyBirdCountdown(ev, 'run')}${eventDetailHtml(ev, 'run')}</span>
      ${ctaRunStatus(ev)}
    </li>`;
  }

  // ---- Upcoming Sessions sidebar item -------------------------------------

  function renderUpcomingSessionItem(ev) {
    let label = ev.title;
    if (ev.artist) label += ` — ${ev.artist}`;
    if (ev.locationTag) label += ` — ${ev.locationTag}`;
    if (ev.ctaType === 'occupied') label += ' — Private Booking';
    return `<li><span>${escapeHtml(label)}</span><span class="event-date">${escapeHtml(longDateRangeLabel(ev))}</span></li>`;
  }

  // ---- Hero -----------------------------------------------------------

  function renderHero(ev) {
    const root = document.getElementById('hero-feature-root');
    if (!root || !ev) return;

    const posterSrc = ev.poster ? `assets/images/${ev.poster}` : 'assets/images/posters/coffee-rave-24-may.jpg';
    const titleHtml = ev.artist ? `${escapeHtml(ev.title)}<br>${escapeHtml(ev.artist)}` : escapeHtml(ev.title);
    const genreLine = (ev.genres || []).join(' / ');
    const desc = ev.heroDescription
      ? ev.heroDescription
      : ev.description
        ? ev.description.replace(/<\/?strong[^>]*>/g, '')
        : (genreLine ? `${genreLine} — live at Acidity.` : 'Details to follow soon.');

    const metaParts = [`${weekdayShort(ev.dateStart)} ${dayNum(ev.dateStart)} ${monthShort(ev.dateStart)}`];
    if (ev.doors) metaParts.push(`Doors ${fmt12(ev.doors)}`);
    else if (ev.music) metaParts.push(fmt12(ev.music));
    if (genreLine) metaParts.push(genreLine);

    let statusLabel = 'Ticketed';
    if (ev.status === 'free') statusLabel = 'Free Entry';
    else if (ev.status === 'details-soon') statusLabel = 'Details Soon';
    else if (ev.status === 'occupied') statusLabel = 'Occupied';

    let primaryCta;
    if (ev.ctaType === 'book' || ev.ctaType === 'rsvp') primaryCta = `<a href="${ev.ticketUrl}" target="_blank" rel="noopener" class="btn btn-primary">${escapeHtml(ctaLabel(ev))}</a>`;
    else if (ev.ctaType === 'free') primaryCta = `<span class="btn btn-outline" style="cursor:default;">Free Entry</span>`;
    else if (ev.ctaType === 'door') primaryCta = `<span class="btn btn-outline" style="cursor:default;">${escapeHtml(ctaLabel(ev))}</span>`;
    else primaryCta = `<span class="btn btn-outline" style="cursor:default;">Details Soon</span>`;

    const fileTag = ev.fileNumber ? ` · ${ev.fileNumber}` : '';

    root.innerHTML = `<div class="hero-folio" aria-hidden="true"><span>ACD.</span><span>01</span></div>
  <div class="hero-feature-media${ev.preservePoster ? ' is-contain' : ''}">
    ${ev.ticketUrl && bookingIsActive(ev) && (ev.ctaType === 'book' || ev.ctaType === 'rsvp')
      ? `<a href="${ev.ticketUrl}" target="_blank" rel="noopener" class="hero-poster-link" aria-label="${escapeHtml(ctaLabel(ev))} for ${escapeHtml(fullTitle(ev))}"><img src="${posterSrc}" alt="${escapeHtml(fullTitle(ev))} poster"></a>`
      : `<img src="${posterSrc}" alt="${escapeHtml(fullTitle(ev))} poster">`}
  </div>
  <div class="hero-feature-body">
    <div class="hero-eyebrow">CURRENT PROGRAMME / RICHMOND, MELBOURNE</div>
    <p class="hero-lead">Coffee by day.<br>Live sound after dark.</p>
    <span class="hero-feature-tag">Next Session${fileTag}</span>
    <h1>${titleHtml}</h1>
    <p class="hero-feature-desc">${desc}</p>
    ${earlyBirdCountdown(ev, 'hero')}
    <div class="hero-feature-meta">
      ${metaParts.map(m => `<span>${escapeHtml(m)}</span>`).join('\n      ')}
      <span class="hero-feature-status">${statusLabel}</span>
    </div>
    <div class="hero-actions">
      ${primaryCta}
      <a href="events.html" class="btn btn-outline">Full Programme</a>
    </div>
  </div>`;
  }

  function addEventStructuredData(events) {
    if (!document.head) return;
    const items = events.map(ev => {
      const time = ev.music || ev.doors;
      const offsetName = time ? new Intl.DateTimeFormat('en', { timeZone: 'Australia/Melbourne', timeZoneName: 'longOffset' })
        .formatToParts(new Date(`${ev.dateStart}T12:00:00Z`)).find(part => part.type === 'timeZoneName').value.replace('GMT', '') : '';
      const item = {
        '@type': 'MusicEvent',
        name: fullTitle(ev),
        url: ev.pageUrl ? `${location.origin}/${ev.pageUrl}` : `${location.origin}/events.html#${ev.id}`,
        startDate: time ? `${ev.dateStart}T${time}:00${offsetName}` : ev.dateStart,
        location: { '@type': 'Place', name: 'Acidity Bar & Coffee', address: { '@type': 'PostalAddress', streetAddress: '3/240 Victoria Street', addressLocality: 'Richmond', addressRegion: 'VIC', postalCode: '3121', addressCountry: 'AU' } },
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: ev.ticketStatus === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled'
      };
      if (ev.dateEnd) item.endDate = ev.dateEnd;
      if (ev.poster) item.image = `${location.origin}/assets/images/${ev.poster}`;
      const description = ev.detailDescription || ev.description || (ev.genres || []).join(', ');
      if (description) item.description = description.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
      if (ev.ticketUrl) {
        item.offers = { '@type': 'Offer', url: ev.ticketUrl, priceCurrency: 'AUD', availability: ev.ticketStatus === 'sold-out' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock' };
        if (ev.earlyBirdPrice) item.offers.price = ev.earlyBirdPrice.replace(/[^0-9.]/g, '');
      }
      return item;
    });
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': items });
    document.head.appendChild(script);
  }

  // ---- Availability calendar data-events ----------------------------------

  function buildCalendarEvents(events) {
    const out = {};
    events.forEach(ev => {
      const title = fullTitle(ev) + (ev.artist ? ` — ${ev.artist}` : '');
      if (ev.dateEnd) {
        const start = toDateObj(ev.dateStart);
        const end = toDateObj(ev.dateEnd);
        const totalNights = Math.round((end - start) / 86400000) + 1;
        let cursor = new Date(start);
        let night = 1;
        while (cursor <= end) {
          const iso = cursor.toISOString().slice(0, 10);
          out[iso] = { type: ev.calType, title: `${title} — Night ${night} of ${totalNights}` };
          cursor.setDate(cursor.getDate() + 1);
          night++;
        }
      } else {
        const entry = { type: ev.calType, title: ev.isPublic ? title : ev.title };
        const t = primaryTime(ev);
        if (t) entry.time = fmt12(t);
        out[ev.dateStart] = entry;
      }
    });
    return out;
  }

  // ---- Hydration entry point ----------------------------------------------

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof VENUE_EVENTS === 'undefined') return;
    const today = todayIsoMelbourne();
    const upcoming = VENUE_EVENTS
      .filter(ev => ev.dateStart >= today || (ev.dateEnd && ev.dateEnd >= today))
      .sort((a, b) => a.dateStart.localeCompare(b.dateStart));
    const upcomingPublic = upcoming.filter(ev => ev.isPublic);
    const programmePublic = VENUE_EVENTS
      .filter(ev => ev.isPublic)
      .sort((a, b) => a.dateStart.localeCompare(b.dateStart));
    addEventStructuredData(programmePublic);

    // Hero — first upcoming public event
    renderHero(upcomingPublic[0]);

    // What's On — append generated cards after the wo-anchor marker
    const woAnchor = document.getElementById('wo-anchor-upcoming');
    if (woAnchor) {
      woAnchor.insertAdjacentHTML('afterend', programmePublic.map(ev => renderWoCard(ev, ev.dateEnd ? ev.dateEnd >= today : ev.dateStart >= today)).join('\n'));
    }

    // Programme Index — group by month, insert after pi-anchor
    const piAnchor = document.getElementById('pi-anchor-upcoming');
    if (piAnchor) {
      let html = '';
      let lastMonth = null;
      programmePublic.forEach(ev => {
        const m = monthLong(ev.dateStart);
        if (m !== lastMonth) {
          html += `<li class="pi-month">${m}</li>`;
          lastMonth = m;
        }
        html += renderPiItem(ev, ev.dateEnd ? ev.dateEnd >= today : ev.dateStart >= today);
      });
      piAnchor.insertAdjacentHTML('afterend', html);
    }

    // Upcoming Sessions sidebar — full future list
    const sessionsList = document.getElementById('upcoming-sessions-list');
    if (sessionsList) {
      sessionsList.innerHTML = upcomingPublic.map(renderUpcomingSessionItem).join('\n');
    }

    // Availability calendar — feed data-events before main.js reads it
    const calEl = document.getElementById('availability-cal');
    if (calEl) {
      calEl.dataset.events = JSON.stringify(buildCalendarEvents(upcoming));
    }

    // events.html running order
    const runAnchor = document.getElementById('run-anchor-upcoming');
    if (runAnchor) {
      runAnchor.insertAdjacentHTML('afterend', upcomingPublic.map(renderRunItem).join('\n'));
    }

    initEarlyBirdCountdowns();
  });
})();
