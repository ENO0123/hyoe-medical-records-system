import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("patients", () => {
  it("should list patients for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.patients.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should require authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(caller.patients.list()).rejects.toThrow();
  });
});

describe("testResults", () => {
  it("should list test results for a patient", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.testResults.list({ patientId: 1 });

    expect(Array.isArray(result)).toBe(true);
  });
});
