import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface Session {
  access?: string;
  refresh?: string;
  demo?: boolean;
  exp: number;
}
const NAME = "q1_session";
const WEEK_MS = 7 * 24 * 3600 * 1000;
function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || secret.includes("replace-with")) {
    throw new Error("SESSION_SECRET должен быть уникальным и содержать минимум 32 символа");
  }
  return createHash("sha256").update(secret).digest();
}
function encode(session: Session): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64url");
}
function decode(raw: string): Session | null {
  try {
    const buffer=Buffer.from(raw,"base64url");
    const decipher=createDecipheriv("aes-256-gcm",key(),buffer.subarray(0,12));
    decipher.setAuthTag(buffer.subarray(12,28));
    const result=JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)),decipher.final()]).toString());
    return result.exp>Date.now()?result:null;
  } catch {return null;}
}
export async function readSession() {
  const cookie=(await cookies()).get(NAME)?.value;
  return cookie?decode(cookie):null;
}
export async function saveSession(session: Omit<Session,"exp"> & {exp?:number}) {
  (await cookies()).set(NAME,encode({...session,exp:session.exp??Date.now()+WEEK_MS}),{
    httpOnly:true, secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/", maxAge:7*24*3600
  });
}
export async function clearSession(){(await cookies()).delete(NAME);}
