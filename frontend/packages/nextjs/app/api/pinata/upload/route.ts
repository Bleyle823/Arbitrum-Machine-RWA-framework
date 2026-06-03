import { NextResponse, type NextRequest } from "next/server";
import { getPinata, pinataConfigured } from "~~/utils/pinata/config";

export async function POST(request: NextRequest) {
  if (!pinataConfigured()) {
    return NextResponse.json({ error: "Pinata not configured. Set PINATA_JWT and NEXT_PUBLIC_GATEWAY_URL." }, { status: 503 });
  }
  try {
    const data = await request.formData();
    const file = data.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const pinata = getPinata();
    const { cid } = await pinata.upload.public.file(file);
    const gatewayUrl = await pinata.gateways.public.convert(cid);
    return NextResponse.json({
      cid,
      ipfsUrl: `ipfs://${cid}`,
      gatewayUrl,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
