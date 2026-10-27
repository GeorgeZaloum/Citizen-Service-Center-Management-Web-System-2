import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";

import { useAuthStore } from "@/features/auth/store";

import { AppProviders } from "./providers";
import { queryClient } from "./query-client";
import { createAppRouter } from "./router";

export function App() {
  const [router] = useState(createAppRouter);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  // Start-up: CSRF cookie, then GET /auth/me/ to restore the session.
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <AppProviders client={queryClient}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </AppProviders>
  );
}
