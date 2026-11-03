import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace";
export function generateStaticParams() {
  return [
    "dashboard",
    "predict",
    "upload",
    "history",
    "insights",
    "models",
    "reports",
    "about",
  ].map((section) => ({ section }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "dashboard",
      "predict",
      "upload",
      "history",
      "insights",
      "models",
      "reports",
      "about",
    ].includes(section)
  )
    notFound();
  return <Workspace section={section} />;
}
