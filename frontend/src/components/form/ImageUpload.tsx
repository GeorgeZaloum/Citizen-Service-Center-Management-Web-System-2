import AddPhotoAlternateRounded from "@mui/icons-material/AddPhotoAlternateRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormHelperText from "@mui/material/FormHelperText";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ID_IMAGE_TYPES } from "@/lib/validators";

interface ImageUploadProps {
  label: string;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  name?: string;
}

/** One ID card side: choose a JPG/PNG file and see it before sending (UC-01). */
export function ImageUpload({ label, value, onChange, error, name }: ImageUploadProps) {
  const { t } = useTranslation("ui");
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  return (
    <Box>
      <Typography
        component="label"
        htmlFor={inputId}
        variant="body2"
        fontWeight={600}
        sx={{ display: "block", mb: 1 }}
      >
        {label}
      </Typography>
      <Box
        sx={(theme) => ({
          position: "relative",
          borderRadius: 1,
          border: `1.5px dashed ${error ? theme.palette.error.main : theme.palette.divider}`,
          bgcolor: preview ? "background.paper" : alpha(theme.palette.primary.main, 0.03),
          aspectRatio: "16 / 10",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
          transition: "border-color 150ms",
          "&:hover": { borderColor: error ? "error.main" : "primary.main" },
        })}
      >
        {preview ? (
          <Box
            component="img"
            src={preview}
            alt={label}
            sx={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <Box sx={{ textAlign: "center", color: "text.secondary", p: 2 }}>
            <AddPhotoAlternateRounded sx={{ fontSize: 40, color: "primary.main", opacity: 0.7 }} />
            <Typography variant="body2">JPG / PNG · 5MB</Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Button size="small" variant="outlined" onClick={() => inputRef.current?.click()}>
          {value ? t("image.change") : t("image.choose")}
        </Button>
        {value && (
          <>
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              {t("image.remove")}
            </Button>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 160 }} dir="ltr">
              {value.name}
            </Typography>
          </>
        )}
      </Box>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={ID_IMAGE_TYPES.join(",")}
        hidden
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {error && (
        <FormHelperText id={errorId} error>
          {error}
        </FormHelperText>
      )}
    </Box>
  );
}
