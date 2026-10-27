import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

import { useToastStore } from "@/lib/toast";

/** Shows the oldest queued toast; the next one appears when it closes. */
export function Toaster() {
  const current = useToastStore((state) => state.queue[0]);
  const dismiss = useToastStore((state) => state.dismiss);
  if (!current) return null;
  return (
    <Snackbar
      key={current.id}
      open
      autoHideDuration={current.severity === "error" ? 7000 : 4500}
      onClose={(_event, reason) => reason !== "clickaway" && dismiss(current.id)}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ bottom: { xs: 80, md: 24 } }}
    >
      <Alert
        severity={current.severity}
        variant="filled"
        onClose={() => dismiss(current.id)}
        sx={{ width: "100%", alignItems: "center" }}
      >
        {current.message}
      </Alert>
    </Snackbar>
  );
}
