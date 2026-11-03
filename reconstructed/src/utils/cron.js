/**
 * utils/cron.ts
 *
 * cron 表达式：5 字段解析与展开、下一次运行时间计算（含 DST 处理）、人类可读描述、间隔写法（5m/2h/1d）转换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cron.ts
 * pieces: chunk-93zax7h2.js (10)
 * attribution: file-local 2, fingerprint 6, layout 1, placement 1
 */

//@ chunk-93zax7h2.js:754-836 file-local
var FIELD_RANGES = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 6 },
];
//@ chunk-93zax7h2.js:836-1453 file-local
function expandField(field, range) {
  let { min: min, max: max } = range,
    out = new Set();
  for (let part of field.split(",")) {
    let stepMatch = part.match(/^\*(?:\/(\d+))?$/);
    if (stepMatch) {
      let c = stepMatch[1] ? parseInt(stepMatch[1], 10) : 1;
      if (c < 1) return null;
      for (let f = min; f <= max; f += c) out.add(f);
      continue;
    }
    let rangeMatch = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    if (rangeMatch) {
      let lo = parseInt(rangeMatch[1], 10),
        hi = parseInt(rangeMatch[2], 10),
        u = rangeMatch[3] ? parseInt(rangeMatch[3], 10) : 1,
        isDow = min === 0 && max === 6,
        d = isDow ? 7 : max;
      if (lo > hi || u < 1 || lo < min || hi > d) return null;
      for (let g = lo; g <= hi; g += u) out.add(isDow && g === 7 ? 0 : g);
      continue;
    }
    if (part.match(/^\d+$/)) {
      let c = parseInt(part, 10);
      if (min === 0 && max === 6 && c === 7) c = 0;
      if (c < min || c > max) return null;
      out.add(c);
      continue;
    }
    return null;
  }
  if (out.size === 0) return null;
  return Array.from(out).sort((a, n) => a - n);
}
/**
 * 解析 5 字段 cron 表达式（支持 *、*\/n、a-b/n、列表，星期 7 视为 0），返回各字段展开后的数组，非法返回 null。
 */
//@ chunk-93zax7h2.js:1453-1673 fingerprint = parseCronExpression (1)
function parseCronExpression(expr) {
  let parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  let expanded = [];
  for (let r = 0; r < 5; r++) {
    let result = expandField(parts[r], FIELD_RANGES[r]);
    if (!result) return null;
    expanded.push(result);
  }
  return {
    minute: expanded[0],
    hour: expanded[1],
    dayOfMonth: expanded[2],
    month: expanded[3],
    dayOfWeek: expanded[4],
  };
}
/**
 * 该时刻是否落在 DST 跳变的不存在时间段（setMinutes 后时间变化）。
 */
//@ chunk-93zax7h2.js:1673-1777 layout
function isNonexistentLocalTime(date) {
  let date_2 = new Date(date.getTime());
  return (date_2.setMinutes(date_2.getMinutes()), date_2.getTime() !== date.getTime());
}
/**
 * 从给定时间的下一分钟开始逐分钟/小时/天跳跃查找下一个匹配时刻（最多约一年）；日与星期都受限时按 OR 语义；oneShot 时 DST 缺口内逐分钟前进。
 */
//@ chunk-93zax7h2.js:1777-2698 fingerprint = computeNextCronRun (0.879)
function computeNextCronRun(fields, from, { oneShot: oneShot = !1 } = {}) {
  let minuteSet = new Set(fields.minute),
    hourSet = new Set(fields.hour),
    domSet = new Set(fields.dayOfMonth),
    monthSet = new Set(fields.month),
    dowSet = new Set(fields.dayOfWeek),
    p = fields.dayOfMonth.length === 31,
    c = fields.dayOfWeek.length === 7,
    f = (d) =>
      p && c
        ? !0
        : p
          ? dowSet.has(d.getDay())
          : c
            ? domSet.has(d.getDate())
            : domSet.has(d.getDate()) || dowSet.has(d.getDay()),
    date = new Date(Math.floor(from.getTime() / 60000) * 60000 + 60000);
  if (Number.isNaN(date.getTime())) return null;
  let h = 527040;
  for (let d = 0; d < h; d++) {
    if (isNonexistentLocalTime(date)) {
      if (
        oneShot &&
        monthSet.has(date.getMonth() + 1) &&
        f(date) &&
        hourSet.has(date.getHours()) &&
        minuteSet.has(date.getMinutes())
      )
        return date;
      date.setTime(date.getTime() + 60000);
      continue;
    }
    let g = date.getMonth() + 1;
    if (!monthSet.has(g)) {
      (date.setMonth(date.getMonth() + 1, 1), date.setHours(0, 0, 0, 0));
      continue;
    }
    if (!f(date)) {
      (date.setDate(date.getDate() + 1), date.setHours(0, 0, 0, 0));
      continue;
    }
    if (!hourSet.has(date.getHours()) || !minuteSet.has(date.getMinutes())) {
      if (oneShot) date.setTime(date.getTime() + 60000);
      else if (!hourSet.has(date.getHours())) date.setHours(date.getHours() + 1, 0, 0, 0);
      else date.setMinutes(date.getMinutes() + 1);
      continue;
    }
    return date;
  }
  return null;
}
//@ chunk-93zax7h2.js:2698-2777 fingerprint = DAY_NAMES (1)
var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
//@ chunk-93zax7h2.js:2777-2885 fingerprint = formatLocalTime (1)
function formatLocalTime(minute, hour) {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
//@ chunk-93zax7h2.js:2885-3031 fingerprint = formatUtcTimeAsLocal (1)
function formatUtcTimeAsLocal(minute, hour) {
  let date = new Date();
  return (
    date.setUTCHours(hour, minute, 0, 0),
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })
  );
}
/**
 * cron 转人类可读文本（Every minute / Every N hours / Every day at … / Weekdays at …），无法描述时原样返回；utc 选项把 UTC 时间换算成本地显示。
 */
