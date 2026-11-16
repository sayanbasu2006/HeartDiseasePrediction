"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { SiteHeader, SiteFooter } from "./site-shell";
import { Landing } from "./landing";
import { Button } from "./ui/button";
import { AboutSection } from "./sections/AboutSection";
import { DashboardSection } from "./sections/DashboardSection";
import { HistorySection } from "./sections/HistorySection";
import { InsightsSection } from "./sections/InsightsSection";
import { ModelsSection } from "./sections/ModelsSection";
import { PredictSection } from "./sections/PredictSection";
import { ReportsSection } from "./sections/ReportsSection";
import { UploadSection } from "./sections/UploadSection";
import { useResource } from "./sections/useResource";

const titles: Record<string, [string, string]> = {
  dashboard: [
    "Workspace overview",
    "Your latest assessment, recorded measurements, and trends — together in one place.",
  ],
  predict: [
    "Cardiovascular Health Assessment",
    "A structured clinical record. An interpretable research result. Not a medical diagnosis.",
  ],
  upload: [
    "Clinical Data Tools",
    "Import, validate, and explore clinical records in a structured research workspace.",
  ],
  history: [
    "Measurement History & Trends",
    "A longitudinal view of your recorded measurements, with every gap and limitation in context.",
  ],
  insights: [
    "Data and model insights",
    "Explore the data and the ideas behind your results.",
  ],
  models: [
    "Model Insights & Research",
    "Explore the evidence behind the classifier: its data, evaluation, and boundaries.",
  ],
  reports: [
    "Assessment reports",
    "Export a clear, portable summary of your latest assessment.",
  ],
  about: [
    "About the research",
    "The data, methodology, and boundaries of CardioLens AI.",
  ],
};

const sections: Record<string, React.ComponentType> = {
  home: Landing,
  dashboard: DashboardSection,
  predict: PredictSection,
  upload: UploadSection,
  history: HistorySection,
  models: ModelsSection,
  insights: InsightsSection,
  reports: ReportsSection,
  about: AboutSection,
};

export function Workspace({ section }: { section: string }) {
  const health = useResource("/health");
  const Section = sections[section];
  return (
    <div className={`app clinical-site section-${section}`}>
      <SiteHeader
        section={section}
        ready={!!health.data?.model_ready}
        offline={!!health.error}
      />
      <main id="workspace-content" tabIndex={-1}>
        <div className={section === "home" ? "page landing-page" : "page"}>
          {section !== "home" && (
            <div className="page-heading">
              <div>
                <span className="eyebrow">CARDIOLENS / RESEARCH WORKSPACE</span>
                <h1>{titles[section][0]}</h1>
                <p>{titles[section][1]}</p>
              </div>
              {section === "dashboard" && (
                <Button asChild>
                  <Link href="/predict">
                    <Plus size={17} />
                    New assessment
                  </Link>
                </Button>
              )}
            </div>
          )}
          <Section />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
