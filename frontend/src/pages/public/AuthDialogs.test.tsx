import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RouteObject } from "react-router-dom";

import { http } from "@/api/http-client";
import { fetchCsrfToken } from "@/features/auth/api";
import { mockAdapter, setMockLatency } from "@/mocks/adapter";
import { DEMO_PASSWORD, resetMockDb } from "@/mocks/db";
import { renderRoutes, signOut } from "@/test/render";

import LandingPage from "./LandingPage";

const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LandingPage authMode="login" /> },
  { path: "/register", element: <LandingPage authMode="register" /> },
  { path: "/citizen", element: <p>citizen home</p> },
];

beforeEach(async () => {
  document.cookie = "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  resetMockDb();
  setMockLatency(0);
  http.defaults.adapter = mockAdapter;
  signOut();
  await fetchCsrfToken();
});

async function submitLogin(email: string, password: string) {
  const dialog = await screen.findByRole("dialog");
  const user = userEvent.setup();
  const emailField = within(dialog).getByRole("textbox", { name: /البريد الإلكتروني/ });
  await user.clear(emailField);
  await user.type(emailField, email);
  await user.type(within(dialog).getByLabelText(/كلمة المرور/, { selector: "input" }), password);
  await user.click(within(dialog).getByRole("button", { name: "دخول" }));
  return dialog;
}

describe("Login dialog (UC-02)", () => {
  it("opens over the landing page at /login", async () => {
    renderRoutes(routes, "/login");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "تسجيل الدخول" })).toBeInTheDocument();
  });

  it("shows one generic message for a wrong password (4a)", async () => {
    renderRoutes(routes, "/login");
    const dialog = await submitLogin("citizen1@demo.csc", "Wrong-Pass1");
    expect(
      await within(dialog).findByText("البريد الإلكتروني أو كلمة المرور غير صحيحة."),
    ).toBeInTheDocument();
  });

  it("shows the lock with a countdown after 5 failed attempts (4b)", async () => {
    renderRoutes(routes, "/login");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await submitLogin("citizen2@demo.csc", "Wrong-Pass1");
    }
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("الحساب مقفل مؤقتاً")).toBeInTheDocument();
    expect(within(dialog).getByText(/^1[45]:\d\d$/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "دخول" })).toBeDisabled();
  });

  it("explains a deactivated account (4c)", async () => {
    renderRoutes(routes, "/login");
    const dialog = await submitLogin("employee3.municipality@demo.csc", DEMO_PASSWORD);
    expect(await within(dialog).findByText("الحساب معطّل")).toBeInTheDocument();
  });

  it("shows the center's contacts for a forgotten password (3a)", async () => {
    renderRoutes(routes, "/login");
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "نسيت كلمة المرور؟" }));
    expect(await within(dialog).findByText(/011 2222222/)).toBeInTheDocument();
  });

  it("opens the role's interface on success (step 4)", async () => {
    renderRoutes(routes, "/login");
    await submitLogin("citizen1@demo.csc", DEMO_PASSWORD);
    expect(await screen.findByText("citizen home")).toBeInTheDocument();
  });
});

describe("Register dialog (UC-01)", () => {
  it("marks every missing field and both ID card sides (4a, 4c)", async () => {
    renderRoutes(routes, "/register");
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "إنشاء الحساب" }));
    await waitFor(() =>
      expect(within(dialog).getAllByText("هذا الحقل مطلوب.").length).toBeGreaterThanOrEqual(5),
    );
    expect(within(dialog).getAllByText("صورة هذا الوجه مطلوبة.")).toHaveLength(2);
  });

  it("checks the national ID, phone and password rules before sending", async () => {
    renderRoutes(routes, "/register");
    const dialog = await screen.findByRole("dialog");
    const user = userEvent.setup();
    await user.type(within(dialog).getByRole("textbox", { name: /الرقم الوطني/ }), "1234");
    await user.type(within(dialog).getByRole("textbox", { name: /رقم الجوال/ }), "0812345678");
    await user.type(within(dialog).getByLabelText(/^كلمة المرور/, { selector: "input" }), "weak");
    await user.type(within(dialog).getByLabelText(/تأكيد كلمة المرور/, { selector: "input" }), "other");
    await user.click(within(dialog).getByRole("button", { name: "إنشاء الحساب" }));
    expect(await within(dialog).findByText("يتكون الرقم الوطني من 11 رقماً بالضبط.")).toBeInTheDocument();
    expect(within(dialog).getByText("أدخل رقم جوال سوري بالشكل 09XXXXXXXX.")).toBeInTheDocument();
    expect(within(dialog).getByText("كلمة المرور لا تحقق القواعد أدناه.")).toBeInTheDocument();
    expect(within(dialog).getByText("كلمتا المرور غير متطابقتين.")).toBeInTheDocument();
  });

  it("switches to the login dialog", async () => {
    const { router } = renderRoutes(routes, "/register");
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getAllByRole("button", { name: "تسجيل الدخول" })[0]);
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  });
});
