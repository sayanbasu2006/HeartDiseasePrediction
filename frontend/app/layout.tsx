import type { Metadata } from "next";
import "./globals.css";
import "./interface.css";
import "./clinical.css";
import { Provider } from "@/components/provider";
export const metadata: Metadata = {
  title: "CardioLens AI · Cardiovascular Research & Assessment",
  description:
    "Structured cardiovascular research assessments, interpretable machine learning, and recorded measurement trends. Not a medical diagnosis.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t='light';try{if(localStorage.getItem('cardiolens-theme-v2')==='dark')t='dark'}catch(e){}document.documentElement.dataset.theme=t})()`,
          }}
        />
      </head>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
