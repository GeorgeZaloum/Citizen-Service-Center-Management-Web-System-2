import { db } from "../db";
import { FieldErrors, errors, ok, requireRole, str, type MockRequest, type MockResponse } from "../core";
import type { Route } from "../router";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const TIME_MESSAGE = "Time has wrong format. Use one of these formats instead: hh:mm[:ss[.uuuuuu]].";

function withSeconds(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

function get(): MockResponse {
  return ok({ center_settings: db.state.centerSettings }, "Center settings");
}

/** UC-19 */
function update({ body }: MockRequest): MockResponse {
  requireRole("SYSTEM_ADMIN");
  new FieldErrors()
    .required(body, "name", "address", "contact_phones", "work_start", "work_end")
    .maxLength(body, "name", 150)
    .maxLength(body, "address", 255)
    .maxLength(body, "contact_phones", 100)
    .pattern(body, "work_start", TIME_PATTERN, TIME_MESSAGE)
    .pattern(body, "work_end", TIME_PATTERN, TIME_MESSAGE)
    .throwIfAny();
  const workStart = withSeconds(str(body, "work_start"));
  const workEnd = withSeconds(str(body, "work_end"));
  if (workEnd <= workStart) {
    errors.validation(
      { work_end: ["The working hours must end after they start."] },
      "The working hours must end after they start.",
      "invalid_working_hours",
    );
  }
  db.state.centerSettings = {
    name: str(body, "name"),
    address: str(body, "address"),
    contact_phones: str(body, "contact_phones"),
    work_start: workStart,
    work_end: workEnd,
  };
  return ok({ center_settings: db.state.centerSettings }, "Center settings updated");
}

export const centerSettingsRoutes: Route[] = [
  ["GET", /^\/center-settings\/$/, get],
  ["PUT", /^\/center-settings\/$/, update],
];
