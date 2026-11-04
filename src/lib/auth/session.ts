import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';
import { requireSessionPassword } from './session-password';

export type SessionData = {
  userId?: string;
  email?: string;
  name?: string;
};

const options: Omit<SessionOptions, 'password'> = {
  cookieName: 'gas_mobile_session',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
};

export async function getSession() {
  const password = requireSessionPassword(process.env.SESSION_PASSWORD);
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, { ...options, password });
}
