import { getAddress, type Signer } from "ethers";

export type OptionRule<T = unknown> = {
  required?: boolean;
  validator?: (value: unknown) => boolean | T;
  expected?: string;
};

export type Schema<T extends Record<string, unknown>> = { [K in keyof T]-?: OptionRule<T[K]> };

export function parseOptions<T extends Record<string, unknown>>(
  options: unknown,
  schema: Schema<T>,
  caller = "function",
): T {
  if (!options || typeof options !== "object") {
    throw new Error(`${caller}: options must be an object`);
  }

  const out: Record<string, unknown> = { ...(options as Record<string, unknown>) };
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const [key, rule] of Object.entries(schema)) {
    const present = Object.prototype.hasOwnProperty.call(out, key);
    if (rule.required && !present) {
      missing.push(key);
      continue;
    }
    if (present && rule.validator) {
      const res = rule.validator(out[key]);
      if (typeof res === "boolean") {
        if (!res) invalid.push(rule.expected ? `${key} (expected ${rule.expected})` : key);
      } else if (res !== undefined) {
        out[key] = res as unknown;
      }
    }
  }

  if (missing.length) throw new Error(`${caller}: missing required field(s): ${missing.join(", ")}`);
  if (invalid.length) throw new Error(`${caller}: invalid field(s): ${invalid.join(", ")}`);
  return out as T;
}

export const validators = {
  nonEmptyString: (v: unknown) => typeof v === "string" && v.length > 0,
  string: (v: unknown) => typeof v === "string",
  tokenId: (v: unknown) => typeof v === "string" || typeof v === "bigint",
  number: (v: unknown) => typeof v === "number" || typeof v === "bigint",
  address: (v: unknown) => {
    if (typeof v !== "string") return false;
    try {
      getAddress(v);
      return true;
    } catch {
      return false;
    }
  },
  signerWithProvider: (v: unknown) =>
    !!v && typeof v === "object" && typeof (v as Signer).getAddress === "function",
  arrayOf:
    (inner: (v: unknown) => boolean) =>
    (v: unknown) =>
      Array.isArray(v) && v.every(inner),
};
