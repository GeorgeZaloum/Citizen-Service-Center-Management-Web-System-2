import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { UserDetail } from "@/api/contracts";
import { FormDialog } from "@/components/common/FormDialog";
import { LtrText } from "@/components/common/LtrText";
import { PasswordStrength } from "@/components/common/PasswordStrength";
import { FormField } from "@/components/form/FormField";
import { PasswordField } from "@/components/form/PasswordField";
import { useActiveDepartments } from "@/features/departments/hooks";
import {
  useResetUserPassword,
  useSetUserStatus,
  useTransferUser,
  useUpdateUser,
} from "@/features/users/hooks";
import { useServerErrors } from "@/hooks/use-server-errors";
import { generatePassword } from "@/lib/password";
import { emailField, optionalText, phoneField, requiredText, withPasswordConfirmation } from "@/lib/schemas";
import { toast } from "@/lib/toast";

interface DialogProps {
  user: UserDetail;
  open: boolean;
  onClose: () => void;
}

// ------------------------------------------------------------------ UC-15
const EDIT_FIELDS = ["full_name", "email", "phone", "job_title"] as const;

export function EditUserDialog({ user, open, onClose }: DialogProps) {
  const { t } = useTranslation("ui");
  const update = useUpdateUser(user.id);
  const schema = useMemo(
    () =>
      z.object({
        full_name: requiredText(150),
        email: emailField(),
        phone: phoneField(),
        job_title: optionalText(100),
      }),
    [],
  );
  type Values = z.infer<typeof schema>;
  const initial = useMemo(
    () => ({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      job_title: user.job_title ?? "",
    }),
    [user],
  );
  const { control, handleSubmit, setError, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });
  const applyServerErrors = useServerErrors(setError, EDIT_FIELDS);

  useEffect(() => {
    if (open) reset(initial);
  }, [open, initial, reset]);

  const onSubmit = handleSubmit((values) => {
    // Only the changed fields: the department is never sent (UC-15 4c, transfer is UC-17).
    const changes = Object.fromEntries(
      Object.entries(values).filter(([key, value]) => value !== initial[key as keyof Values]),
    );
    if (!Object.keys(changes).length) {
      onClose();
      return;
    }
    update.mutate(changes, {
      onSuccess: () => {
        toast.success(t("users.updated"));
        onClose();
      },
      onError: applyServerErrors,
    });
  });

  return (
    <FormDialog
      open={open}
      title={t("users.editTitle")}
      onSubmit={onSubmit}
      onClose={onClose}
      loading={update.isPending}
    >
      <Stack spacing={2.25} sx={{ pt: 1 }}>
        <FormField control={control} name="full_name" label={t("fields.full_name")} required />
        <FormField control={control} name="email" type="email" label={t("fields.email")} ltr required />
        <FormField control={control} name="phone" type="tel" label={t("fields.phone")} ltr required />
        <FormField
          control={control}
          name="job_title"
          label={`${t("fields.job_title")} (${t("form.optional")})`}
        />
        <Typography variant="body2" color="text.secondary">
          {t("users.editHint")}
        </Typography>
      </Stack>
    </FormDialog>
  );
}

// ------------------------------------------------------------------ UC-03
const RESET_FIELDS = ["new_password", "new_password_confirmation"] as const;
type ResetValues = Record<(typeof RESET_FIELDS)[number], string>;
const EMPTY_RESET: ResetValues = { new_password: "", new_password_confirmation: "" };

