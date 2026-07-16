import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/primitives";
import { DataSourceBanner } from "@/lib/data-classification";
import { calendarEvents, formatDate } from "@/lib/mock-data";
import { useState } from "react";
import { withPermission } from "@/components/require-permission";

export const Route = createFileRoute("/calendar")({ component: withPermission(CalendarPage, "calendar.view") });

const TONE: Record<string, "info" | "warning" | "success" | "muted" | "destructive"> = {
  "Match": "info",
  "Observation": "success",
  "Mentor Visit": "warning",
  "Meeting": "muted",
  "Follow Up": "destructive",
};

function CalendarPage() {
  const [view, setView] = useState<"month" | "week">("month");
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const startDow = (start.getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(today.getFullYear(), today.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay = new Map<string, typeof calendarEvents>();
  calendarEvents.forEach((e) => {
    const k = new Date(e.date).toDateString();
    if (!eventsByDay.has(k)) eventsByDay.set(k, []);
    eventsByDay.get(k)!.push(e);
  });

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i);
    return d;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        description={today.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        action={
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            <button onClick={() => setView("month")} className={`px-3 py-1.5 ${view === "month" ? "bg-accent" : "hover:bg-accent/40"}`}>Month</button>
            <button onClick={() => setView("week")} className={`px-3 py-1.5 ${view === "week" ? "bg-accent" : "hover:bg-accent/40"}`}>Week</button>
          </div>
        }
      />

      {view === "month" ? (
        <Card className="p-3">
          <div className="grid grid-cols-7 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const isToday = d?.toDateString() === today.toDateString();
              const events = d ? eventsByDay.get(d.toDateString()) ?? [] : [];
              return (
                <div key={i} className={`min-h-24 rounded-md border p-1.5 ${d ? "bg-card border-border" : "border-transparent"} ${isToday ? "ring-1 ring-primary" : ""}`}>
                  {d && <div className={`text-[11px] tabular-nums font-mono font-medium mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>{d.getDate()}</div>}
                  <div className="space-y-1">
                    {events.slice(0, 3).map((e) => (
                      <div key={e.id} className={`text-[10px] truncate px-1.5 py-0.5 rounded border ${
                        e.type === "Match" ? "bg-info/15 text-info border-info/30" :
                        e.type === "Observation" ? "bg-success/15 text-success border-success/30" :
                        e.type === "Mentor Visit" ? "bg-warning/15 text-warning border-warning/30" :
                        e.type === "Follow Up" ? "bg-destructive/15 text-destructive border-destructive/30" :
                        "bg-muted text-muted-foreground border-border"
                      }`}>{e.title}</div>
                    ))}
                    {events.length > 3 && <div className="text-[10px] text-muted-foreground">+{events.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-3">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d) => {
              const events = eventsByDay.get(d.toDateString()) ?? [];
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={d.toISOString()} className={`min-h-72 rounded-md border border-border p-2 ${isToday ? "ring-1 ring-primary" : ""}`}>
                  <div className="text-[10px] uppercase text-muted-foreground">{d.toLocaleDateString("en", { weekday: "short" })}</div>
                  <div className={`text-lg font-semibold tabular-nums font-mono ${isToday ? "text-primary" : ""}`}>{d.getDate()}</div>
                  <div className="space-y-1.5 mt-2">
                    {events.map((e) => (
                      <div key={e.id} className="text-[11px] p-1.5 rounded bg-accent/40 border border-border/60">
                        <div className="font-medium leading-tight line-clamp-2">{e.title}</div>
                        <div className="mt-1"><Pill tone={TONE[e.type]}>{e.type}</Pill></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Upcoming Events</div>
        <div className="divide-y divide-border">
          {calendarEvents.filter((e) => new Date(e.date).getTime() >= Date.now() - 86400000).sort((a, b) => +new Date(a.date) - +new Date(b.date)).slice(0, 10).map((e) => (
            <div key={e.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="w-24 text-xs text-muted-foreground tabular-nums font-mono">{formatDate(e.date)}</div>
              <Pill tone={TONE[e.type]}>{e.type}</Pill>
              <div className="flex-1 truncate">{e.title}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
