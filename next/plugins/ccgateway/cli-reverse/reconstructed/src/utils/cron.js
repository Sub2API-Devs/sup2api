/**
 * utils/cron.ts
 *
 * cron 表达式：5 字段解析与展开、下一次运行时间计算（含 DST 处理）、人类可读描述、间隔写法（5m/2h/1d）转换
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cron.ts
 * pieces: chunk-mk7xxmed.js (10)
 * attribution: file-local 2, fingerprint 6, layout 1, placement 1
 */

//@ chunk-mk7xxmed.js:740-822 file-local
var FIELD_RANGES = [
  {
    min: 0,
    max: 59,
  },
  {
    min: 0,
    max: 23,
  },
  {
    min: 1,
    max: 31,
  },
  {
    min: 1,
    max: 12,
  },
  {
    min: 0,
    max: 6,
  },
];
//@ chunk-mk7xxmed.js:822-1439 file-local
function expandField(field, range) {
  let { min, max } = range;
  let out = new Set();
  for (let part of field.split(",")) {
    let stepMatch = part.match(/^\*(?:\/(\d+))?$/);
    if (stepMatch) {
      let step = stepMatch[1] ? parseInt(stepMatch[1], 10) : 1;
      if (step < 1) return null;
      for (let i = min; i <= max; i += step) out.add(i);
      continue;
    }
    let rangeMatch = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    if (rangeMatch) {
      let lo = parseInt(rangeMatch[1], 10);
      let hi = parseInt(rangeMatch[2], 10);
      let step = rangeMatch[3] ? parseInt(rangeMatch[3], 10) : 1;
      let isDow = min === 0 && max === 6;
      let effMax = isDow ? 7 : max;
      if (lo > hi || step < 1 || lo < min || hi > effMax) return null;
      for (let i = lo; i <= hi; i += step) out.add(isDow && i === 7 ? 0 : i);
      continue;
    }
    if (part.match(/^\d+$/)) {
      let n = parseInt(part, 10);
      if (min === 0 && max === 6 && n === 7) n = 0;
      if (n < min || n > max) return null;
      out.add(n);
      continue;
    }
    return null;
  }
  if (out.size === 0) return null;
  return Array.from(out).sort((left, right) => left - right);
}
//@ chunk-mk7xxmed.js:1439-1659 fingerprint (2.1.88 match: parseCronExpression, 1)
/**
 * 解析 5 字段 cron 表达式（支持 *、*\/n、a-b/n、列表，星期 7 视为 0），返回各字段展开后的数组，非法返回 null。
 */
