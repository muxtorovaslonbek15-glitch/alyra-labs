import { requireFirebaseUser } from "@/lib/server/requireAuth";

export const maxDuration = 15;

const CLOSED = {
  ok: false,
  error: "Star shop is closed.",
  stars: 0,
  unlockedShopItemIds: [] as string[],
};

/** Spend-stars shop is retired from the product. */
export async function POST(req: Request) {
  const auth = await requireFirebaseUser(req);
  if ("response" in auth) return auth.response;
  return Response.json(CLOSED, { status: 410 });
}

export async function GET(req: Request) {
  const auth = await requireFirebaseUser(req);
  if ("response" in auth) return auth.response;
  return Response.json(CLOSED, { status: 410 });
}
