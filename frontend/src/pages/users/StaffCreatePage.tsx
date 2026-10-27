import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { toApiError } from "@/api/errors";
import { PageHeader } from "@/components/common/PageHeader";
import { PasswordStrength } from "@/components/common/PasswordStrength";
import { FormField } from "@/components/form/FormField";
import { PasswordField } from "@/components/form/PasswordField";
import { useCurrentUser } from "@/features/auth";
import { useActiveDepartments } from "@/features/departments/hooks";
import { useCreateStaff } from "@/features/users/hooks";
import { useServerErrors } from "@/hooks/use-server-errors";
import { generatePassword } from "@/lib/password";
import { emailField, optionalText, phoneField, requiredText, withPasswordConfirmation } from "@/lib/schemas";
import { toast } from "@/lib/toast";

import { USERS_BASE, type ManagerScope } from "./scope";

const FIELDS = [
  "full_name",
  "email",
  "phone",
  "job_title",
  "department_id",
  "password",
  "password_confirmation",
] as const;

interface Values {
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  department_id: string;
  password: string;
  password_confirmation: string;
}

/**
 * UC-05 (Department Manager → Employee, department fixed) and UC-04 (System Administrator →
 * Department Manager of an active department).
 */
export default function StaffCreatePage({ scope }: { scope: ManagerScope }) {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const admin = scope === "admin";
  const create = useCreateStaff();
  const departments = useActiveDepartments(admin);
  const [existingManagerId, setExistingManagerId] = useState<number | null>(null);

  const schema = useMemo(
    () =>
      withPasswordConfirmation(
        {
          full_name: requiredText(150),
          email: emailField(),
          phone: phoneField(),
          job_title: optionalText(100),
          department_id: admin ? requiredText() : z.string(),
        },
        "password",
        "password_confirmation",
      ),
    [admin],
  );
  const { control, handleSubmit, setError, setValue, getValues } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      job_title: "",
      department_id: params.get("department") ?? "",
      password: "",
      password_confirmation: "",
    },
  });
  const password = useWatch({ control, name: "password" });
  const applyServerErrors = useServerErrors(setError, FIELDS);

  const noActiveDepartment = admin && departments.isSuccess && departments.data.items.length === 0;

  const onSubmit = handleSubmit((values) => {
    setExistingManagerId(null);
    create.mutate(
      {
        role: admin ? "DEPT_MANAGER" : "EMPLOYEE",
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        job_title: values.job_title || undefined,
        // UC-05: the department is never sent by a Department Manager; the server uses theirs.
        department_id: admin ? Number(values.department_id) : undefined,
        password: values.password,
        password_confirmation: values.password_confirmation,
      },
      {
        onSuccess: (created) => {
          toast.success(t("users.created"));
          navigate(
            admin && created.department ? `/admin/departments/${created.department.id}` : USERS_BASE[scope],
          );
        },
        onError: (error) => {
          const apiError = applyServerErrors(error);
          // UC-04 4b: the email belongs to another Department Manager: offer to transfer them.
          const existing = toApiError(apiError).details.existing_manager_id;
          if (apiError.code === "email_taken" && typeof existing === "number") setExistingManagerId(existing);
        },
      },
    );
  });

  const fillGenerated = () => {
    const generated = generatePassword();
    setValue("password", generated, { shouldValidate: true });
    setValue("password_confirmation", generated, { shouldValidate: true });
  };

  return (
    <>
      <PageHeader
        title={admin ? t("users.createManagerTitle") : t("users.createEmployeeTitle")}
        description={admin ? t("users.createManagerSubtitle") : t("users.createEmployeeSubtitle")}
        breadcrumbs={[
          { label: admin ? tc("nav.users") : tc("nav.employees"), to: USERS_BASE[scope] },
          { label: admin ? t("users.addManager") : t("users.addEmployee") },
        ]}
      />
      {noActiveDepartment ? (
        // UC-04 2a
        <Alert
          severity="warning"
          action={
            <Button color="inherit" component={RouterLink} to="/admin/departments/new">
              {t("users.createDepartment")}
            </Button>
          }
        >
          {t("users.noActiveDepartment")}
        </Alert>
      ) : (
        <Card component="form" noValidate onSubmit={onSubmit} sx={{ maxWidth: 860 }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            {existingManagerId && (
              <Alert
                severity="info"
                sx={{ mb: 3 }}
                action={
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to={`/admin/users/${existingManagerId}?action=transfer&department=${getValues("department_id")}`}
                  >
                    {t("users.transferInstead")}
                  </Button>
                }
              >
                {t("users.emailTakenManager")}
              </Alert>
            )}
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormField
                  control={control}
                  name="full_name"
                  label={t("fields.full_name")}
                  required
                  autoFocus
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                {admin ? (
                  departments.isPending ? (
                    <Skeleton variant="rounded" height={56} />
                  ) : (
                    <FormField
                      control={control}
                      name="department_id"
                      label={t("fields.department")}
                      select
                      required
                    >
                      {departments.data?.items.map((department) => (
                        <MenuItem key={department.id} value={String(department.id)}>
                          {department.name}
                        </MenuItem>
                      ))}
                    </FormField>
                  )
                ) : (
                  <TextField
                    label={t("users.fixedDepartment")}
                    value={user?.department?.name ?? ""}
                    disabled
                    slotProps={{ htmlInput: { readOnly: true } }}
                  />
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormField
                  control={control}
                  name="email"
                  type="email"
                  label={t("fields.email")}
                  placeholder={t("placeholders.email")}
                  ltr
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormField
                  control={control}
                  name="phone"
                  type="tel"
                  label={t("fields.phone")}
                  placeholder={t("placeholders.phone")}
                  ltr
                  required
                  slotProps={{ htmlInput: { maxLength: 10 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormField
                  control={control}
                  name="job_title"
                  label={`${t("fields.job_title")} (${t("form.optional")})`}
                />
              </Grid>
              <Grid size={12}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: 1,
                    mb: 1.5,
                  }}
                >
                  <Typography variant="h6" component="h2" sx={{ color: "gold.text" }}>
                    {t("users.initialPassword")}
                  </Typography>
                  <Button size="small" startIcon={<AutoAwesomeRounded />} onClick={fillGenerated}>
                    {t("users.generatePassword")}
                  </Button>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <PasswordField
                  control={control}
                  name="password"
                  label={t("fields.password")}
                  autoComplete="new-password"
                  required
                />
                <PasswordStrength value={password} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <PasswordField
                  control={control}
                  name="password_confirmation"
                  label={t("fields.password_confirmation")}
                  autoComplete="new-password"
                  required
                />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button
                color="inherit"
                component={RouterLink}
                to={USERS_BASE[scope]}
                disabled={create.isPending}
              >
                {tc("actions.cancel")}
              </Button>
              <Button type="submit" variant="contained" disabled={create.isPending}>
                {create.isPending ? t("form.saving") : tc("actions.save")}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </>
  );
}
