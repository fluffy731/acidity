import { calendarData, heroEvent, programmeIndexRows } from "@/lib/programme/website-export";
import { loadWorkspace } from "@/lib/data/source";
import { melbourneDate } from "@/lib/dates";
import { handleError, json, requireManager } from "@/lib/http";
/** The programme as acidity.com.au needs it: index rows, calendar data and the hero event. */
export async function GET() {
  try {
    await requireManager();
    const { events } = await loadWorkspace();
    return json({ generatedFor: melbourneDate(), hero: heroEvent(events, melbourneDate()), programmeIndex: programmeIndexRows(events), calendar: calendarData(events) });
  } catch (error) { return handleError(error); }
}
