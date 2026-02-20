"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession, signOut } from "@/lib/auth-client";
import { hydrateFromServer } from "@/lib/hydrate";
import { syncPendingChanges } from "@/lib/sync";
import { Button } from "@/components/ui/button";

function UserNav() {
  const router = useRouter();
  const { data: session } = useSession();

  React.useEffect(() => {
    if (!session?.user) return;

    hydrateFromServer().catch(console.error);

    // Flush any writes that happened offline in a previous session
    syncPendingChanges().catch(console.error);

    // Keep flushing whenever connectivity is restored
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);

    function handleOnline() {
      syncPendingChanges().catch(console.error);
    }
  }, [session?.user?.id]);

  if (!session?.user) return null;

  return (
    <div className="fixed top-4 right-4 flex items-center gap-3 text-sm z-50">
      <span className="text-muted-foreground hidden sm:inline">
        {session.user.email}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          signOut({ fetchOptions: { onSuccess: () => router.push("/sign-in") } })
        }
      >
        Sign out
      </Button>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { networkMode: "always" },
          mutations: { networkMode: "always" },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <UserNav />
      {children}
    </QueryClientProvider>
  );
}
