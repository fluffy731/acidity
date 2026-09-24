(function () {
  'use strict';

  const measurementId = window.ACIDITY_CONFIG && window.ACIDITY_CONFIG.ga4MeasurementId;
  const enabled = /^G-[A-Z0-9]+$/i.test(measurementId || '');

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  if (enabled) {
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(tag);
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: true });
  }

  function send(name, parameters) {
    if (!enabled) return;
    window.gtag('event', name, Object.assign({
      page_path: window.location.pathname,
      transport_type: 'beacon'
    }, parameters || {}));
  }

  function linkLabel(link) {
    return (link.getAttribute('aria-label') || link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  }

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('a[href]');
    if (!link) return;

    const rawHref = link.getAttribute('href') || '';
    let url;
    try { url = new URL(rawHref, window.location.href); } catch (_) { return; }

    const details = { link_url: url.href, link_text: linkLabel(link) };
    if (url.hostname === 'events.humanitix.com') {
      send('ticket_click', Object.assign({ event_name: linkLabel(link) }, details));
    } else if (url.hostname.includes('google.com') && url.pathname.includes('/maps')) {
      send('map_click', details);
    } else if (url.protocol === 'mailto:' || url.protocol === 'tel:') {
      send('contact_click', Object.assign({ contact_method: url.protocol.replace(':', '') }, details));
    } else if (url.pathname.endsWith('/menu.html') || url.pathname === '/menu') {
      send('menu_click', details);
    } else if (url.hash === '#contact' || rawHref.includes('?date=')) {
      send('venue_enquiry_click', details);
    }
  });

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === 'contact-form') {
      const reason = form.querySelector('[name="reason"]');
      const isVenueEnquiry = reason && /private event|venue booking/i.test(reason.value || '');
      send(isVenueEnquiry ? 'venue_enquiry_submit' : 'contact_form_submit', {
        enquiry_type: reason ? reason.value : 'unspecified'
      });
    } else if (form.closest('.programme-newsletter')) {
      send('newsletter_signup', { form_location: 'programme_index' });
    }
  });
})();
