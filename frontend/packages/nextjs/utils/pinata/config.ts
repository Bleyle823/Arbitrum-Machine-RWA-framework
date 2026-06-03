import "server-only";

import { PinataSDK } from "pinata";

export function getPinata() {
  const pinataJwt = process.env.PINATA_JWT;
  const pinataGateway = process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (!pinataJwt || !pinataGateway) {
    throw new Error("PINATA_JWT and NEXT_PUBLIC_GATEWAY_URL must be set for Pinata uploads");
  }
  return new PinataSDK({
    pinataJwt,
    pinataGateway,
  });
}

export function pinataConfigured(): boolean {
  return Boolean(process.env.PINATA_JWT && process.env.NEXT_PUBLIC_GATEWAY_URL);
}
