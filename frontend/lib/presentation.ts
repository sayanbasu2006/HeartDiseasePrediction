/** Presentation-only copy and locale conventions. Model keys remain in fields.generated.json. */
import { assessmentInputCounts } from "./api";

export const locale = "en-IN";
export const navigationItems = [
  { section: "home", href: "/", label: "Home" },
  { section: "predict", href: "/predict", label: "Health Assessment" },
  { section: "upload", href: "/upload", label: "Data Tools" },
  { section: "history", href: "/history", label: "Health Trends" },
  { section: "models", href: "/models", label: "Model Insights" },
  { section: "about", href: "/about", label: "About" },
] as const;
export const workspaceItems = [
  { section: "dashboard", href: "/dashboard", label: "Workspace overview" },
  { section: "insights", href: "/insights", label: "Data & explanations" },
  { section: "reports", href: "/reports", label: "Assessment reports" },
] as const;
export function formatDate(value: string | number, withTime = false) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime
      ? ({ hour: "2-digit", minute: "2-digit", timeZoneName: "short" } as const)
      : {}),
  }).format(new Date(value));
}
export const homeCopy = {
  eyebrow: "A considered approach to cardiovascular research",
  headline: "A clearer perspective on cardiovascular health.",
  description:
    "Explore cardiovascular health indicators through research-based machine learning, structured assessments, and interpretable clinical data.",
  steps: [
    {
      title: "Enter clinical measurements",
      text: "Bring the values and findings from your examination and diagnostic reports.",
    },
    {
      title: "Review and validate inputs",
      text: `Check all ${assessmentInputCounts.required} required inputs, including the visceral fat index, and their units.`,
    },
    {
      title: "Run the research assessment",
      text: "Explore the trained classifier’s response to a complete clinical record.",
    },
    {
      title: "Understand the contributing factors",
      text: "Review the source-dataset pattern, feature contributions, and limitations.",
    },
  ],
};
