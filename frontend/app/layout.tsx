import type { Metadata } from "next";
import "./globals.css";
import "./interface.css";
import { Provider } from "@/components/provider";
export const metadata: Metadata = {
  title: "CardioLens AI · A clearer view of heart health",
  description:
    "Experimental heart-health analytics, explainable machine learning, and measurement trends.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
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
