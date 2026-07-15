import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/lib/auth";
import { NotificationsProvider } from "@/lib/notifications";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-semibold text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">That route doesn't exist.</p>
        <a href="/" className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Back to dashboard</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GKHQ by RPM | Ops, Comms & Scouting" },
      { name: "description", content: "Internal goalkeeper development, mentor operations and scouting intelligence platform for Refuel Performance Management." },
      { property: "og:title", content: "GKHQ by RPM | Ops, Comms & Scouting" },
      { name: "twitter:title", content: "GKHQ by RPM | Ops, Comms & Scouting" },
      { property: "og:description", content: "Internal goalkeeper development, mentor operations and scouting intelligence platform for Refuel Performance Management." },
      { name: "twitter:description", content: "Internal goalkeeper development, mentor operations and scouting intelligence platform for Refuel Performance Management." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/DKWitbl2WAUehYvkG2CKPOsUROy1/social-images/social-1784101443430-Screenshot_2026-07-15_at_05.45.49.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/DKWitbl2WAUehYvkG2CKPOsUROy1/social-images/social-1784101443430-Screenshot_2026-07-15_at_05.45.49.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <AppShell />
          <Toaster richColors closeButton position="top-right" />
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
