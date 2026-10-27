import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRounded from "@mui/icons-material/RadioButtonUncheckedRounded";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { visuallyHidden } from "@mui/utils";
import { useTranslation } from "react-i18next";

import { PASSWORD_RULES, passwordRuleResults } from "@/lib/validators";

/** Live checklist of the backend's password rules, with a strength bar. */
export function PasswordStrength({ value, id }: { value: string; id?: string }) {
  const { t } = useTranslation();
  const results = passwordRuleResults(value);
  const passed = Object.values(results).filter(Boolean).length;
  const percent = (passed / PASSWORD_RULES.length) * 100;
  const level = passed <= 1 ? "weak" : passed < PASSWORD_RULES.length ? "medium" : "strong";
  const color = level === "strong" ? "primary" : level === "medium" ? "warning" : "error";

  return (
    <Box id={id} sx={{ mt: 1 }} aria-live="polite">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={value ? percent : 0}
          color={color}
          sx={{ flex: 1, height: 6, borderRadius: 3 }}
          aria-label={t("password.strengthLabel")}
        />
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 48 }}>
          {value ? t(`password.level.${level}`) : ""}
        </Typography>
      </Box>
      <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "grid", gap: 0.5 }}>
        {PASSWORD_RULES.map(({ rule }) => (
          <Box
            component="li"
            key={rule}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              fontSize: "0.8125rem",
              color: results[rule] ? "primary.main" : "text.secondary",
            }}
          >
            {results[rule] ? (
              <CheckCircleRounded sx={{ fontSize: 16 }} aria-hidden="true" />
            ) : (
              <RadioButtonUncheckedRounded sx={{ fontSize: 16 }} aria-hidden="true" />
            )}
            <span>{t(`password.rules.${rule}`)}</span>
            <Box component="span" sx={visuallyHidden}>
              {results[rule] ? t("password.met") : t("password.notMet")}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
