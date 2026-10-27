import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { toLatinDigits } from "@/lib/validators";

export type FormFieldProps<T extends FieldValues> = Omit<TextFieldProps, "name" | "value" | "onChange"> & {
  name: Path<T>;
  control: Control<T>;
  /** Left-to-right value (email, phone, national ID); Arabic-Indic digits become Latin. */
  ltr?: boolean;
};

/** A text field bound to react-hook-form; its error (client or server) shows under it. */
export function FormField<T extends FieldValues>({
  name,
  control,
  ltr = false,
  helperText,
  slotProps,
  ...props
}: FormFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          name={field.name}
          value={field.value ?? ""}
          inputRef={field.ref}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(ltr ? toLatinDigits(event.target.value) : event.target.value)}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
          slotProps={{
            ...slotProps,
            htmlInput: {
              ...(slotProps?.htmlInput as object),
              ...(ltr ? { dir: "ltr" } : {}),
            },
          }}
        />
      )}
    />
  );
}
