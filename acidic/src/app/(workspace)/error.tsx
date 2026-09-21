"use client";
import { RecoveryNotice } from "@/components/recovery-notice";
export default function Error({ reset }: { reset: () => void }) { return <RecoveryNotice reset={reset} />; }
