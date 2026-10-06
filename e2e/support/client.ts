import { randomInt } from "node:crypto";

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3101";

export type JsonBody = Record<string, unknown>;

export interface ApiResponse<T> {
  status: number;
  body: T;
  headers: Headers;
}

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  origin?: string | null;
}

const randomIp = () => `10.${randomInt(0, 256)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;

function parseBody(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class ApiClient {
  readonly cookies = new Map<string, string>();
  readonly ip: string;

  constructor(options: { ip?: string } = {}) {
    this.ip = options.ip ?? randomIp();
  }

  get<T = JsonBody>(path: string, options: Omit<RequestOptions, "body"> = {}) {
    return this.request<T>("GET", path, options);
  }

  post<T = JsonBody>(path: string, body?: unknown, options: Omit<RequestOptions, "body"> = {}) {
    return this.request<T>("POST", path, { ...options, body });
  }

  patch<T = JsonBody>(path: string, body?: unknown, options: Omit<RequestOptions, "body"> = {}) {
    return this.request<T>("PATCH", path, { ...options, body });
  }

  delete<T = JsonBody>(path: string, options: Omit<RequestOptions, "body"> = {}) {
    return this.request<T>("DELETE", path, options);
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { "x-forwarded-for": this.ip, ...options.headers };
    const cookie = this.cookieHeader();
    if (cookie) headers.cookie = cookie;
    if (options.body !== undefined) headers["content-type"] = "application/json";
    const origin = options.origin === undefined ? BASE_URL : options.origin;
    if (method !== "GET" && origin) headers.origin = origin;

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: "manual",
    });
    this.storeCookies(response.headers.getSetCookie());
    return { status: response.status, body: parseBody(await response.text()) as T, headers: response.headers };
  }

  private cookieHeader() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  private storeCookies(setCookies: string[]) {
    for (const raw of setCookies) {
      const [pair, ...attributes] = raw.split(";").map((part) => part.trim());
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const expired = value === "" || attributes.some((attribute) => /^max-age=0$/i.test(attribute));
      if (expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
}
