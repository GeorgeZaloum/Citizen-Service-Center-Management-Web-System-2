import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CenterSettingsRequest } from "@/api/contracts";

import { getCenterSettings, updateCenterSettings } from "./api";

const KEY = ["center-settings"] as const;

/** Public data: the landing page and "Forgot password" (UC-02 3a). */
export function useCenterSettings() {
  return useQuery({ queryKey: KEY, queryFn: getCenterSettings, staleTime: 5 * 60_000 });
}

/** UC-19 */
export function useUpdateCenterSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CenterSettingsRequest) => updateCenterSettings(input),
    onSuccess: (settings) => client.setQueryData(KEY, settings),
  });
}
