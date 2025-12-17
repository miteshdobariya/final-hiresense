export const PROCTORING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  acknowledged: "bg-blue-500/10 text-blue-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
}

export function formatProctoringEventType(eventType: string) {
  return eventType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

