import { ERROR_CODES } from "@/api/contracts";
import { ApiError } from "@/api/errors";
import i18n from "@/i18n";

import { errorMessage, fieldErrorMessages, translateServerMessage } from "./error-messages";

const arabic = /[؀-ۿ]/;

describe("error code messages", () => {
  it.each(ERROR_CODES)("has an Arabic message for %s", (code) => {
    const bundle = i18n.getResourceBundle("ar", "errors") as { code: Record<string, string> };
    expect(bundle.code[code]).toMatch(arabic);
    expect(errorMessage(new ApiError(400, "x", code))).toBe(bundle.code[code]);
  });

  it("uses one generic message for wrong credentials (UC-02 4a)", () => {
    expect(errorMessage(new ApiError(401, "authentication_error", "invalid_credentials"))).toBe(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    );
  });

  it("says 'not found' for an account outside the manager's scope, without the reason", () => {
    expect(errorMessage(new ApiError(404, "not_found", "not_found", { detail: "User not found." }))).toBe(
      "العنصر المطلوب غير موجود.",
    );
  });

  it("falls back to a generic message for an unknown code", () => {
    expect(errorMessage(new ApiError(418, "x", "teapot"))).toBe("حدث خطأ غير متوقع. أعد المحاولة.");
  });

  it("handles errors that are not ApiError", () => {
    expect(errorMessage(new Error("boom"))).toMatch(arabic);
  });
});

describe("field messages", () => {
  it("translates the backend's English field messages", () => {
    expect(translateServerMessage("The password must contain a digit.")).toBe(
      "يجب أن تحتوي كلمة المرور على رقم.",
    );
    expect(translateServerMessage("Enter a Syrian mobile number in the form 09XXXXXXXX.")).toContain(
      "09XXXXXXXX",
    );
    expect(translateServerMessage("Ensure this field has no more than 150 characters.")).toBe(
      "يجب ألا يزيد عدد الأحرف عن 150.",
    );
    expect(translateServerMessage("The image must not exceed 5 MB.")).toBe(
      "يجب ألا يزيد حجم الصورة عن 5 ميغابايت.",
    );
  });

  it("never shows an untranslated English message", () => {
    expect(translateServerMessage("Something new from the server.")).toBe("القيمة غير صحيحة.");
  });

  it("joins several messages of one field and ignores non-field details", () => {
    const error = new ApiError(400, "validation_error", "weak_password", {
      detail: "The password is not strong enough.",
      password: ["The password must contain an uppercase letter.", "The password must contain a digit."],
      existing_manager_id: 7,
    });
    expect(fieldErrorMessages(error)).toEqual({
      password: "يجب أن تحتوي كلمة المرور على حرف لاتيني كبير. يجب أن تحتوي كلمة المرور على رقم.",
    });
  });
});
