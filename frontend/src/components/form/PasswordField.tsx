import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { useState } from "react";
import type { FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormField, type FormFieldProps } from "./FormField";

/** Password input with a show/hide button. */
export function PasswordField<T extends FieldValues>(props: FormFieldProps<T>) {
  const { t } = useTranslation("ui");
  const [visible, setVisible] = useState(false);
  const label = visible ? t("form.hidePassword") : t("form.showPassword");
  return (
    <FormField
      {...props}
      ltr
      type={visible ? "text" : "password"}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setVisible((value) => !value)} edge="end" aria-label={label}>
                {visible ? <VisibilityOffRounded /> : <VisibilityRounded />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
