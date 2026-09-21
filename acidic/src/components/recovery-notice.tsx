"use client";
import Link from "next/link";
import { PageHeading } from "./ui";
export function RecoveryNotice({ reset }: { reset: () => void }) {
  return <section><PageHeading title="Acidic couldn’t open this view">Try loading it again. If you were saving something, check the record before repeating the action.</PageHeading><div className="actions"><button onClick={reset}>Try again</button><Link className="button secondary" href="/dashboard">Back to Today</Link></div></section>;
}
