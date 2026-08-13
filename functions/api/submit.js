/* Cloudflare Pages Function —— 接收答题上报，写入 D1（同域名 /api/submit）
 * 前端只 POST，不读取；管理员令牌不在此出现，由 admin.js 校验。
 */
function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
  const created = Date.now();
  try {
    await env.XBTI_DB.prepare(
      "INSERT INTO records (id, created_at, answers, scores, result_type, result_name, match_rate, info, meta) VALUES (?,?,?,?,?,?,?,?,?)"
    ).bind(
      id, created,
      JSON.stringify(data.answers || []),
      JSON.stringify(data.scores || {}),
      data.result_type || "",
      data.result_name || "",
      data.match_rate || 0,
      JSON.stringify(data.info || {}),
      JSON.stringify(data.meta || {})
    ).run();
    return json({ ok: true, id });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

// 浏览器 CORS 预检（若前端与函数跨域才需要；同域部署可省略）
export async function onRequestOptions() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST" } });
}