function parseCronExpression(expr) {
  let parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  let expanded = [];
  for (let i_2 = 0; i_2 < 5; i_2++) {
    let result = expandField(parts[i_2], FIELD_RANGES[i_2]);
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
//@ chunk-mk7xxmed.js:1659-1763 layout
/**
 * 该时刻是否落在 DST 跳变的不存在时间段（setMinutes 后时间变化）。
 */
function isNonexistentLocalTime(date) {
  let date_2 = new Date(date.getTime());
  date_2.setMinutes(date_2.getMinutes());
  return date_2.getTime() !== date.getTime();
}
//@ chunk-mk7xxmed.js:1763-2684 fingerprint (2.1.88 match: computeNextCronRun, 0.88)
/**
 * 从给定时间的下一分钟开始逐分钟/小时/天跳跃查找下一个匹配时刻（最多约一年）；日与星期都受限时按 OR 语义；oneShot 时 DST 缺口内逐分钟前进。
 */
function computeNextCronRun(fields, from, { oneShot = false } = {}) {
  let minuteSet = new Set(fields.minute);
  let hourSet = new Set(fields.hour);
  let domSet = new Set(fields.dayOfMonth);
  let monthSet = new Set(fields.month);
  let dowSet = new Set(fields.dayOfWeek);
  let domIsFull = fields.dayOfMonth.length === 31;
  let dowIsFull = fields.dayOfWeek.length === 7;
  let dayMatches = (date) =>
    domIsFull && dowIsFull
      ? true
      : domIsFull
        ? dowSet.has(date.getDay())
        : dowIsFull
          ? domSet.has(date.getDate())
          : domSet.has(date.getDate()) || dowSet.has(date.getDay());
  let date = new Date(Math.floor(from.getTime() / 60000) * 60000 + 60000);
  if (Number.isNaN(date.getTime())) return null;
  let maxIter = 527040;
  for (let i = 0; i < maxIter; i++) {
    if (isNonexistentLocalTime(date)) {
      if (
        oneShot &&
        monthSet.has(date.getMonth() + 1) &&
        dayMatches(date) &&
        hourSet.has(date.getHours()) &&
        minuteSet.has(date.getMinutes())
      )
        return date;
      date.setTime(date.getTime() + 60000);
      continue;
    }
    let month = date.getMonth() + 1;
    if (!monthSet.has(month)) {
      date.setMonth(date.getMonth() + 1, 1);
      date.setHours(0, 0, 0, 0);
      continue;
    }
    if (!dayMatches(date)) {
      date.setDate(date.getDate() + 1);
      date.setHours(0, 0, 0, 0);
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
//@ chunk-mk7xxmed.js:2684-2763 fingerprint (2.1.88 match: DAY_NAMES, 1)
var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
//@ chunk-mk7xxmed.js:2763-2871 fingerprint (2.1.88 match: formatLocalTime, 1)
function formatLocalTime(minute, hour) {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
//@ chunk-mk7xxmed.js:2871-3017 fingerprint (2.1.88 match: formatUtcTimeAsLocal, 1)
function formatUtcTimeAsLocal(minute, hour) {
  let date = new Date();
  date.setUTCHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
//@ chunk-mk7xxmed.js:3017-4134 fingerprint (2.1.88 match: cronToHuman, 1)
/**
 * cron 转人类可读文本（Every minute / Every N hours / Every day at … / Weekdays at …），无法描述时原样返回；utc 选项把 UTC 时间换算成本地显示。
 */
function cronToHuman(cron, opts) {
  let utc = opts?.utc ?? false;
  let parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  let [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  if (hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    if (minute === "*") return "Every minute";
    let everyMinMatch = minute.match(/^\*\/(\d+)$/);
    if (everyMinMatch) {
      let n = parseInt(everyMinMatch[1], 10);
      return n === 1 ? "Every minute" : `Every ${n} minutes`;
    }
  }
  if (minute.match(/^\d+$/) && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    let minutePart = parseInt(minute, 10);
    if (minutePart === 0) return "Every hour";
    return `Every hour at :${minutePart.toString().padStart(2, "0")}`;
  }
  let everyHourMatch = hour.match(/^\*\/(\d+)$/);
  if (minute.match(/^\d+$/) && everyHourMatch && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    let n = parseInt(everyHourMatch[1], 10);
    let m = parseInt(minute, 10);
    let suffix = m === 0 ? "" : ` at :${m.toString().padStart(2, "0")}`;
    return n === 1 ? `Every hour${suffix}` : `Every ${n} hours${suffix}`;
  }
  if (!minute.match(/^\d+$/) || !hour.match(/^\d+$/)) return cron;
  let m_2 = parseInt(minute, 10);
  let hourNum = parseInt(hour, 10);
  let fmtTime = utc ? formatUtcTimeAsLocal : formatLocalTime;
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*")
    return `Every day at ${fmtTime(m_2, hourNum)}`;
  if (dayOfMonth === "*" && month === "*" && dayOfWeek.match(/^\d$/)) {
    let dayIndex = parseInt(dayOfWeek, 10) % 7;
    let dayName;
    if (utc) {
      let ref = new Date();
      let daysToAdd = (dayIndex - ref.getUTCDay() + 7) % 7;
      ref.setUTCDate(ref.getUTCDate() + daysToAdd);
      ref.setUTCHours(hourNum, m_2, 0, 0);
      dayName = DAY_NAMES[ref.getDay()];
    } else dayName = DAY_NAMES[dayIndex];
    if (dayName) return `Every ${dayName} at ${fmtTime(m_2, hourNum)}`;
  }
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "1-5")
    return `Weekdays at ${fmtTime(m_2, hourNum)}`;
  return cron;
}
//@ chunk-mk7xxmed.js:4134-4996 placement
/**
 * 把用户输入的间隔（5m、2h、1d，秒不允许）或合法 cron 转成 {cron, human}，否则返回 {error}。
 */
function parseScheduleInput(input) {
  let trimmed = input.trim();
  if (trimmed === "")
    return {
      error: "required",
    };
  let match = trimmed.match(/^(\d+)\s*([smhd])$/i);
  if (match) {
    let interval = parseInt(match[1], 10);
    let lower = match[2].toLowerCase();
    if (interval < 1)
      return {
        error: "interval must be at least 1",
      };
    let cron;
    switch (lower) {
      case "s":
        return {
          error: "minimum interval is 1 minute",
        };
      case "m":
        if (interval > 59)
          return {
            error: "minute interval must be 1\u201359 (use hours instead)",
          };
        cron = interval === 1 ? "* * * * *" : `*/${interval} * * * *`;
        break;
      case "h":
        if (interval > 23)
          return {
            error: "hour interval must be 1\u201323 (use days instead)",
          };
        cron = interval === 1 ? "0 * * * *" : `0 */${interval} * * *`;
        break;
      case "d":
        if (interval === 1) {
          cron = "0 0 * * *";
          break;
        }
        if (interval > 28)
          return {
            error: "day interval must be 1\u201328 (use a cron expression)",
          };
        cron = `0 0 */${interval} * *`;
        break;
      default:
        return {
          error: "unknown interval unit",
        };
    }
    return {
      cron,
      human: cronToHuman(cron),
    };
  }
  if (parseCronExpression(trimmed) !== null)
    return {
      cron: trimmed,
      human: cronToHuman(trimmed),
    };
  return {
    error: "use an interval (5m, 2h, 1d) or 5-field cron (*/5 * * * *)",
  };
}
export { parseCronExpression, cronToHuman, computeNextCronRun, parseScheduleInput };
