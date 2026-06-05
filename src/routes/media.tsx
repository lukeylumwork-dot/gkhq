import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/primitives";
import { getGk, formatDate } from "@/lib/mock-data";
import { Video, FileText, Image as ImageIcon, Mic, Upload, Trash2, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { WorkflowDialog, type WorkflowKind } from "@/components/workflows";
import { useAuth } from "@/lib/auth";
import { listMedia, getSignedUrl, deleteMedia, formatBytes, type MediaAsset, type MediaKind } from "@/lib/media-store";

export const Route = createFileRoute("/media")({ component: MediaPage });

const ICONS: Record<MediaKind, typeof Video> = { video: Video, pdf: FileText, image: ImageIcon, audio: Mic };
const KINDS = ["all", "video", "pdf", "image", "audio"] as const;

function MediaPage() {
  const { can, user } = useAuth();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<WorkflowKind | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMedia();
      setAssets(data);
    } catch (e) {
      console.error("Failed to load media", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onUploaded = () => load();
    window.addEventListener("rpm:media-uploaded", onUploaded);
    return () => window.removeEventListener("rpm:media-uploaded", onUploaded);
  }, [load]);

  const filtered = kind === "all" ? assets : assets.filter((m) => m.media_type === kind);

  const openAsset = async (a: MediaAsset) => {
    try {
      const url = await getSignedUrl(a.file_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (a: MediaAsset) => {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    setBusyId(a.id);
    try {
      await deleteMedia(a);
      setAssets((prev) => prev.filter((x) => x.id !== a.id));
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const canDelete = (a: MediaAsset) =>
    user?.role === "admin" || (a.uploaded_by_id && a.uploaded_by_id === user?.id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Media Library"
        description={loading ? "Loading…" : `${assets.length} asset${assets.length === 1 ? "" : "s"} linked to goalkeeper profiles.`}
        action={can("media.upload") ? (
          <button onClick={() => setWorkflow("media")} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
            <Upload className="size-4" />Upload
          </button>
        ) : null}
      />

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-md border text-xs capitalize ${kind === k ? "bg-accent border-accent text-accent-foreground" : "border-border hover:bg-accent/40 text-muted-foreground"}`}>{k}</button>
        ))}
      </div>

      {!loading && filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No media yet. {can("media.upload") ? "Click Upload to add the first clip, PDF, image or voice note." : "Ask an admin, mentor or scout to upload assets."}
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((m) => {
            const Icon = ICONS[m.media_type] ?? FileText;
            const gk = getGk(m.gk_id);
            return (
              <Card key={m.id} className="overflow-hidden group">
                <button onClick={() => openAsset(m)} className="block w-full text-left">
                  <div className="aspect-video bg-gradient-to-br from-accent/40 to-muted grid place-items-center border-b border-border relative">
                    <Icon className="size-10 text-muted-foreground" />
                    <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition bg-background/40">
                      <ExternalLink className="size-5" />
                    </div>
                  </div>
                </button>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium leading-tight line-clamp-2">{m.title}</div>
                    <Pill>{m.media_type}</Pill>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1.5">{gk?.name ?? "Unknown goalkeeper"}</div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                    <span>{formatDate(m.created_at)}</span>
                    <span className="tabular-nums">{formatBytes(m.file_size)}</span>
                  </div>
                  {(m.uploaded_by_name || canDelete(m)) && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
                      <span className="text-[10px] text-muted-foreground truncate">
                        {m.uploaded_by_name ? `by ${m.uploaded_by_name}` : ""}
                      </span>
                      {canDelete(m) && (
                        <button
                          onClick={() => handleDelete(m)}
                          disabled={busyId === m.id}
                          className="text-[10px] text-muted-foreground hover:text-red-400 inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 className="size-3" />{busyId === m.id ? "…" : "Delete"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <WorkflowDialog kind={workflow} onClose={() => setWorkflow(null)} />
    </div>
  );
}
