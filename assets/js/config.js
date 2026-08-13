/* XBTI 运行配置 —— 部署时按需修改，无需改业务代码。
 * 纯静态、无后端时：SUBMIT_ENDPOINT 留空，答案存浏览器 localStorage（演示/自测）。
 * 接入无服务器后端（同域名）：填入 "/api/submit"，并在 functions/ 下部署对应函数。
 */
window.XBTI_CONFIG = {
  SUBMIT_ENDPOINT: "/api/submit", // 同域相对路径，任何域名通用（Cloudflare Pages Functions）
  ENABLE_SUBMIT: true,          // false 可彻底关闭上报
  THEME: "paper",               // "paper" 诊断书米白 / "cyber" 赛博暗夜
  ADMIN_PATH: "/admin.html"     // 管理页路径（需管理员令牌，前端不含令牌明文）
};
