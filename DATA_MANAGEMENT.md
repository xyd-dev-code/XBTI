# XBTI 数据管理策略（无后端 / 单域名）

约束回顾：用户仅有一个域名、无自有服务器，项目以纯静态前端方式部署。需在不暴露后台接口给用户、仅管理员可查的前提下，收集并管理全部答题记录与答案。

结论先行：**用「静态站点 + 同域无服务器函数 + 托管数据库」是满足单域名、无自有服务器、且后台仅管理员可见的最优解**。下方给出存储、更新、维护机制，以及 4 套可落地的后端方案。

---

## 一、数据存储方案（4 选 1，均不破坏单域名）

### 方案 A（推荐）：Cloudflare Pages Functions + D1 —— 完全同域、零第三方
- 静态文件托管在 Cloudflare Pages；`functions/api/submit.js` 与 `functions/api/admin.js` 以**同一域名**的 `/api/*` 路径提供写/读能力；数据存 Cloudflare D1（SQLite）。
- 优点：域名唯一、无额外账号、读写都在自己手里、免费额度足够中小流量。
- 数据表见 `schema.sql`：`records(id, created_at, answers, scores, result_type, result_name, match_rate, meta)`。
- 安全：管理员令牌 `XBTI_ADMIN_TOKEN` 存于环境变量（secret），服务端校验；`admin.html` 运行时输入，前端源码不含明文。

### 方案 B：Netlify Functions + 外部库
- 静态托管在 Netlify；用 `netlify/functions/submit.js` 写入外部数据库（Supabase / Upstash / Google Sheets via Apps Script）。
- 注意：Netlify Functions 文件系统临时，不能本地落库，必须接外部存储。读接口同样用 Functions + 令牌校验。
- 适合：已用 Netlify 的用户。

### 方案 C（零成本、最简）：Google 表格 + Apps Script（无服务器「伪后端」）
- 建一个 Google 表格 →  Apps Script 部署为 Web App（`doPost` 把 JSON 追加到表格）。前端 `SUBMIT_ENDPOINT` 填该 Web App URL。
- 后台 = 这个 Google 表格本身，只有你（表格所有者）能看，站点前端完全不含后台入口。
- 优点：免费、无需任何服务器、后台天然私有。缺点：写接口 URL 在前端 JS 中（任何人可向其 POST 垃圾），需在脚本里做轻量校验（如校验字段结构、限流）；数据量上限约百万行。
- 适用：轻量、不想碰 Functions 的场景。

### 方案 D：Supabase（Postgres + REST）
- 建表后，前端用 anon key 仅授予 `INSERT`（RLS 策略禁止 `SELECT` 他人数据）。管理员用 service_role key 在 Supabase 后台或自建受保护 admin 页查看。
- 注意：service_role key 绝不能进前端；若做 admin 页，令牌/ key 必须走服务端函数代理。
- 适用：需要强查询、未来要扩功能的场景。

> 本项目默认交付**方案 A** 的完整代码（functions/ + schema.sql + wrangler.toml），并预留 `config.SUBMIT_ENDPOINT` 让你切换为 B/C/D。

---

## 二、内容更新与维护机制

1. **内容即数据，集中可改**：题库、27 人格、维度定义、文案全部在 `assets/js/data.js`（单一 `window.XBTI_DATA` 对象）。改文案 = 改这一个文件，无需动逻辑。
2. **更新流程**：编辑 `data.js` → 提交 → 重新部署（或推 Git 触发 CI）→ 全站生效。前端会从打包后的 JS 读取，无需数据库迁移。
3. **梗时效维护**：建议每季度复盘，替换过气热梗（如某词不再流行）。可在 `data.js` 顶部加 `version` 字段，便于追踪。
4. **可选「免重新构建」更新**：若希望只换内容不碰代码，可把 `data.js` 改为 `content.json` 由 `app.js` 运行时 `fetch` 同域文件加载（静态托管下 `fetch` 同源可用）。取舍：牺牲「双击 file:// 直接打开」的便利性，换取运营改内容无需技术介入。当前默认用内联 JS 以保证离线可跑。
5. **题库/人格扩展**：新增题目只需在 `questions` 加对象（带 `dim` 与 `weights`），新增人格在 `types` 加对象（带六维 `dim` 中心值）。计分与匹配为通用算法，自动适配。

---

## 三、后台数据与隐私模型（核心安全约束）

- **用户侧不可见**：普通用户在 `index.html` 只能「答题 → 看报告 → 复制/保存图片」。报告页不渲染、不链接任何后台入口、不暴露 `/api/admin` 路径。
- **写接口最小化**：`/api/submit` 只接受答题 JSON，不做鉴权（任何人可写），但写入内容受结构约束；敏感操作（读全部）必须令牌。
- **读接口强保护**：`/api/admin` 仅当 `token === XBTI_ADMIN_TOKEN` 才返回数据，否则统一 403；令牌来自服务端环境变量，不在前端源码、不在 JS 注释、不在 Git 仓库明文。
- **管理员入口**：`admin.html` 独立页面，令牌运行时输入、不持久化、不写日志。可进一步用 Cloudflare Access / 基础认证给 `/admin.html` 加一层域名级保护。
- **数据归属**：答题含用户自评，属轻量非敏感数据；仍建议在页脚明示「本测试为娱乐用途，所答内容仅用于聚合统计」。

---

## 四、运维与监控

- **备份**：D1 可 `wrangler d1 export` 定期备份为 SQL；Google 表格天然有版本历史；Supabase 有自动备份。
- **导出**：`admin.html` 提供「导出 CSV」（含编号、时间、人格、匹配度、六维、答题答案），便于离线分析。
- **容量**：D1 免费层 5GB；Sheets 约百万行；对个人项目绰绰有余。
- **故障降级**：若后端不可用，`submit.js` 自动降级为 localStorage，用户测试体验不受影响，仅管理员暂时收不到新数据。

---

## 五、单域名独立运行检查清单

- [ ] 站点根（`index.html`）部署到你的唯一域名
- [ ] `config.SUBMIT_ENDPOINT` 指向同域写接口（如 `/api/submit`）
- [ ] 后端函数 + 数据库已建好并可写
- [ ] `XBTI_ADMIN_TOKEN` 已设为服务端密钥（非明文入仓）
- [ ] `admin.html` 可访问且仅管理员凭令牌查看
- [ ] 前端任意页面均不出现 `/api/admin` 或令牌字样
- [ ] 报告页分享功能（复制判词 / 复制文案 / 保存雷达图）自测通过
