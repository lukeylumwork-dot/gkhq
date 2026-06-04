import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/primitives";
import { media, getGk, formatDate } from "@/lib/mock-data";
import { Video, FileText, Image as ImageIcon, Mic, Upload } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/media")({ component: MediaPage });

const ICONS = { video: Video, pdf: FileText, image: ImageIcon, audio: Mic } as const;
const KINDS = ["all", "video", "pdf", "image", "audio"] as const;

function MediaPage() {
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const filtered = kind === "all" ? media : media.filter((m) => m.kind === kind);
  return (
    <div className="space-y-5">
      <PageHeader title="Media Library" description={`${media.length} assets linked to goalkeeper profiles.`} action={<button className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5"><Upload className="size-4" />Upload</button>} />

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-md border text-xs capitalize ${kind === k ? "bg-accent border-accent text-accent-foreground" : "border-border hover:bg-accent/40 text-muted-foreground"}`}>{k}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((m) => {
          const Icon = ICONS[m.kind];
          const gk = getGk(m.gkId);
          return (
            <Card key={m.id} className="overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-accent/40 to-muted grid place-items-center border-b border-border">
                <Icon className="size-10 text-muted-foreground" />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium leading-tight line-clamp-2">{m.title}</div>
                  <Pill>{m.kind}</Pill>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1.5">{gk?.name}</div>
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1"><span>{formatDate(m.date)}</span><span className="tabular-nums">{m.size}</span></div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
