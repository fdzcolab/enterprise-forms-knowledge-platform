import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "@/lib/db/prisma";

export const auth = betterAuth({
  appName: "Enterprise Forms & Knowledge",
  baseURL: process.env.APP_URL,
  secret: process.env.AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10 },
  user: {
    additionalFields: {
      employeeNo: { type: "string", required: false, input: false },
      departmentId: { type: "string", required: false, input: false },
      isActive: { type: "boolean", required: false, input: false, defaultValue: true },
    },
  },
  session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 },
  plugins: [username({ minUsernameLength: 3, maxUsernameLength: 30 }), nextCookies()],
});
