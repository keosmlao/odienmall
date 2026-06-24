"use client";

// Last-resort boundary for errors thrown in the ROOT layout itself (where the
// normal error.tsx can't render). Must include its own <html>/<body>.
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="lo">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0 }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "3rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>ເກີດຂໍ້ຜິດພາດ</h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b" }}>ກະລຸນາລອງໂຫຼດໜ້ານີ້ໃໝ່.</p>
          <button
            onClick={reset}
            style={{ marginTop: "1rem", borderRadius: 4, border: "none", background: "#f97316", color: "#fff", padding: "0.625rem 1.5rem", fontWeight: 700, cursor: "pointer" }}
          >
            ລອງໃໝ່
          </button>
        </div>
      </body>
    </html>
  );
}
