/**
 * Clés Redis du circuit financier.
 *
 * Toutes commencent par le même « hash tag » `{ch:ai:<env>}` : Redis les range
 * dans le même emplacement, condition pour qu'un script unique les manipule
 * toutes de façon atomique. Chaque script reçoit la liste exacte de ses clés.
 *
 * Les périodes sont calculées en UTC par l'application et transmises aux
 * scripts : un script Redis doit rester déterministe et ne lit pas l'horloge.
 */

export type FinanceEnvironment = "prod" | "preprod" | "dev" | "test";

/** Environnement déduit de `VERCEL_ENV` (production / preview / development). */
export function financeEnvironment(vercelEnv = process.env.VERCEL_ENV): FinanceEnvironment {
  if (vercelEnv === "production") return "prod";
  if (vercelEnv === "preview") return "preprod";
  return "dev";
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

/** Jour UTC, ex. 20260917. */
export function dayPeriod(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** Heure UTC, ex. 2026091714. */
export function hourPeriod(nowMs: number): string {
  return `${dayPeriod(nowMs)}${pad(new Date(nowMs).getUTCHours())}`;
}

/** Fenêtre fixe d'une minute (numéro de minute depuis l'époque Unix). */
export function minutePeriod(nowMs: number): string {
  return String(Math.floor(nowMs / 60_000));
}

/** Fenêtre fixe de `seconds` secondes (numéro de fenêtre depuis l'époque Unix). */
export function windowPeriod(nowMs: number, seconds: number): string {
  return String(Math.floor(nowMs / (seconds * 1000)));
}

export interface FinanceKeys {
  kill: string;
  pause: string;
  throttle429(windowSeconds: number, nowMs: number): string;
  request(requestId: string): string;
  call(callId: string): string;
  rateMinute(visitor: string, nowMs: number): string;
  rateHour(visitor: string, nowMs: number): string;
  concurrencyVisitor(visitor: string): string;
  concurrencyGlobal: string;
  spendDay(nowMs: number): string;
  spendHour(nowMs: number): string;
  spendVisitorDay(visitor: string, nowMs: number): string;
  alert60(nowMs: number): string;
  alert80(nowMs: number): string;
}

export function financeKeys(env: FinanceEnvironment): FinanceKeys {
  const p = `{ch:ai:${env}}:`;
  return {
    kill: `${p}kill`,
    pause: `${p}pause`,
    throttle429: (windowSeconds, nowMs) => `${p}t429:${windowSeconds}:${windowPeriod(nowMs, windowSeconds)}`,
    request: (requestId) => `${p}rq:${requestId}`,
    call: (callId) => `${p}st:${callId}`,
    rateMinute: (visitor, nowMs) => `${p}rl:m:${visitor}:${minutePeriod(nowMs)}`,
    rateHour: (visitor, nowMs) => `${p}rl:h:${visitor}:${hourPeriod(nowMs)}`,
    concurrencyVisitor: (visitor) => `${p}cc:v:${visitor}`,
    concurrencyGlobal: `${p}cc:g`,
    spendDay: (nowMs) => `${p}sp:d:${dayPeriod(nowMs)}`,
    spendHour: (nowMs) => `${p}sp:h:${hourPeriod(nowMs)}`,
    spendVisitorDay: (visitor, nowMs) => `${p}sp:v:${visitor}:${dayPeriod(nowMs)}`,
    alert60: (nowMs) => `${p}al:60:${dayPeriod(nowMs)}`,
    alert80: (nowMs) => `${p}al:80:${dayPeriod(nowMs)}`,
  };
}

/** Identifiants fournis par le serveur uniquement (jamais par le navigateur). */
export function isSafeIdentifier(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(value);
}
