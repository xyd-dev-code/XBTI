-- XBTI D1 数据表结构
-- 初始化：wrangler d1 execute xbti --local --file=./schema.sql
-- 生产：  wrangler d1 execute xbti --remote --file=./schema.sql
CREATE TABLE IF NOT EXISTS records (
  id           TEXT PRIMARY KEY,
  created_at   INTEGER,                       -- 答题完成时间戳(ms)
  answers      TEXT,                          -- JSON: ["A","C",...] 30 题作答
  scores       TEXT,                          -- JSON: 六维得分
  result_type  TEXT,                          -- 人格代号，如 ESFP
  result_name  TEXT,                          -- 人格名称，如 吗喽
  match_rate   INTEGER,                       -- 匹配度 %
  meta         TEXT                           -- JSON: ua 等附加信息
);
CREATE INDEX IF NOT EXISTS idx_records_created ON records (created_at DESC);
