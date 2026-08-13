/* XBTI 数据上报适配层
 * 设计原则：前端只负责"发送"，绝不在前端暴露管理员令牌或读接口。
 * - 有端点：POST JSON 到 SUBMIT_ENDPOINT（建议为同域无服务器函数）。
 * - 无端点：降级为 localStorage，保证本地直接打开也能跑通完整流程。
 */
window.XBTI_SUBMIT = {
  async send(payload) {
    const cfg = window.XBTI_CONFIG || {};
    if (!cfg.ENABLE_SUBMIT || !cfg.SUBMIT_ENDPOINT) {
      try {
        const key = "xbti_local_records";
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        arr.push(payload);
        localStorage.setItem(key, JSON.stringify(arr));
      } catch (e) { /* 隐私模式可能失败，忽略 */ }
      console.log("[XBTI] 本地模式：答案已存 localStorage（未上报）。配置 SUBMIT_ENDPOINT 后可上报。", payload);
      return { ok: true, mode: "local" };
    }
    try {
      const res = await fetch(cfg.SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return { ok: res.ok, mode: "remote", status: res.status };
    } catch (e) {
      console.warn("[XBTI] 上报失败，已降级本地存储。", e);
      try {
        const key = "xbti_local_records";
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        arr.push(payload);
        localStorage.setItem(key, JSON.stringify(arr));
      } catch (_) {}
      return { ok: false, mode: "remote-fallback-local", error: String(e) };
    }
  }
};
