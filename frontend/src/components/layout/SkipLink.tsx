import Link from "@mui/material/Link";
import { useTranslation } from "react-i18next";

/** First focusable element: jumps keyboard users past the navigation. */
export function SkipLink() {
  const { t } = useTranslation();
  return (
    <Link
      href="#main-content"
      sx={{
        position: "absolute",
        insetInlineStart: 16,
        top: -48,
        zIndex: 2000,
        px: 2,
        py: 1,
        borderRadius: "8px",
        bgcolor: "primary.main",
        color: "primary.contrastText",
        "&:focus": { top: 12 },
      }}
    >
      {t("app.skipToContent")}
    </Link>
  );
}
