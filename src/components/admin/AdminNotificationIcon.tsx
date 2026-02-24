import {
  AlertCircle,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  Hotel,
  HousePlus,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

function iconFromKey(iconKey: string | null | undefined) {
  const key = String(iconKey ?? "").trim().toLowerCase();
  if (key === "calendar-clock") return CalendarClock;
  if (key === "house-plus") return HousePlus;
  if (key === "building-2") return Building2;
  if (key === "hotel") return Hotel;
  if (key === "check-circle") return CheckCircle2;
  if (key === "alert-circle") return AlertCircle;
  if (key === "list-checks") return ListChecks;
  return Bell;
}

export default function AdminNotificationIcon({
  iconKey,
  className,
  size = 14,
}: {
  iconKey?: string | null;
  className?: string;
  size?: number;
}) {
  const Icon = iconFromKey(iconKey);
  return <Icon size={size} className={cn(className)} />;
}
