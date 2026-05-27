import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import AnimationProvider from "@/providers/AnimationProvider";

export const metadata: Metadata = {
  title: "HomeoOpinion — Homoeopathic Second Opinion",
  description: "Get qualified homoeopathic second opinions from BHMS/MD(Hom.) registered practitioners with expert doctor review.",
  keywords: "homoeopathy, homeopathy, second opinion, doctor consultation, BHMS, alternative medicine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <AnimationProvider>
            {children}
          </AnimationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
