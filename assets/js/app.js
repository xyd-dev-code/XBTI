/* XBTI 主逻辑：视图切换 / 答题 / 计分 / 人格匹配 / 报告渲染 / 分享 / 上报 */
(function () {
  "use strict";
  const D = window.XBTI_DATA;
  const CFG = window.XBTI_CONFIG || {};
  const SUBMIT = window.XBTI_SUBMIT;

  const state = { idx: 0, answers: new Array(D.questions.length).fill(null), info: null };
  const infoState = { no: "", stayupLv: 0 };

  /* ---------- 工具 ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  function show(view) {
    ["start", "info", "quiz", "result"].forEach(v => $("#view-" + v).classList.toggle("hidden", v !== view));
    window.scrollTo(0, 0);
  }
  function randId() {
    const n = Math.floor(1e6 + Math.random() * 9e6);
    const d = new Date();
    const ym = "" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0");
    return "XBTI-" + ym + "-" + n;
  }

  /* ---------- 计分与匹配 ---------- */
  function score() {
    const buckets = {};
    D.dimensions.forEach(d => buckets[d.key] = []);
    D.questions.forEach((q, i) => {
      const sel = state.answers[i];
      if (sel) buckets[q.dim].push(q.weights[sel]);
    });
    const scores = {};
    D.dimensions.forEach(d => {
      const a = buckets[d.key];
      scores[d.key] = a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
    });
    return scores;
  }
  function matchType(scores) {
    let best = null, bestDist = Infinity;
    D.types.forEach(t => {
      let s = 0;
      D.dimensions.forEach(d => { const diff = scores[d.key] - t.dim[d.key]; s += diff * diff; });
      const dist = Math.sqrt(s);
      if (dist < bestDist) { bestDist = dist; best = t; }
    });
    const rate = Math.max(62, Math.min(99, Math.round(99 - bestDist / 4)));
    return { type: best, matchRate: rate };
  }

  /* ---------- 雷达图（自带白底，导出 PNG 始终清晰） ---------- */
  function radarSVG(scores) {
    const cx = 160, cy = 158, R = 108, dims = D.dimensions;
    const ang = i => (-90 + i * 60) * Math.PI / 180;
    const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
    let grid = "";
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const p = dims.map((_, i) => pt(i, R * f).map(n => n.toFixed(1)).join(",")).join(" ");
      grid += `<polygon points="${p}" fill="none" stroke="#e3ddd0" stroke-width="1"/>`;
    });
    let axes = "", labels = "";
    dims.forEach((d, i) => {
      const [x, y] = pt(i, R);
      axes += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e3ddd0" stroke-width="1"/>`;
      const [lx, ly] = pt(i, R + 22);
      const anchor = Math.abs(lx - cx) < 6 ? "middle" : (lx > cx ? "start" : "end");
      labels += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="#5b5345" font-family="sans-serif">${d.label}</text>`;
      const val = scores[d.key];
      const [vx, vy] = pt(i, R * (val / 100));
      labels += `<text x="${vx.toFixed(1)}" y="${(vy - 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="#d9480f" font-family="sans-serif">${val}</text>`;
    });
    const poly = dims.map((d, i) => pt(i, R * (scores[d.key] / 100)).map(n => n.toFixed(1)).join(",")).join(" ");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%">
      <rect x="0" y="0" width="320" height="320" rx="14" fill="#fffdf8"/>
      ${grid}${axes}
      <polygon points="${poly}" fill="rgba(217,72,15,0.28)" stroke="#d9480f" stroke-width="2" stroke-linejoin="round"/>
      ${labels}
    </svg>`;
  }

  /* ---------- 考生信息卡（考前填表） ---------- */
  function renderInfo() {
    infoState.no = randId();
    infoState.stayupLv = 0;
    $("#info-no").textContent = infoState.no;
    $("#info-code").value = "";
    $("#info-stayup").value = "0";
    $("#info-stayup-val").textContent = "0h · 修仙 Lv.0";
    $("#info-agree").checked = true;

    const range = $("#info-stayup");
    range.oninput = () => {
      const h = +range.value;
      const lv = h === 0 ? 0 : Math.ceil(h / 8);
      infoState.stayupLv = lv;
      $("#info-stayup-val").textContent = h + "h · 修仙 Lv." + lv;
    };
  }

  /* ---------- 渲染报告 ---------- */
  function renderReport() {
    const scores = score();
    const { type, matchRate } = matchType(scores);
    const id = (state.info && state.info.no) || randId();
    const date = new Date().toLocaleDateString("zh-CN");
    const perscription = buildPrescription(type);
    const raw = state.info || {};
    const info = {
      code: raw.code || "匿名考生",
      no: raw.no || id,
      hp: raw.hp || "—",
      loc: raw.loc || "—",
      sign: raw.sign || "—",
      stayup: (raw.stayup != null ? raw.stayup : 0) + "h",
      agree: raw.agree ? "已签承诺书" : "拒签"
    };

    const ticketHtml = `
      <div class="ticket">
        <div class="ticket-main">
          <div class="ticket-tag">你的专属准考证</div>
          <div class="ticket-code">${info.code}</div>
          <div class="ticket-no">准考证号 ${info.no}</div>
        </div>
        <div class="ticket-fields">
          <div class="ticket-field"><span>报考科目</span><b>精神状态鉴定</b></div>
          <div class="ticket-field"><span>今日血量</span><b>${info.hp}</b></div>
          <div class="ticket-field"><span>当前坐标</span><b>${info.loc}</b></div>
          <div class="ticket-field"><span>赛博星座</span><b>${info.sign}</b></div>
          <div class="ticket-field"><span>连续熬夜</span><b>${info.stayup}</b></div>
          <div class="ticket-field"><span>考生状态</span><b>${info.agree}</b></div>
        </div>
      </div>`;

    const html = `
      <div class="cert">
        ${ticketHtml}
        <div class="cert-head">
          <div class="cert-org">📋 XBTI 国家精神状态鉴定中心</div>
          <div class="cert-sub">经 ISO 23333 抽象质量管理体系认证</div>
          <div class="cert-meta">报告编号 ${id} ｜ 诊断日期 ${date} ｜ 主检医师：风 ｜ 复核：你的良心</div>
        </div>

        <div class="main-type">
          <div class="mt-label">你的主人格是</div>
          <div class="mt-name">「 ${type.name} 」<span class="mt-code">${type.code}</span></div>
          <div class="mt-match">匹配度
            <span class="bar"><i style="width:${matchRate}%"></i></span>
            <b>${matchRate}%</b> 确诊
          </div>
          <div class="mt-note">误差 ${100 - matchRate}% 留给奇迹。</div>
        </div>

        <div class="radar-wrap" id="radar">${radarSVG(scores)}</div>

        <div class="card academic">
          <div class="card-title">学术解读（伪）</div>
          <p>${type.academic}</p>
        </div>
        <div class="card flaw">
          <div class="card-title">隐藏槽点</div>
          <p>${type.flaw}</p>
        </div>

        <div class="verdict">
          <span class="seal">風</span>
          <p>「 ${type.verdict} 」</p>
        </div>

        <div class="prescription">
          <div class="rx-title">处 方 笺</div>
          <div class="rx-line">诊断：当代青年标准精神损耗（${type.name}型）</div>
          <div class="rx-body">${perscription}</div>
          <div class="rx-foot">用法用量：当笑话看，别当真 ｜ 医师签章：风 ｜ 有效期：至今日 24 点</div>
        </div>

        <div class="share-row">
          <button class="btn ghost" id="btn-copy-verdict">复制判词</button>
          <button class="btn ghost" id="btn-copy-text">复制诊断文案</button>
          <button class="btn ghost" id="btn-save-img">保存报告</button>
        </div>
        <div class="disclaimer">${D.meta.disclaimer}</div>
        <button class="btn retry" id="btn-retry">再测一次（结果可能不一样，真的）</button>
      </div>`;

    const box = $("#report");
    box.innerHTML = html;

    // 分享按钮
    $("#btn-copy-verdict").onclick = () => copyText(type.verdict);
    $("#btn-copy-text").onclick = () => copyText(buildShareText(type, matchRate, id, scores));
    $("#btn-save-img").onclick = () => saveReport();
    $("#btn-retry").onclick = () => { state.idx = 0; state.answers.fill(null); show("start"); };

    // 上报（不阻塞界面）
    if (SUBMIT) {
      SUBMIT.send({
        record_id: id,
        created_at: Date.now(),
        answers: state.answers.slice(),
        scores,
        result_type: type.code,
        result_name: type.name,
        match_rate: matchRate,
        info: state.info,
        meta: { ua: navigator.userAgent }
      });
    }
  }

  function buildPrescription(type) {
    if (D.rxPresets && D.rxPresets[type.name]) return D.rxPresets[type.name];
    return `1. 每日摸鱼不超过 6 小时（留点力气给真正想做的事）。<br>
            2. 发疯前先深呼吸，数到三，然后该疯疯（建议去公园）。<br>
            3. 23:30 前把手机拴在床尾，与「${type.name}」的本能和解。`;
  }
  function buildShareText(type, rate, id, scores) {
    const dims = D.dimensions.map(d => `${d.label} ${scores[d.key]}`).join(" ｜ ");
    return `【XBTI 精神状态鉴定】\n主人格：${type.name}（${type.code}）\n匹配度：${rate}% 确诊\n六维：${dims}\n赛博判词：${type.verdict}\n${D.meta.disclaimer}\n报告编号 ${id}`;
  }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(() => toast("已复制 ✓"), () => toast("复制失败，请手动选择"));
    } else { toast("当前环境不支持自动复制"); }
  }
  function saveReport() {
    const cert = document.querySelector("#report .cert");
    if (!cert) return;
    const name = (type && type.name) || "xbti";
    if (window.html2canvas) {
      toast("正在生成报告图片…");
      html2canvas(cert, {
        backgroundColor: "#fffdf8",
        scale: 2,
        ignoreElements: (el) => el.id === "btn-retry" || (el.classList && el.classList.contains("share-row"))
      }).then(canvas => {
        canvas.toBlob(b => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(b); a.download = name + "-诊断书.png"; a.click();
          toast("报告已保存 ✓");
        });
      }).catch(() => fallbackRadar(name));
      return;
    }
    fallbackRadar(name);
  }
  function fallbackRadar(name) {
    const svg = $("#radar svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = 640; c.height = 640;
      const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0, 640, 640);
      c.toBlob(b => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b); a.download = name + "-雷达图.png"; a.click();
        toast("已保存雷达图 ✓");
      });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
  }
  let toastTimer;
  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = el("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---------- 答题流程 ---------- */
  function renderQuestion() {
    const i = state.idx, q = D.questions[i], total = D.questions.length;
    $("#progress-bar").style.width = Math.round((i / total) * 100) + "%";
    $("#progress-text").textContent = `第 ${i + 1} / ${total} 题 · ${q.theme}`;
    $("#q-theme").textContent = q.theme;
    $("#q-text").textContent = q.q;
    const box = $("#options"); box.innerHTML = "";
    q.options.forEach(o => {
      const b = el("button", "opt" + (state.answers[i] === o.k ? " chosen" : ""));
      b.innerHTML = `<span class="opt-k">${o.k}</span><span class="opt-t">${o.t}</span>`;
      b.onclick = () => {
        state.answers[i] = o.k;
        [...box.children].forEach(c => c.classList.remove("chosen"));
        b.classList.add("chosen");
        $("#btn-next").disabled = false;
        if (i === total - 1) $("#btn-next").textContent = "查看我的诊断书 →";
      };
      box.appendChild(b);
    });
    $("#btn-back").style.visibility = i === 0 ? "hidden" : "visible";
    $("#btn-next").disabled = !state.answers[i];
    if (i !== total - 1) $("#btn-next").textContent = "下一题 →";
  }

  function bind() {
    $("#btn-start").onclick = () => { state.idx = 0; state.answers.fill(null); show("info"); renderInfo(); };
    $("#btn-enter").onclick = () => {
      const code = ($("#info-code").value || "").trim() || "匿名考生";
      state.info = {
        no: infoState.no,
        code,
        subject: "精神状态鉴定（XBTI）",
        hp: $("#info-hp").value,
        loc: $("#info-loc").value,
        stayup: +$("#info-stayup").value,
        stayup_lv: infoState.stayupLv,
        sign: $("#info-sign").value,
        agree: $("#info-agree").checked
      };
      show("quiz"); renderQuestion();
    };
    $("#btn-back").onclick = () => { if (state.idx > 0) { state.idx--; renderQuestion(); } };
    $("#btn-next").onclick = () => {
      if (!state.answers[state.idx]) return;
      if (state.idx < D.questions.length - 1) { state.idx++; renderQuestion(); }
      else { show("result"); renderReport(); }
    };
    // 主题
    if (CFG.THEME === "cyber") document.body.classList.add("cyber");
    else if (CFG.THEME === "paper") document.body.classList.add("paper");
  }

  document.addEventListener("DOMContentLoaded", bind);
})();
