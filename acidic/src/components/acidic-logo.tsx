/** Original mark: a drop (the acidity) inside the emerald ring the website uses. */
export function AcidicMark({ size = 40 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="32" cy="32" r="28" stroke="#7d9161" strokeWidth="4" />
    <path d="M32 14C32 14 20 28 20 37C20 43.6 25.4 49 32 49C38.6 49 44 43.6 44 37C44 28 32 14 32 14Z" fill="#ede8de" />
  </svg>;
}
export function AcidicLogo() {
  return <span className="acidic-logo" role="img" aria-label="Acidic, the Acidity workspace"><AcidicMark size={32} /><span className="acidic-wordmark" aria-hidden="true">Acidic<span>for Acidity Bar &amp; Coffee</span></span></span>;
}
