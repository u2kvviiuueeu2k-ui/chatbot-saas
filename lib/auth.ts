import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
);

export async function signToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function isAuthenticated(req?: NextRequest): Promise<boolean> {
  try {
    let token: string | undefined;

    if (req) {
      token = req.cookies.get('admin_token')?.value;
    } else {
      const cookieStore = cookies();
      token = cookieStore.get('admin_token')?.value;
    }

    if (!token) return false;
    return verifyToken(token);
  } catch {
    return false;
  }
}
