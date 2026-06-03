import { NextResponse, type NextRequest } from "next/server";
import { getPinata, pinataConfigured } from "~~/utils/pinata/config";

export async function POST(request: NextRequest) {
  if (!pinataConfigured()) {
    return NextResponse.json({ error: "Pinata not configured. Set PINATA_JWT and NEXT_PUBLIC_GATEWAY_URL." }, { status: 503 });
  }
  try {
    const body = await request.json();
    const pinata = getPinata();
    const { cid } = await pinata.upload.public.json(body);
    const gatewayUrl = await pinata.gateways.public.convert(cid);
    return NextResponse.json({
      cid,
      ipfsUrl: `ipfs://${cid}`,
      gatewayUrl,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "JSON upload failed" }, { status: 500 });
  }
}
