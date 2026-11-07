import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET() {
    const userId = "dev-user-1";
    const token = await new SignJWT({})
     .setProtectedHeader({ alg: "HS256" })
     .setSubject(userId)
     .setIssuedAt()
     .setExpirationTime("5m")
     .sign(secret);
    
     return Response.json({ token });
}