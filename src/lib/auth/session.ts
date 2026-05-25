import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';

export type SessionData = {
  userId?: string;
  email?: string;
  name?: string;
};

const options: SessionOptions = {
  password: process.env.SESSION_PASSWORD || 'dev-password-please-set-32-chars-min',
  cookieName: 'gas_mobile_session',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, options);
}
