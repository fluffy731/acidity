"use client";
import { RecoveryNotice } from "@/components/recovery-notice";
export default function Error({ reset }: { reset: () => void }) { return <main id="main" className="container"><RecoveryNotice reset={reset} /></main>; }
