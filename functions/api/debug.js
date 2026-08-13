/* 临时调试端点：确认 XBTI_ADMIN_TOKEN / XBTI_DB 是否成功进入 Functions 运行时。
 * 仅返回是否存在与长度，不泄露令牌明文。调试完成后请删除本文件并重新部署。 */
export async function onRequest({ env }) {
  const t = env.XBTI_ADMIN_TOKEN;
  const info = {
    hasToken: typeof t === "string" && t.length > 0,
    tokenLen: typeof t === "string" ? t.length : 0,
    tokenFirstChar: typeof t === "string" && t.length ? t[0] : null,
    hasDB: typeof env.XBTI_DB === "object" && env.XBTI_DB !== null,
  };
  return new Response(JSON.stringify(info), { headers: { "Content-Type": "application/json" } });
}
