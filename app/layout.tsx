import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import AuthProvider from "@/components/auth-provider"; // ✅ your custom AuthProvider
import { SocketProvider } from "@/components/providers/socket-provider";
import GlobalRouteLoader from "@/components/global-route-loader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HireSense AI Admin Dashboard",
  description: "Manage candidates and interviews",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalRouteLoader />
         <Toaster position="top-center" reverseOrder={false} />
        <AuthProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthProvider> {/* ✅ Wrap the whole app */}
      </body>
    </html>
  );
}
