/** Programme vocabulary - the same words the website uses, so the two never disagree. */
export const EVENT_KINDS = ["night_session", "day_programme", "private_booking"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** placeholder: date is held, details TBA. confirmed: named act, no booking link yet.
 *  ticketed / free_rsvp: booking link published. private: venue unavailable to the public.
 *  cancelled: keeps the record, frees the date. */
export const EVENT_STATUSES = ["placeholder", "confirmed", "ticketed", "free_rsvp", "private", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** The website's Programme Index action words, exactly as agreed for acidity.com.au. */
export const WEBSITE_ACTION: Record<EventStatus, string> = {
  ticketed: "Book Tickets",
  free_rsvp: "RSVP",
  confirmed: "Details TBA",
  placeholder: "Details TBA",
  private: "Occupied",
  cancelled: "",
};
