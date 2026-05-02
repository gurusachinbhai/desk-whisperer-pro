import * as React from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";
export type DeviceOS = "ios" | "android" | "windows" | "macos" | "linux" | "other";

const MOBILE_MAX = 767;   // <768px → mobile
const TABLET_MAX = 1279;  // 768–1279px → tablet, ≥1280px → desktop

const detectOS = (): DeviceOS => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS 13+ reports as Mac with touch
  if (/Mac/i.test(platform) && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Win/i.test(platform)) return "windows";
  if (/Mac/i.test(platform)) return "macos";
  if (/Linux/i.test(platform)) return "linux";
  return "other";
};

const detectType = (width: number, os: DeviceOS): DeviceType => {
  // Treat all iOS/Android as touch devices first
  if (os === "ios" || os === "android") {
    if (width >= 768) return "tablet";
    return "mobile";
  }
  if (width <= MOBILE_MAX) return "mobile";
  if (width <= TABLET_MAX) return "tablet";
  return "desktop";
};

export interface DeviceInfo {
  type: DeviceType;
  os: DeviceOS;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  width: number;
  height: number;
}

export function useDeviceType(): DeviceInfo {
  const [info, setInfo] = React.useState<DeviceInfo>(() => {
    if (typeof window === "undefined") {
      return {
        type: "desktop",
        os: "other",
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        width: 1280,
        height: 800,
      };
    }
    const os = detectOS();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const type = detectType(width, os);
    return {
      type,
      os,
      isMobile: type === "mobile",
      isTablet: type === "tablet",
      isDesktop: type === "desktop",
      isTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      width,
      height,
    };
  });

  React.useEffect(() => {
    const os = detectOS();
    const compute = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const type = detectType(width, os);
      setInfo({
        type,
        os,
        isMobile: type === "mobile",
        isTablet: type === "tablet",
        isDesktop: type === "desktop",
        isTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
        width,
        height,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  // Reflect on <html> so CSS / global styles can react
  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.device = info.type;
    root.dataset.os = info.os;
    root.dataset.touch = info.isTouch ? "true" : "false";
  }, [info.type, info.os, info.isTouch]);

  return info;
}
