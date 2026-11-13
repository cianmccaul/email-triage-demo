import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inbox triage demo",
  description: "AI email triage for a small clinic: sorts the inbox, drafts replies and learns from staff edits.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE">
      <body className="min-h-screen font-sans antialiased">
        <div className="wash" aria-hidden="true">
          <span className="a" />
          <span className="b" />
          <span className="c" />
        </div>
        <a className="back-link" href="https://cianmccaul.vercel.app">
          <span aria-hidden="true">←</span> Back to portfolio
        </a>
        {children}
      </body>
    </html>
  );
}
