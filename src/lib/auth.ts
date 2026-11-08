import { betterAuth } from "better-auth";
import { Pool } from "pg";

// The tables come from lemmido_backend/packages/db (drizzle). Their SQL names are
// "users" and snake_case columns, so map better-auth's names onto them here.
const timestamps = { createdAt: "created_at", updatedAt: "updated_at" };

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  // send failed sign-ins back home as /?error=<code> so AuthButton can explain them
  onAPIError: { errorURL: "/" },
  user: {
    modelName: "users",
    fields: { emailVerified: "email_verified", ...timestamps },
    additionalFields: {
      // E.164, filled from Cognito; users can't set it themselves
      phoneNumber: { type: "string", required: false, input: false, fieldName: "phone_number" },
    },
  },
  session: {
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      ...timestamps,
    },
  },
  account: {
    fields: {
      accountId: "account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      ...timestamps,
    },
  },
  verification: {
    fields: { expiresAt: "expires_at", ...timestamps },
  },
  socialProviders: {
    cognito: {
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      domain: process.env.COGNITO_DOMAIN!,
      region: process.env.COGNITO_REGION!,
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      // better-auth already asks for openid, profile and email
      scope: ["phone"],
      // copy Cognito's phone number into the user row
      mapProfileToUser: (profile) => ({ phoneNumber: profile.phone_number }),
    },
  },
});
