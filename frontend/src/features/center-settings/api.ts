import type { CenterSettings, CenterSettingsRequest } from "@/api/contracts";
import { ENDPOINTS } from "@/api/endpoints";
import { api } from "@/api/http-client";

/** Public: the landing page and UC-02 3a ("Forgot password") show it. */
export async function getCenterSettings(): Promise<CenterSettings> {
  const envelope = await api.get<{ center_settings: CenterSettings }>(ENDPOINTS.centerSettings, undefined, {
    skipSessionExpiry: true,
  });
  return envelope.data.center_settings;
}

/** UC-19 */
export async function updateCenterSettings(input: CenterSettingsRequest): Promise<CenterSettings> {
  const envelope = await api.put<{ center_settings: CenterSettings }>(ENDPOINTS.centerSettings, input);
  return envelope.data.center_settings;
}
