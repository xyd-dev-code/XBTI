# XBTI 搞怪人格测试 · 纯前端静态站点

一个**零自有服务器、单域名独立运行**的搞怪人格测试站：30 道抽象题 → 27 种奇葩人格 → 一份可截图分享的「精神状态诊断书」。数据通过**同域名无服务器函数**收集，管理员在独立后台查看全部答题记录。

## 项目结构

```
site/
├── index.html              # 主站：开始 / 答题 / 报告（三视图单页）
├── admin.html              # 管理后台：输入令牌拉取全部记录、按人格筛选、导出 CSV
├── assets/
│   ├── css/style.css       # 双主题(paper/cyber) + 响应式样式
│   └── js/
│       ├── data.js         # ★ 全部内容：题库 / 27 人格 / 维度 / 文案
│       ├── config.js       # 运行配置：上报端点、主题、管理页路径
│       ├── submit.js       # 上报适配层（有端点上报，无端点降级 localStorage）
│       └── app.js          # 答题流程 / 计分 / 人格匹配 / 雷达图 / 分享
├── functions/              # Cloudflare Pages Functions（同域名无服务器后端）
│   └── api/
│       ├── submit.js       # POST /api/submit  写入答题
│       └── admin.js        # GET  /api/admin?token=...  管理员读记录
├── schema.sql             # D1 数据表结构
├── wrangler.toml          # Cloudflare 部署配置（D1 绑定）
└── DATA_MANAGEMENT.md     # 数据管理策略（存储 / 更新 / 维护 / 备选后端）
```

## 本地直接运行（无需后端）

直接双击 `index.html` 即可打开：题库、计分、报告、雷达图、复制判词、保存雷达图全部可用。
未配置上报端点时，答案自动存入浏览器 `localStorage`（仅本地演示，不上传）。

> 若浏览器对 `file://` 限制较严，可用任意静态服务器：
> `python -m http.server 8080` 然后访问 `http://localhost:8080`

## 部署到单一域名（带数据收集）

推荐 **Cloudflare Pages**（静态 + 同域 Functions + D1，全程一个域名）：

1. 建库：`wrangler d1 create xbti`，把返回的 `database_id` 填进 `wrangler.toml`。
2. 建表：`wrangler d1 execute xbti --remote --file=./schema.sql`
3. 设令牌：`wrangler pages secret put XBTI_ADMIN_TOKEN`（这就是你后台登录的密码）
4. 改配置：把 `assets/js/config.js` 的 `SUBMIT_ENDPOINT` 设为 `"/api/submit"`
5. 部署：把 `site/` 目录推到 Git 并关联 Cloudflare Pages（构建命令留空，输出目录 `site`）。

部署后：
- 用户访问你的域名 → 答题 → 报告（前端看不到任何后台入口/接口）
- 你访问 `你的域名/admin.html` → 输入 `XBTI_ADMIN_TOKEN` → 查看/筛选/导出全部答题

## 其他托管平台

- **Netlify**：静态托管；数据可用 Netlify Forms（把提交改为隐藏表单）或 Netlify Functions + 外部库（Supabase/Sheets）。详见 DATA_MANAGEMENT.md。
- **GitHub Pages / Vercel / 任意静态空间**：静态部分直接托管；数据层接第三方无服务器服务（见 DATA_MANAGEMENT.md 方案 C/D），站点仍只用单一域名。

## 内容更新

所有文案集中在 `assets/js/data.js`：改题、改人格、改维度，保存后重新部署即生效。详见 DATA_MANAGEMENT.md「内容更新与维护机制」。
