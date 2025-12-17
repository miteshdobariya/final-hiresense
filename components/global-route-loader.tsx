"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Loader from "@/components/ui/loader";

export default function GlobalRouteLoader() {
  const [routeLoading, setRouteLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setRouteLoading(false); // Hide loader when path changes
  }, [pathname]);

  useEffect(() => {
    // For App Router, we can't use router.events, so we show loader on navigation
    const handleStart = () => setRouteLoading(true);
    // Listen for push/replace navigation
    const origPush = router.push;
    const origReplace = router.replace;
    router.push = (...args) => {
      handleStart();
      return origPush.apply(router, args);
    };
    router.replace = (...args) => {
      handleStart();
      return origReplace.apply(router, args);
    };
    return () => {
      router.push = origPush;
      router.replace = origReplace;
    };
  }, [router]);

  if (!routeLoading) return null;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(255,255,255,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Loader text="loading..." />
    </div>
  );
} 