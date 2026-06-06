export type SDKErrorCode =
  | "SIMULATE/CREATE_IDENTITY"
  | "SIMULATE/ADD_CLAIM"
  | "SIMULATE/REGISTER_IDENTITY"
  | "SIMULATE/NFT_APPROVAL"
  | "SIMULATE/DEPOSIT_AND_MINT"
  | "SIMULATE/TRANSFER_TOKENS"
  | "SIMULATE/APPROVE_ERC20"
  | "SIMULATE/DEPOSIT_YIELD"
  | "SIMULATE/CLAIM_YIELD"
  | "SIMULATE/CLAIM_YIELD_TO"
  | "SIMULATE/INIT_CONTRACT"
  | "SIMULATE/SIGN_CONTRACT"
  | "SIMULATE/REGISTER_MACHINE"
  | "UNSUPPORTED/CHAIN";

export interface SDKErrorShape {
  name: "SDKError";
  code: SDKErrorCode;
  message: string;
  cause?: { reason?: string; code?: string | number };
}

export class SDKError extends Error implements SDKErrorShape {
  public readonly name = "SDKError" as const;
  public readonly code: SDKErrorCode;
  public readonly cause?: SDKErrorShape["cause"];

  constructor(code: SDKErrorCode, message: string, opts?: { cause?: unknown }) {
    super(message);
    this.code = code;
    if (opts?.cause && typeof opts.cause === "object") {
      const c = opts.cause as { reason?: string; shortMessage?: string; code?: string | number };
      this.cause = {
        reason: c.reason ?? c.shortMessage,
        code: c.code,
      };
    }
  }
}

export function isSDKError(e: unknown): e is SDKError {
  return !!e && typeof e === "object" && (e as SDKError).name === "SDKError";
}
