import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_HOST = "c.sushiscan.net";

interface CfSession {
  cookie: string;
  userAgent: string;
}

function loadCfSession(): CfSession | null {
  try {
    const filePath = path.join(process.cwd(), "data", "cf_session.json");
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as CfSession;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");

  if (!urlParam) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return new NextResponse("Unauthorized host", { status: 403 });
  }

  const session = loadCfSession();

  try {
    const response = await fetch(urlParam, {
      headers: {
        Referer: "https://sushiscan.net/",
        "User-Agent": session?.userAgent ??
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        ...(session ? { Cookie: session.cookie } : {}),
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
      },
    });

    if (!response.ok) {
      return new NextResponse(`CDN error: ${response.status}`, {
        status: response.status,
      });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return new NextResponse(`Fetch failed: ${err}`, { status: 502 });
  }
}
