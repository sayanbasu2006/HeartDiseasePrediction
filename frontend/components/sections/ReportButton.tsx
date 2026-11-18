import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, download } from "@/lib/api";
import { ErrorBox } from "./shared";

export function ReportButton({
  measurements,
  demonstration = false,
  synthetic = false,
  modelVersion,
}: {
  measurements: any;
  demonstration?: boolean;
  synthetic?: boolean;
  modelVersion?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function get() {
    setBusy(true);
    setError("");
    try {
      if (!synthetic && modelVersion) {
        const current = await api("/model-info");
        if (current.version !== modelVersion) {
          throw new Error(
            "This result uses an earlier model. Run a new assessment to download a matching report.",
          );
        }
      }
      const r = await fetch(
        synthetic ? "/api/synthetic/report" : "/api/report",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            synthetic ? measurements : { ...measurements, demonstration },
          ),
        },
      );
      if (!r.ok)
        throw new Error(
          "Report generation failed. Check that the backend and model are ready.",
        );
      const name = synthetic
        ? "cardiolens-model-demo.pdf"
        : "cardiolens-assessment.pdf";
      download(await r.blob(), name, "application/pdf");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button disabled={busy} onClick={get}>
        {busy ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
        Download PDF Report
      </Button>
      <ErrorBox message={error} />
    </>
  );
}