//@ chunk-93zax7h2.js:3031-4148 fingerprint = cronToHuman (1)
function cronToHuman(cron, opts) {
  let utc = opts?.utc ?? !1,
    parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  let [i, a, n, m, p] = parts;
  if (a === "*" && n === "*" && m === "*" && p === "*") {
    if (i === "*") return "Every minute";
    let everyMinMatch = i.match(/^\*\/(\d+)$/);
    if (everyMinMatch) {
      let g = parseInt(everyMinMatch[1], 10);
      return g === 1 ? "Every minute" : `Every ${g} minutes`;
    }
  }
  if (i.match(/^\d+$/) && a === "*" && n === "*" && m === "*" && p === "*") {
    let d = parseInt(i, 10);
    if (d === 0) return "Every hour";
    return `Every hour at :${d.toString().padStart(2, "0")}`;
  }
  let everyHourMatch = a.match(/^\*\/(\d+)$/);
  if (i.match(/^\d+$/) && everyHourMatch && n === "*" && m === "*" && p === "*") {
    let d = parseInt(everyHourMatch[1], 10),
      g = parseInt(i, 10),
      y = g === 0 ? "" : ` at :${g.toString().padStart(2, "0")}`;
    return d === 1 ? `Every hour${y}` : `Every ${d} hours${y}`;
  }
  if (!i.match(/^\d+$/) || !a.match(/^\d+$/)) return cron;
  let f = parseInt(i, 10),
    u = parseInt(a, 10),
    h = utc ? formatUtcTimeAsLocal : formatLocalTime;
  if (n === "*" && m === "*" && p === "*") return `Every day at ${h(f, u)}`;
  if (n === "*" && m === "*" && p.match(/^\d$/)) {
    let d = parseInt(p, 10) % 7,
      dayName;
    if (utc) {
      let ref = new Date(),
        T = (d - ref.getUTCDay() + 7) % 7;
      (ref.setUTCDate(ref.getUTCDate() + T),
        ref.setUTCHours(u, f, 0, 0),
        (dayName = DAY_NAMES[ref.getDay()]));
    } else dayName = DAY_NAMES[d];
    if (dayName) return `Every ${dayName} at ${h(f, u)}`;
  }
  if (n === "*" && m === "*" && p === "1-5") return `Weekdays at ${h(f, u)}`;
  return cron;
}
/**
 * 把用户输入的间隔（5m、2h、1d，秒不允许）或合法 cron 转成 {cron, human}，否则返回 {error}。
 */
//@ chunk-93zax7h2.js:4148-5010 placement
function parseScheduleInput(input) {
  let trimmed = input.trim();
  if (trimmed === "") return { error: "required" };
  let match = trimmed.match(/^(\d+)\s*([smhd])$/i);
  if (match) {
    let r = parseInt(match[1], 10),
      lower = match[2].toLowerCase();
    if (r < 1) return { error: "interval must be at least 1" };
    let a;
    switch (lower) {
      case "s":
        return { error: "minimum interval is 1 minute" };
      case "m":
        if (r > 59) return { error: "minute interval must be 1\u201359 (use hours instead)" };
        a = r === 1 ? "* * * * *" : `*/${r} * * * *`;
        break;
      case "h":
        if (r > 23) return { error: "hour interval must be 1\u201323 (use days instead)" };
        a = r === 1 ? "0 * * * *" : `0 */${r} * * *`;
        break;
      case "d":
        if (r === 1) {
          a = "0 0 * * *";
          break;
        }
        if (r > 28) return { error: "day interval must be 1\u201328 (use a cron expression)" };
        a = `0 0 */${r} * *`;
        break;
      default:
        return { error: "unknown interval unit" };
    }
    return { cron: a, human: cronToHuman(a) };
  }
  if (parseCronExpression(trimmed) !== null) return { cron: trimmed, human: cronToHuman(trimmed) };
  return { error: "use an interval (5m, 2h, 1d) or 5-field cron (*/5 * * * *)" };
}

export { parseScheduleInput, cronToHuman, parseCronExpression, computeNextCronRun };
