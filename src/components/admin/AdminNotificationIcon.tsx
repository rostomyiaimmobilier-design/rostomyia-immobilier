import { AlertCircle, Bell, Building2, CalendarClock, CheckCircle2, Hotel, HousePlus, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminNotificationIcon({
  iconKey,
  className,
  size = 14,
}: {
  iconKey?: string | null;
  className?: string;
  size?: number;
}) {
  const key = String(iconKey ?? "").trim().toLowerCase();
  if (key === "calendar-clock") return <CalendarClock size={size} className={cn(className)} />;
  if (key === "house-plus") return <HousePlus size={size} className={cn(className)} />;
  if (key === "building-2") return <Building2 size={size} className={cn(className)} />;
  if (key === "hotel") return <Hotel size={size} className={cn(className)} />;
  if (key === "check-circle") return <CheckCircle2 size={size} className={cn(className)} />;
  if (key === "alert-circle") return <AlertCircle size={size} className={cn(className)} />;
  if (key === "list-checks") return <ListChecks size={size} className={cn(className)} />;
  return <Bell size={size} className={cn(className)} />;
}
