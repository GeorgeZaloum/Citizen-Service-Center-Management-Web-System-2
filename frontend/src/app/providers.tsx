import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { setSessionExpiredHandler } from "@/api/http-client";
import { Toaster } from "@/components/feedback/Toaster";
import { useAuthStore } from "@/features/auth/store";

import { ColorModeProvider } from "./theme/ColorModeProvider";

/** A 401 `not_authenticated` anywhere ends the session; the route guard then opens the login page. */
function SessionExpiryBridge({ client }: { client: QueryClient }) {
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (useAuthStore.getState().status !== "authenticated") return;
      client.clear();
      useAuthStore.getState().clearSession("expired");
    });
    return () => setSessionExpiredHandler(null);
  }, [client]);
  return null;
}

export function AppProviders({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <ColorModeProvider>
        <SessionExpiryBridge client={client} />
        {children}
        <Toaster />
      </ColorModeProvider>
    </QueryClientProvider>
  );
}
