import * as React from "react";
import { useDeviceType } from "@/hooks/use-device-type";
import { cn } from "@/lib/utils";

/**
 * DeviceShell wraps the app and applies device-specific layout density.
 *
 * - Desktop (≥1280px, non-touch): full-bleed, wider max content, comfortable spacing.
 * - Tablet  (768–1279px, or any iOS/Android tablet): centered medium width, touch-friendly hit areas.
 * - Mobile  (<768px or any phone): full-width, compact spacing, optimized for collapsible nav.
 *
 * All children render the same React tree — only the outer layout class changes,
 * so every feature (attendance, leave, payroll, booking, etc.) stays identical
 * across devices and only the presentation adapts.
 */
export const DeviceShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const device = useDeviceType();

  const shellClass = cn(
    "min-h-screen w-full bg-background text-foreground transition-colors",
    device.isDesktop && "device-desktop",
    device.isTablet && "device-tablet mx-auto max-w-6xl",
    device.isMobile && "device-mobile",
    device.isTouch && "[--tap-size:44px]",
  );

  return <div className={shellClass} data-device={device.type} data-os={device.os}>{children}</div>;
};

export default DeviceShell;
