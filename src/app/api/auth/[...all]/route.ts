import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../../lib/auth";

// Serves sign-in, the Cognito callback, sessions and sign-out under /api/auth/*
export const { GET, POST } = toNextJsHandler(auth);
