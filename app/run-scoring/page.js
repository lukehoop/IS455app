"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RunScoringPage() {
  const [isScoring, setIsScoring] = useState(false);
  const router = useRouter();

  const handleRunScoring = async () => {
    setIsScoring(true);
    try {
      // This calls the Python API bridge we discussed earlier
      const response = await fetch("/api/score", {
        method: "POST",
      });

      if (response.ok) {
        // Once successful, redirect to the Priority Queue as required
        router.push("/warehouse/priority");
      } else {
        const errorData = await response.json();
        alert(`Scoring failed: ${errorData.error || "Unknown error"}`);
      }
    } catch (err) {
      alert("Failed to connect to the scoring API. Make sure your server is running.");
    } finally {
      setIsScoring(false);
    }
  };

  return (
    <section className="page-card stack">
      <div>
        <h2>Run Scoring</h2>
        <p className="muted">
          Trigger the ML inference job to score new orders and refresh the priority queue.
        </p>
      </div>

      <div className="table-block" style={{ textAlign: "center", padding: "40px" }}>
        <button 
          className="button-primary" 
          onClick={handleRunScoring}
          disabled={isScoring}
          style={{ padding: "12px 24px", fontSize: "1.1rem", cursor: isScoring ? "not-allowed" : "pointer" }}
        >
          {isScoring ? "Processing ML Pipeline..." : "Run Scoring Now"}
        </button>
        
        {isScoring && (
          <p style={{ marginTop: "15px", color: "#666" }}>
            Connecting to Supabase and running Fraud Model...
          </p>
        )}
      </div>
    </section>
  );
}