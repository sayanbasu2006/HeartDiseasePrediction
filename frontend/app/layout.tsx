import type { Metadata } from "next";
import "./globals.css";
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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t='dark';try{if(localStorage.getItem('cardiolens-theme-v2')==='light')t='light'}catch(e){}document.documentElement.dataset.theme=t})()`,
          }}
        />
      </head>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
