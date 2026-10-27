import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { z } from "zod";

import type { DepartmentDetail, Member, RemoveManagerMode, Role } from "@/api/contracts";
import { toApiError } from "@/api/errors";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormDialog } from "@/components/common/FormDialog";
import { FormField } from "@/components/form/FormField";
import {
  useActiveDepartments,
  useArchiveDepartment,
  useDeleteDepartment,
  useRemoveManager,
  useSetDepartmentStatus,
  useUpdateDepartment,
} from "@/features/departments/hooks";
import { errorMessage, fieldErrorMessages } from "@/lib/error-messages";
import { formatNumber } from "@/lib/format";
import { requiredText } from "@/lib/schemas";
import { toast } from "@/lib/toast";

import { DepartmentFields, useDepartmentForm } from "./DepartmentForm";

interface DialogProps {
  department: DepartmentDetail;
  open: boolean;
  onClose: () => void;
}

// ------------------------------------------------------------------ UC-10
export function EditDepartmentDialog({ department, open, onClose }: DialogProps) {
  const { t } = useTranslation("ui");
  const update = useUpdateDepartment(department.id);
  const { form, onServerError } = useDepartmentForm(department);

  useEffect(() => {
    if (open) {
      form.reset({
        name: department.name,
        authority: department.authority,
        description: department.description ?? "",
      });
    }
  }, [open, department, form]);

  const onSubmit = form.handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: () => {
        toast.success(t("departments.updated"));
        onClose();
      },
      onError: onServerError,
    }),
  );

  return (
    <FormDialog
      open={open}
      title={t("departments.editTitle")}
      onSubmit={onSubmit}
      onClose={onClose}
      loading={update.isPending}
    >
      <Box sx={{ pt: 1 }}>
        <DepartmentFields form={form} />
      </Box>
    </FormDialog>
  );
}

// ------------------------------------------------------------------ UC-11
/** Suspension shows its effect before confirming (step 2); activation is 1a. */
export function DepartmentStatusDialog({ department, open, onClose }: DialogProps) {
  const { t } = useTranslation("ui");
  const setStatus = useSetDepartmentStatus(department.id);
  const suspending = department.status === "ACTIVE";

  const confirm = () =>
    setStatus.mutate(suspending ? "SUSPENDED" : "ACTIVE", {
      onSuccess: () => {
        toast.success(suspending ? t("departments.suspended") : t("departments.activated"));
        onClose();
      },
      onError: (error) => toast.error(errorMessage(error)),
    });

  return (
    <ConfirmDialog
      open={open}
      title={
        suspending
          ? t("departments.suspendTitle", { name: department.name })
          : t("departments.activateTitle", { name: department.name })
      }
      confirmLabel={suspending ? t("departments.actions.SUSPEND") : t("departments.actions.ACTIVATE")}
      tone={suspending ? "danger" : "primary"}
      loading={setStatus.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      {suspending ? (
        <>
          <Typography fontWeight={600} sx={{ mb: 1 }}>
            {t("departments.suspendEffect")}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 3, display: "grid", gap: 0.5 }}>
            <li>{t("departments.suspendServices", { count: formatNumber(department.service_count) })}</li>
            <li>
              {t("departments.suspendRequests", { count: formatNumber(department.open_request_count) })}
            </li>
            <li>{t("departments.suspendLogin")}</li>
          </Box>
        </>
      ) : (
        <Typography>{t("departments.activateBody")}</Typography>
      )}
    </ConfirmDialog>
  );
}

// ------------------------------------------------------------------ UC-12
interface LinkedAccount {
  id: number;
  full_name: string;
  role: Role;
}

/** Deletion needs the name typed exactly (4a); linked active accounts are listed (2a). */
export function DeleteDepartmentDialog({ department, open, onClose }: DialogProps) {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const remove = useDeleteDepartment(department.id);
  const [confirmName, setConfirmName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);

  useEffect(() => {
    if (open) {
      setConfirmName("");
      setNameError(null);
      setAccounts(null);
    }
  }, [open]);

  const submit = () =>
    remove.mutate(confirmName.trim(), {
      onSuccess: () => {
        toast.success(t("departments.deleted"));
        onClose();
        navigate("/admin/departments", { replace: true });
      },
      onError: (error) => {
        const apiError = toApiError(error);
        if (apiError.code === "department_has_active_accounts") {
          setAccounts((apiError.details.accounts as LinkedAccount[]) ?? []);
        } else if (apiError.code === "confirmation_mismatch") {
          setNameError(errorMessage(apiError));
        } else {
          toast.error(errorMessage(apiError));
        }
      },
    });

  return (
    <ConfirmDialog
      open={open}
      title={t("departments.deleteTitle", { name: department.name })}
      confirmLabel={t("departments.actions.DELETE")}
      tone="danger"
      loading={remove.isPending}
      confirmDisabled={!!accounts || confirmName.trim() !== department.name}
      onConfirm={submit}
      onClose={onClose}
    >
      {accounts ? (
        <Alert severity="warning">
          <AlertTitle>{t("departments.activeAccountsTitle")}</AlertTitle>
          {t("departments.activeAccountsBody")}
          <Box component="ul" sx={{ m: 0, mt: 1, pl: 3 }}>
            {accounts.map((account) => (
              <li key={account.id}>
                <Link component={RouterLink} to={`/admin/users/${account.id}`} onClick={onClose}>
                  {account.full_name}
                </Link>{" "}
                ({tc(`roles.${account.role}`)})
              </li>
            ))}
          </Box>
        </Alert>
      ) : (
        <Stack spacing={2}>
          <Alert severity="error">{t("departments.deleteBody")}</Alert>
          <TextField
            label={t("departments.deleteConfirmLabel")}
            value={confirmName}
            onChange={(event) => {
              setConfirmName(event.target.value);
              setNameError(null);
            }}
            error={!!nameError}
            helperText={nameError ?? t("departments.deleteConfirmHint", { name: department.name })}
            autoFocus
            autoComplete="off"
          />
        </Stack>
      )}
    </ConfirmDialog>
  );
}