/** After success the new password is shown once, so the manager can tell its owner directly. */
export function ResetPasswordDialog({ user, open, onClose }: DialogProps) {
  const { t } = useTranslation("ui");
  const resetPassword = useResetUserPassword(user.id);
  const [done, setDone] = useState<string | null>(null);
  const schema = useMemo(() => withPasswordConfirmation({}, "new_password", "new_password_confirmation"), []);
  const { control, handleSubmit, setError, reset, setValue } = useForm<ResetValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_RESET,
  });
  const password = useWatch({ control, name: "new_password" });
  const applyServerErrors = useServerErrors(setError, RESET_FIELDS);

  useEffect(() => {
    if (open) {
      reset(EMPTY_RESET);
      setDone(null);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit((values) =>
    resetPassword.mutate(values, {
      onSuccess: () => setDone(values.new_password),
      onError: applyServerErrors,
    }),
  );

  const fill = () => {
    const generated = generatePassword();
    setValue("new_password", generated, { shouldValidate: true });
    setValue("new_password_confirmation", generated, { shouldValidate: true });
  };

  const copy = async () => {
    if (!done) return;
    try {
      await navigator.clipboard.writeText(done);
      toast.success(t("users.copied"));
    } catch {
      // Clipboard unavailable: the password stays visible on screen.
    }
  };

  return (
    <FormDialog
      open={open}
      title={done ? t("users.resetDoneTitle") : t("users.resetTitle", { name: user.full_name })}
      onSubmit={onSubmit}
      onClose={onClose}
      loading={resetPassword.isPending}
      actions={
        done ? (
          <Button variant="contained" onClick={onClose}>
            {t("users.done")}
          </Button>
        ) : undefined
      }
    >
      {done ? (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="success">{t("users.resetDoneBody", { name: user.full_name })}</Alert>
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: "sage.soft",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography variant="h4" component="p" sx={{ fontFamily: "monospace", letterSpacing: 1 }}>
              <LtrText>{done}</LtrText>
            </Typography>
            <Button startIcon={<ContentCopyRounded />} onClick={() => void copy()}>
              {t("users.copy")}
            </Button>
          </Box>
        </Stack>
      ) : (
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          <Typography color="text.secondary">{t("users.resetHint")}</Typography>
          <Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
              <Button size="small" startIcon={<AutoAwesomeRounded />} onClick={fill}>
                {t("users.generatePassword")}
              </Button>
            </Box>
            <PasswordField
              control={control}
              name="new_password"
              label={t("fields.new_password")}
              autoComplete="new-password"
              required
            />
            <PasswordStrength value={password} />
          </Box>
          <PasswordField
            control={control}
            name="new_password_confirmation"
            label={t("fields.new_password_confirmation")}
            autoComplete="new-password"
            required
          />
        </Stack>
      )}
    </FormDialog>
  );
}

// ------------------------------------------------------------------ UC-16
export function UserStatusDialog({ user, open, onClose }: DialogProps) {
  const { t } = useTranslation("ui");
  const setStatus = useSetUserStatus(user.id);
  const deactivating = user.status !== "DISABLED";
  const schema = useMemo(
    () => z.object({ reason: deactivating ? requiredText(500) : optionalText(500) }),
    [deactivating],
  );
  const { control, handleSubmit, setError, reset } = useForm<{ reason: string }>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });
  const applyServerErrors = useServerErrors(setError, ["reason"]);

  useEffect(() => {
    if (open) reset({ reason: "" });
  }, [open, reset]);

  const onSubmit = handleSubmit(({ reason }) =>
    setStatus.mutate(deactivating ? { status: "DISABLED", reason } : { status: "ACTIVE", reason: "" }, {
      onSuccess: () => {
        toast.success(deactivating ? t("users.deactivated") : t("users.activated"));
        onClose();
      },
      onError: applyServerErrors,
    }),
  );

  return (
    <FormDialog
      open={open}
      title={
        deactivating
          ? t("users.deactivateTitle", { name: user.full_name })
          : t("users.activateTitle", { name: user.full_name })
      }
      submitLabel={deactivating ? t("users.deactivate") : t("users.activate")}
      submitColor={deactivating ? "error" : "primary"}
      onSubmit={onSubmit}
      onClose={onClose}
      loading={setStatus.isPending}
    >
      <Stack spacing={2.25} sx={{ pt: 1 }}>
        <Typography>{deactivating ? t("users.deactivateBody") : t("users.activateBody")}</Typography>
        {deactivating && (
          <>
            {user.role === "EMPLOYEE" && (
              <Typography variant="body2" color="text.secondary">
                {t("users.deactivateRequestsNote")}
              </Typography>
            )}
            <FormField
              control={control}
              name="reason"
              label={t("fields.reason")}
              multiline
              minRows={3}
              required
              autoFocus
            />
          </>
        )}
      </Stack>
    </FormDialog>
  );
}

// ------------------------------------------------------------------ UC-17
export function TransferUserDialog({
  user,
  open,
  onClose,
  initialDepartmentId,
}: DialogProps & { initialDepartmentId?: number }) {
  const { t } = useTranslation("ui");
  const transfer = useTransferUser(user.id);
  const departments = useActiveDepartments(open);
  const targets = departments.data?.items.filter((department) => department.id !== user.department?.id) ?? [];
  const schema = useMemo(() => z.object({ department_id: requiredText() }), []);
  const { control, handleSubmit, setError, reset } = useForm<{ department_id: string }>({
    resolver: zodResolver(schema),
    defaultValues: { department_id: "" },
  });
  const applyServerErrors = useServerErrors(setError, ["department_id"]);

  useEffect(() => {
    if (open) reset({ department_id: initialDepartmentId ? String(initialDepartmentId) : "" });
  }, [open, initialDepartmentId, reset]);

  const onSubmit = handleSubmit(({ department_id }) =>
    transfer.mutate(Number(department_id), {
      onSuccess: () => {
        toast.success(t("users.transferred"));
        onClose();
      },
      onError: applyServerErrors,
    }),
  );

  const noTarget = departments.isSuccess && targets.length === 0;

  return (
    <FormDialog
      open={open}
      title={t("users.transferTitle", { name: user.full_name })}
      submitLabel={t("users.transfer")}
      onSubmit={onSubmit}
      onClose={onClose}
      loading={transfer.isPending}
      actions={
        noTarget ? (
          <Button variant="contained" onClick={onClose}>
            {t("users.done")}
          </Button>
        ) : undefined
      }
    >
      <Stack spacing={2.25} sx={{ pt: 1 }}>
        <Typography>
          {t("users.transferCurrent", { department: user.department?.name ?? t("users.transferNone") })}
        </Typography>
        {departments.isPending ? (
          <Skeleton variant="rounded" height={56} />
        ) : noTarget ? (
          // UC-17 2a
          <Alert severity="warning">{t("users.transferNoTarget")}</Alert>
        ) : (
          <>
            <FormField
              control={control}
              name="department_id"
              label={t("users.transferTarget")}
              select
              required
            >
              {targets.map((department) => (
                <MenuItem key={department.id} value={String(department.id)}>
                  {department.name}
                </MenuItem>
              ))}
            </FormField>
            <Typography variant="body2" color="text.secondary">
              {t("users.transferHint")}
            </Typography>
          </>
        )}
      </Stack>
    </FormDialog>
  );
}
