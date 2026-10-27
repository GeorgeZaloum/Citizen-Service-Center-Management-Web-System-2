import BrokenImageRounded from "@mui/icons-material/BrokenImageRounded";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { IdentitySide } from "@/api/contracts";
import { fetchIdentityDocument } from "@/features/auth/api";

/**
 * One side of a citizen's ID card. The image is never a public URL: it is downloaded with
 * the session as a blob (README "Session and CSRF", point 6) and shown from memory.
 */
export function SecureImage({ userId, side }: { userId: number; side: IdentitySide }) {
  const { t } = useTranslation("ui");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const label = t("image.alt", { side: t(side === "FRONT" ? "image.front" : "image.back") });
  const query = useQuery({
    queryKey: ["identity-document", userId, side],
    queryFn: () => fetchIdentityDocument(userId, side),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!query.data) return;
    const objectUrl = URL.createObjectURL(query.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [query.data]);

  return (
    <Box>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
        {t(side === "FRONT" ? "image.front" : "image.back")}
      </Typography>
      {query.isError ? (
        <Box
          role="img"
          aria-label={t("image.loadError")}
          sx={{
            aspectRatio: "16 / 10",
            borderRadius: 1,
            bgcolor: "action.hover",
            display: "grid",
            placeItems: "center",
            color: "text.secondary",
            textAlign: "center",
          }}
        >
          <Box>
            <BrokenImageRounded />
            <Typography variant="body2">{t("image.loadError")}</Typography>
          </Box>
        </Box>
      ) : !url ? (
        <Skeleton variant="rounded" sx={{ aspectRatio: "16 / 10", height: "auto", borderRadius: 1 }} />
      ) : (
        <ButtonBase
          onClick={() => setOpen(true)}
          aria-label={label}
          sx={{ width: "100%", borderRadius: 1, overflow: "hidden", border: 1, borderColor: "divider" }}
        >
          <Box
            component="img"
            src={url}
            alt={label}
            sx={{
              width: "100%",
              aspectRatio: "16 / 10",
              objectFit: "contain",
              bgcolor: "background.default",
            }}
          />
        </ButtonBase>
      )}
      <Dialog open={open && !!url} onClose={() => setOpen(false)} maxWidth="md" fullWidth aria-label={label}>
        {url && <Box component="img" src={url} alt={label} sx={{ width: "100%", display: "block" }} />}
      </Dialog>
    </Box>
  );
}
