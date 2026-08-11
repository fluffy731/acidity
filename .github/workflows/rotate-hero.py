#!/usr/bin/env python3
import json
import re
from datetime import datetime

# Event manifest with hero configurations
EVENTS = [
    {
        "date": "2026-08-08",
        "hero_poster": "gig-8-aug.jpg",
        "title": "Tripside Life\nQuartet",
        "description": "Acid jazz / funk — original jazz and hypnotic grooves.",
        "meta": ["Fri 8 Aug", "Doors 7:30pm", "Acid Jazz / Funk"],
        "ticket_url": "https://events.humanitix.com/acid-jazz-funk-live-music-by-tripside-life-quartet/tickets",
        "file_number": "File 11"
    },
    {
        "date": "2026-08-10",
        "hero_poster": "gig-10-aug.jpg",
        "title": "Cerros / Marks\nQuintet",
        "description": "Two trumpets, one night only — celebrating the two-trumpet tradition of Roy Eldridge & Dizzy Gillespie.",
        "meta": ["Mon 10 Aug", "Doors 7:30pm", "Two-Trumpet Jazz"],
        "ticket_url": "https://events.humanitix.com/2-trumpets-jazz-quintet-or-cerros-marks-quintet-live-jazz-gig/tickets",
        "file_number": "File 12"
    },
    {
        "date": "2026-08-14",
        "hero_poster": "isoquartet.png",
        "title": "World Jazz Live\nISO Quartet",
        "description": "Swing, bossa, latin, and afro jazz.",
        "meta": ["Fri 14 Aug", "Doors 8pm", "Swing / Bossa / Latin / Afro"],
        "ticket_url": None,
        "file_number": "File 13"
    },
    {
        "date": "2026-08-15",
        "hero_poster": "latenightjazz.png",
        "title": "Late Night Jazz\n+ Sake/Wine Night",
        "description": "Late-night jazz with wine and sake.",
        "meta": ["Sat 15 Aug", "Late-Night Jazz", "Wine & Sake"],
        "ticket_url": None,
        "file_number": "File 14"
    },
    {
        "date": "2026-08-20",
        "hero_poster": "albyrolfe.png",
        "title": "Alby Rolfe\nQuartet",
        "description": "Original jazz compositions — two live sets.",
        "meta": ["Tue 20 Aug", "Doors 7:30pm", "Original Jazz"],
        "ticket_url": "https://events.humanitix.com/alby-rolfe-quartet-or-original-jazz-compositions-live-gig",
        "file_number": "File 15"
    }
]

def get_next_event():
    """Find the next upcoming event"""
    today = datetime.now().date()
    for event in EVENTS:
        event_date = datetime.strptime(event["date"], "%Y-%m-%d").date()
        if event_date >= today:
            return event
    return EVENTS[0]  # Fallback to first event

def update_hero_section(html, event):
    """Update hero section with event data"""

    ticket_link = ""
    if event["ticket_url"]:
        ticket_link = f'<a href="{event["ticket_url"]}" target="_blank" rel="noopener" class="btn btn-primary">Book Tickets</a>'

    new_hero = f"""<section class="hero-feature">
  <div class="hero-feature-media">
    <img src="assets/images/posters/{event['hero_poster']}" alt="{event['title'].replace(chr(10), ' ')} poster">
  </div>
  <div class="hero-feature-body">
    <div class="hero-eyebrow">01 &middot; Live Programme — Richmond, Melbourne</div>
    <p class="hero-lead">A quiet room that gets loud on the right nights.</p>
    <span class="hero-feature-tag">Next Session &middot; {event['file_number']}</span>
    <h1>{event['title']}</h1>
    <p class="hero-feature-desc">{event['description']}</p>
    <div class="hero-feature-meta">
      <span>{event['meta'][0]}</span>
      <span>{event['meta'][1]}</span>
      <span>{event['meta'][2]}</span>
      <span class="hero-feature-status">Ticketed</span>
    </div>
    <div class="hero-actions">
      {ticket_link}
      <a href="events.html" class="btn btn-outline">Full Programme</a>
    </div>
  </div>
</section>"""

    pattern = r'<section class="hero-feature">.*?</section>'
    updated = re.sub(pattern, new_hero, html, count=1, flags=re.DOTALL)
    return updated

def main():
    next_event = get_next_event()

    # Read index.html
    with open('index.html', 'r') as f:
        html = f.read()

    # Update hero
    updated_html = update_hero_section(html, next_event)

    # Write back
    with open('index.html', 'w') as f:
        f.write(updated_html)

    print(f"✓ Updated hero to: {next_event['title'].replace(chr(10), ' ')} ({next_event['date']})")

if __name__ == "__main__":
    main()
