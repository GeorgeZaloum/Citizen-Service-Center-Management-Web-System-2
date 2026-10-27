import PersonAddRounded from "@mui/icons-material/PersonAddRounded";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import type { DepartmentDetail } from "@/api/contracts";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { useCreateDepartment } from "@/features/departments/hooks";
import { toast } from "@/lib/toast";

import { DepartmentFields, useDepartmentForm } from "./DepartmentForm";

/** UC-09: the new department is active without managers; adding one (UC-04) is offered right away. */
export default function DepartmentCreatePage() {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateDepartment();
  const { form, onServerError } = useDepartmentForm();
  const [created, setCreated] = useState<DepartmentDetail | null>(null);

  const onSubmit = form.handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: (department) => {
        toast.success(t("departments.created"));
        setCreated(department);
      },
      onError: onServerError,
    }),
  );

  return (
    <>
      <PageHeader
        title={t("departments.createTitle")}
        description={t("departments.createSubtitle")}
        breadcrumbs={[
          { label: tc("nav.departments"), to: "/admin/departments" },
          { label: t("departments.add") },
        ]}
      />
      <Card component="form" noValidate onSubmit={onSubmit} sx={{ maxWidth: 640 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <DepartmentFields form={form} autoFocus />
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button
              color="inherit"
              component={RouterLink}
              to="/admin/departments"
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

      {/* UC-09 steps 5–6 and alternative 5a */}
      <ConfirmDialog
        open={!!created}
        title={t("departments.createdNextTitle", { name: created?.name ?? "" })}
        confirmLabel={t("departments.addManagerNow")}
        cancelLabel={t("departments.later")}
        onConfirm={() => navigate(`/admin/users/new-manager?department=${created?.id}`)}
        onClose={() => navigate("/admin/departments")}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <PersonAddRounded color="primary" />
          <Typography>{t("departments.createdNextBody")}</Typography>
        </Stack>
      </ConfirmDialog>
    </>
  );
}
