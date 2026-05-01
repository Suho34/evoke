import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"var(--font-sans)", color:"var(--text)", background:"var(--bg)" }}>
      <h1 style={{ fontFamily:"var(--font-serif)", fontSize:"72px", color:"var(--accent)", marginBottom:"8px" }}>404</h1>
      <p style={{ fontSize:"16px", color:"var(--text-secondary)", marginBottom:"24px" }}>Page not found</p>
      <Link href="/" style={{ padding:"10px 24px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"8px", color:"var(--text)", textDecoration:"none", fontSize:"14px" }}>
        ← Back to evoke
      </Link>
    </div>
  );
}
