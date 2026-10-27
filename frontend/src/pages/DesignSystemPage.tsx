import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DamascenePattern } from "@/components/common/DamascenePattern";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Logo } from "@/components/common/Logo";
import { LtrText } from "@/components/common/LtrText";
import { PageHeader } from "@/components/common/PageHeader";
import { PasswordStrength } from "@/components/common/PasswordStrength";
import { StatusChip } from "@/components/common/StatusChip";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";

function Swatch({ name, value, fg }: { name: string; value: string; fg: string }) {
  return (
    <Box
      sx={{
        bgcolor: value,
        color: fg,
        borderRadius: 1,
        p: 1.5,
        minHeight: 84,
        border: 1,
        borderColor: "divider",
      }}
    >
      <Typography fontWeight={700} fontSize="0.9rem">
        {name}
      </Typography>
      <Typography fontSize="0.8rem">
        <LtrText>{value}</LtrText>
      </Typography>
    </Box>
  );
}

/** Living preview of the design tokens and shared components (development builds only). */
export default function DesignSystemPage() {
  const { palette } = useTheme();
  const [password, setPassword] = useState("Demo");
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Box sx={{ position: "relative", py: { xs: 4, md: 6 } }}>
      <DamascenePattern />
      <Container maxWidth="lg" sx={{ position: "relative" }}>
        <PageHeader
          title="نظام التصميم"
          description="الألوان والخطوط والمكونات المشتركة كما تظهر في الواجهة. بدّل الوضع الداكن من الشريط العلوي."
          breadcrumbs={[{ label: "الرئيسية", to: "/" }, { label: "نظام التصميم" }]}
        />

        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" component="h2" gutterBottom>
                الهوية
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={4} alignItems={{ sm: "center" }}>
                <Logo size={56} subtitle="نجمة دمشقية وثلاث نجمات ذهبية" />
              </Stack>
              <Grid container spacing={1.5} sx={{ mt: 2 }}>
                {[
                  { name: "Syrian Green", value: palette.primary.main, fg: palette.primary.contrastText },
                  { name: "Eagle Gold", value: palette.gold.main, fg: palette.gold.contrastText },
                  { name: "Gold text", value: palette.gold.text, fg: palette.background.paper },
                  { name: "Sage", value: palette.sage.soft, fg: palette.text.primary },
                  { name: "Star Red", value: palette.error.main, fg: palette.error.contrastText },
                  { name: "Background", value: palette.background.default, fg: palette.text.primary },
                  { name: "Text", value: palette.text.primary, fg: palette.background.paper },
                ].map((swatch) => (
                  <Grid key={swatch.name} size={{ xs: 6, sm: 4, md: 12 / 7 }}>
                    <Swatch {...swatch} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h4" component="h2" gutterBottom>
                الخطوط
              </Typography>
              <Typography variant="h2">خدماتك أقرب إليك</Typography>
              <Typography variant="h5" sx={{ color: "gold.text", mb: 1 }}>
                عنوان ثانوي بالذهبي الداكن
              </Typography>
              <Typography sx={{ maxWidth: 720 }}>
                نص القراءة بخط IBM Plex Sans Arabic والعناوين بخط Alexandria. الأرقام بخانات لاتينية: الهاتف{" "}
                <LtrText>0912345678</LtrText> والرقم الوطني <LtrText>01234567891</LtrText>، والتاريخ{" "}
                {formatDate(new Date().toISOString())}.
              </Typography>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h4" component="h2" gutterBottom>
                    الأزرار والشارات
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                    <Button variant="contained">إنشاء حساب</Button>
                    <Button variant="outlined">تسجيل الدخول</Button>
                    <Button variant="outlined" color="error">
                      تعطيل
                    </Button>
                    <Button onClick={() => setDialogOpen(true)}>نافذة تأكيد</Button>
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                    <StatusChip kind="department" status="ACTIVE" />
                    <StatusChip kind="department" status="SUSPENDED" />
                    <StatusChip kind="department" status="ARCHIVED" />
                    <StatusChip kind="account" status="DISABLED" />
                    <StatusChip kind="custom" tone="warning" label="بلا مدير" />
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Button size="small" variant="outlined" onClick={() => toast.success("حُفظت التغييرات.")}>
                      إشعار نجاح
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => toast.error("تعذّر الحفظ.")}
                    >
                      إشعار خطأ
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h4" component="h2" gutterBottom>
                    الحقول
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="البريد الإلكتروني"
                      defaultValue="citizen1@demo.csc"
                      slotProps={{ htmlInput: { dir: "ltr" } }}
                    />
                    <TextField
                      label="رقم الهاتف"
                      error
                      helperText="أدخل رقم جوال سوري بالشكل 09XXXXXXXX."
                      defaultValue="0812"
                    />
                    <Box>
                      <TextField
                        label="كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <PasswordStrength value={password} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Alert severity="info">تنبيه معلومات: الطلبات تتوفر في السبرنت القادم.</Alert>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Alert severity="warning">القسم بلا مدير. أضف مديراً.</Alert>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Alert severity="error">الحساب معطّل. تواصل مع إدارة المركز.</Alert>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <EmptyState title="لا توجد نتائج" description="غيّر معايير البحث أو الفلترة." />
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <ErrorState code="network_error" onRetry={() => toast.info("إعادة المحاولة…")} />
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Container>

      <ConfirmDialog
        open={dialogOpen}
        title="إيقاف القسم"
        tone="danger"
        confirmLabel="إيقاف"
        onConfirm={() => setDialogOpen(false)}
        onClose={() => setDialogOpen(false)}
      >
        <Typography>ستتوقف خدمات القسم عن استقبال الطلبات، وتستمر معالجة الطلبات الحالية.</Typography>
      </ConfirmDialog>
    </Box>
  );
}