/** UC-12 2b: a department linked to requests is archived instead. */
export function ArchiveDepartmentDialog({ department, open, onClose }: DialogProps) {
  const { t } = useTranslation("ui");
  const archive = useArchiveDepartment(department.id);
  return (
    <ConfirmDialog
      open={open}
      title={t("departments.archiveTitle", { name: department.name })}
      confirmLabel={t("departments.actions.ARCHIVE")}
      tone="danger"
      loading={archive.isPending}
      onConfirm={() =>
        archive.mutate(undefined, {
          onSuccess: () => {
            toast.success(t("departments.archived"));
            onClose();
          },
          onError: (error) => toast.error(errorMessage(error)),
        })
      }
      onClose={onClose}
    >
      <Typography>{t("departments.archiveBody")}</Typography>
    </ConfirmDialog>
  );
}

// ------------------------------------------------------------------ UC-13
export function RemoveManagerDialog({
  department,
  manager,
  onClose,
}: {
  department: DepartmentDetail;
  manager: Member | null;
  onClose: () => void;
}) {
  const { t } = useTranslation("ui");
  const remove = useRemoveManager(department.id);
  const [mode, setMode] = useState<RemoveManagerMode>("DEACTIVATE");
  const departments = useActiveDepartments(!!manager);
  const targets = departments.data?.items.filter((item) => item.id !== department.id) ?? [];
  const schema = useMemo(
    () => z.object({ target: mode === "TRANSFER" ? requiredText() : z.string() }),
    [mode],
  );
  const { control, handleSubmit, reset, setError } = useForm<{ target: string }>({
    resolver: zodResolver(schema),
    defaultValues: { target: "" },
  });
  const onlyManager = department.managers.length === 1;

  useEffect(() => {
    if (manager) {
      setMode("DEACTIVATE");
      reset({ target: "" });
    }
  }, [manager, reset]);

  const onSubmit = handleSubmit(({ target }) => {
    if (!manager) return;
    remove.mutate(
      {
        userId: manager.id,
        input: mode === "TRANSFER" ? { mode, target_department_id: Number(target) } : { mode },
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.left_without_manager
              ? `${t("departments.managerRemoved")} ${t("departments.leftWithoutManager")}`
              : t("departments.managerRemoved"),
          );
          onClose();
        },
        onError: (error) => {
          const apiError = toApiError(error);
          const messages = fieldErrorMessages(apiError);
          const fieldMessage = messages.target_department_id ?? messages.department_id;
          if (fieldMessage) setError("target", { type: "server", message: fieldMessage });
          else toast.error(errorMessage(apiError));
        },
      },
    );
  });

  return (
    <FormDialog
      open={!!manager}
      title={t("departments.removeManagerTitle", { name: manager?.full_name ?? "" })}
      submitLabel={t("departments.actions.REMOVE_MANAGER")}
      submitColor="error"
      onSubmit={onSubmit}
      onClose={onClose}
      loading={remove.isPending}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {onlyManager && <Alert severity="warning">{t("departments.removeManagerOnly")}</Alert>}
        <RadioGroup value={mode} onChange={(event) => setMode(event.target.value as RemoveManagerMode)}>
          <FormControlLabel
            value="DEACTIVATE"
            control={<Radio />}
            sx={{ alignItems: "flex-start", mb: 1.5 }}
            label={
              <Box sx={{ pt: 1 }}>
                <Typography fontWeight={600}>{t("departments.removeModeDeactivate")}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("departments.removeModeDeactivateHint")}
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="TRANSFER"
            control={<Radio />}
            sx={{ alignItems: "flex-start" }}
            label={
              <Box sx={{ pt: 1 }}>
                <Typography fontWeight={600}>{t("departments.removeModeTransfer")}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("departments.removeModeTransferHint")}
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
        {mode === "TRANSFER" &&
          (departments.isPending ? (
            <Skeleton variant="rounded" height={56} />
          ) : targets.length ? (
            <FormField control={control} name="target" label={t("users.transferTarget")} select required>
              {targets.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.name}
                </MenuItem>
              ))}
            </FormField>
          ) : (
            <Alert severity="warning">{t("users.transferNoTarget")}</Alert>
          ))}
      </Stack>
    </FormDialog>
  );
}
