/* Cloudflare Pages Function —— 管理员读取全部记录（同域名 /api/admin?token=...）
 * 安全要点：
 *  1. 令牌比对在服务端进行，令牌由管理员在 admin.html 运行时输入，前端源码不含明文。
 *  2. 令牌来自环境变量 XBTI_ADMIN_TOKEN（用 wrangler secret / CF 面板设置，不入仓库）。
 *  3. 错误统一返回 403，不暴露"是否存在"等细节。
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token !== env.XBTI_ADMIN_TOKEN) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    const { results } = await env.XBTI_DB.prepare(
      "SELECT * FROM records ORDER BY created_at DESC LIMIT 5000"
    ).all();
    return new Response(JSON.stringify(results || []), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
