import { createClient } from "@/lib/supabase/server";

const BUCKET = "listing-photos";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  if (path.length === 0) return new Response("Not found", { status: 404 });

  const storagePath = path.map((segment) => decodeURIComponent(segment)).join("/");
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (error || !data) return new Response("Not found", { status: 404 });

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control":
        "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
