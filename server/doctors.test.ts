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

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("doctors router", () => {
  it("should allow admin to list doctors", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.doctors.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should validate doctor creation input", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Test with missing required fields
    await expect(
      caller.doctors.create({
        doctorId: "",
        name: "",
        email: "invalid-email",
      } as any)
    ).rejects.toThrow();
  });
});
