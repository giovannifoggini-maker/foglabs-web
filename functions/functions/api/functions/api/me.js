export async function onRequestGet({ request }) {
  return new Response(JSON.stringify({
    ok: true,
    message: "FogLabs API online"
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
