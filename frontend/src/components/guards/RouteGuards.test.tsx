import { screen } from "@testing-library/react";
import type { RouteObject } from "react-router-dom";

import { makeUser, renderRoutes, signIn, signOut } from "@/test/render";

import { GuestOnly, RequireAuth, RequireRole, RoleHomeRedirect } from "./RouteGuards";

const routes: RouteObject[] = [
  { path: "/login", element: <GuestOnly />, children: [{ index: true, element: <p>login page</p> }] },
  {
    element: <RequireAuth />,
    children: [
      { path: "/app", element: <RoleHomeRedirect /> },
      { path: "/account/profile", element: <p>profile page</p> },
      {
        element: <RequireRole roles={["CITIZEN"]} />,
        children: [{ path: "/citizen", element: <p>citizen home</p> }],
      },
      {
        element: <RequireRole roles={["EMPLOYEE"]} />,
        children: [{ path: "/employee", element: <p>employee home</p> }],
      },
      {
        element: <RequireRole roles={["DEPT_MANAGER"]} />,
        children: [{ path: "/manager", element: <p>manager home</p> }],
      },
      {
        element: <RequireRole roles={["SYSTEM_ADMIN"]} />,
        children: [{ path: "/admin", element: <p>admin home</p> }],
      },
    ],
  },
];

describe("RequireAuth", () => {
  it("sends a visitor to the login page and remembers where they were going", () => {
    signOut();
    const { router } = renderRoutes(routes, "/admin");
    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ from: "/admin" });
  });

  it("shows a loader while the session is being checked", () => {
    signOut("loading");
    renderRoutes(routes, "/account/profile");
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("profile page")).not.toBeInTheDocument();
  });

  it("lets a logged-in user through to shared pages", () => {
    signIn("EMPLOYEE");
    renderRoutes(routes, "/account/profile");
    expect(screen.getByText("profile page")).toBeInTheDocument();
  });
});

describe("RequireRole", () => {
  it.each([
    ["CITIZEN", "/admin", "citizen home"],
    ["EMPLOYEE", "/manager", "employee home"],
    ["DEPT_MANAGER", "/admin", "manager home"],
    ["SYSTEM_ADMIN", "/citizen", "admin home"],
  ] as const)("sends a %s who opens %s to their own home", (role, path, home) => {
    signIn(role);
    renderRoutes(routes, path);
    expect(screen.getByText(home)).toBeInTheDocument();
  });

  it("opens the page for the right role", () => {
    signIn("SYSTEM_ADMIN");
    renderRoutes(routes, "/admin");
    expect(screen.getByText("admin home")).toBeInTheDocument();
  });
});

describe("RoleHomeRedirect and GuestOnly", () => {
  it.each([
    ["CITIZEN", "citizen home"],
    ["EMPLOYEE", "employee home"],
    ["DEPT_MANAGER", "manager home"],
    ["SYSTEM_ADMIN", "admin home"],
  ] as const)("routes a %s from /app to their interface (UC-02 step 4)", (role, home) => {
    signIn(role);
    renderRoutes(routes, "/app");
    expect(screen.getByText(home)).toBeInTheDocument();
  });

  it("keeps a logged-in user away from the login page", () => {
    signIn("DEPT_MANAGER", { department: makeUser("DEPT_MANAGER").department });
    renderRoutes(routes, "/login");
    expect(screen.getByText("manager home")).toBeInTheDocument();
  });

  it("shows the login page to a visitor", () => {
    signOut();
    renderRoutes(routes, "/login");
    expect(screen.getByText("login page")).toBeInTheDocument();
  });
});
