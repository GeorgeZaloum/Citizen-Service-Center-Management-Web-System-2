import Box from "@mui/material/Box";

import { useAuthStore } from "@/features/auth/store";

import { ErrorState } from "./ErrorState";

/** The server could not be reached while checking the session (not a 401). */
export function SessionErrorScreen() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <ErrorState code="network_error" onRetry={() => void bootstrap()} />
    </Box>
  );
}
