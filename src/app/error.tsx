"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"var(--font-sans)", color:"var(--text)", background:"var(--bg)" }}>
      <h1 style={{ fontFamily:"var(--font-serif)", fontSize:"36px", color:"var(--accent)", marginBottom:"8px" }}>Something went wrong</h1>
      <p style={{ fontSize:"14px", color:"var(--text-secondary)", marginBottom:"24px", maxWidth:"400px", textAlign:"center" }}>{error.message}</p>
      <button onClick={reset} style={{ padding:"10px 24px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"8px", color:"var(--text)", cursor:"pointer", fontSize:"14px" }}>
        ↻ Try Again
      </button>
    </div>
  );
}
