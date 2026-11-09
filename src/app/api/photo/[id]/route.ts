import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = db().prepare("SELECT photo, photo_mime FROM users WHERE id=?").get(Number(id)) as
    | { photo: Buffer | null; photo_mime: string | null }
    | undefined;
  if (!r?.photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(r.photo), {
    headers: { "Content-Type": r.photo_mime || "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
