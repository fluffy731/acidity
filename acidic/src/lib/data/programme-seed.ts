import { z } from "zod";
import { dateConflict, eventInputSchema, type EventInput } from "@/lib/programme/workflow";

/** The shape of `data/programme.json`: the note explaining the format, then the programme.
 *  Every row goes through the app's own event rules, so the file cannot hold an event the
 *  Programme screen would refuse - a ticketed night with no booking link, a private hire left
 *  public, a price range the wrong way round. The seed script trusts this; the test enforces it. */
export const programmeSeedSchema = z.object({
  $comment: z.array(z.string()).optional(),
  events: z.array(eventInputSchema).min(1),
}).strict();

export type ProgrammeSeed = z.infer<typeof programmeSeedSchema>;

/** Problems no single row can show, because they are about the list as a whole: the same gig
 *  entered twice, or a private hire sharing a date with a public event. Returns plain sentences
 *  meant to be printed next to the file someone just edited. */
export function seedIssues(events: readonly EventInput[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  const byDate = new Map<string, EventInput[]>();
  for (const event of events) {
    const key = `${event.eventDate}|${event.title.trim().toLowerCase()}`;
    if (seen.has(key)) issues.push(`${event.eventDate}: "${event.title}" is listed twice - the seed loads it once, so the second line is doing nothing.`);
    seen.add(key);
    const sameDay = byDate.get(event.eventDate) ?? [];
    if (dateConflict(sameDay, event) === "conflict") issues.push(`${event.eventDate}: a private booking cannot share a date with a public event - the venue cannot be both.`);
    byDate.set(event.eventDate, [...sameDay, event]);
  }
  return issues;
}
