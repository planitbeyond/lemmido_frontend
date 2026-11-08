import { SignJWT } from "jose";
import { headers } from "next/headers";
import { auth } from "../../../lib/auth";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "not signed in" }, { status: 401 });

    const token = await new SignJWT({})
     .setProtectedHeader({ alg: "HS256" })
     .setSubject(session.user.id)
     .setIssuedAt()
     .setExpirationTime("5m")
     .sign(secret);
    
     return Response.json({ token });
}
