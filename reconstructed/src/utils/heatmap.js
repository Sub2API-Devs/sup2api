/**
 * utils/heatmap.ts
 *
 * /stats 每日活跃热力图绘制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/heatmap.ts
 * pieces: chunk-9h8dr0qb.js (6)
 * attribution: fingerprint 5, layout 1
 */
import { sequential } from "./sequential.js";

//@ chunk-9h8dr0qb.js:68754-68970 fingerprint = calculatePercentiles (1)
function calculatePercentiles(dailyActivity) {
  let counts = dailyActivity
    .map((p) => p.messageCount)
    .filter((p) => p > 0)
    .sort((p, h) => p - h);
  if (counts.length === 0) return null;
  return {
    p25: counts[Math.floor(counts.length * 0.25)],
    p50: counts[Math.floor(counts.length * 0.5)],
    p75: counts[Math.floor(counts.length * 0.75)],
  };
}
//@ chunk-9h8dr0qb.js:68970-70093 fingerprint = generateHeatmap (1)
/**
 * 按每日消息数生成 /stats 的终端热力图。
 */
function generateHeatmap(dailyActivity, options = {}) {
  let { terminalWidth = 80, showMonthLabels = true } = options;
  let dayLabelWidth = 4;
  let availableWidth = terminalWidth - 4;
  let width = Math.min(52, Math.max(10, availableWidth));
  let activityMap = new Map();
  for (let activity of dailyActivity) activityMap.set(activity.date, activity);
  let percentiles = calculatePercentiles(dailyActivity);
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  let currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());
  let startDate = new Date(currentWeekStart);
  startDate.setDate(startDate.getDate() - (width - 1) * 7);
  let grid = Array.from(
    {
      length: 7,
    },
    () => Array(width).fill(""),
  );
  let monthStarts = [];
  let lastMonth = -1;
  let currentDate = new Date(startDate);
  for (let week = 0; week < width; week++)
    for (let day = 0; day < 7; day++) {
      if (currentDate > today) {
        grid[day][week] = " ";
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      let dateStr = getLocalISODate(currentDate);
      let activity = activityMap.get(dateStr);
      if (day === 0) {
        let month = currentDate.getMonth();
        if (month !== lastMonth) {
          monthStarts.push({
            month,
            week,
          });
          lastMonth = month;
        }
      }
      let intensity = getIntensity(activity?.messageCount || 0, percentiles);
      grid[day][week] = getHeatmapChar(intensity);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  let lines = [];
  if (showMonthLabels) {
    let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let uniqueMonths = monthStarts.map((m) => m.month);
    let labelWidth = Math.floor(width / Math.max(uniqueMonths.length, 1));
    let monthLabels = uniqueMonths.map((month) => monthNames[month].padEnd(labelWidth)).join("");
    lines.push("    " + monthLabels);
  }
  let dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let day = 0; day < 7; day++) {
    let J = ([1, 3, 5].includes(day) ? dayLabels[day].padEnd(3) : "   ") + " " + grid[day].join("");
    lines.push(J);
  }
  lines.push("");
  lines.push(
    "    Less " +
      [claudeOrange("\u2591"), claudeOrange("\u2592"), claudeOrange("\u2593"), claudeOrange("\u2588")].join(
        " ",
      ) +
      " More",
  );
  return lines.join(`
`);
}
//@ chunk-9h8dr0qb.js:70093-70232 layout = getLocalISODate (0.851)
function getLocalISODate(now) {
  let year = now.getFullYear();
  let month = String(now.getMonth() + 1).padStart(2, "0");
  let day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
//@ chunk-9h8dr0qb.js:70232-70343 fingerprint = getIntensity (1)
function getIntensity(messageCount, percentiles) {
  if (messageCount === 0 || !percentiles) return 0;
  if (messageCount >= percentiles.p75) return 4;
  if (messageCount >= percentiles.p50) return 3;
  if (messageCount >= percentiles.p25) return 2;
  return 1;
}
//@ chunk-9h8dr0qb.js:70343-70368 fingerprint = claudeOrange (1)
var claudeOrange = sequential.hex("#da7756");
//@ chunk-9h8dr0qb.js:70368-70563 fingerprint = getHeatmapChar (1)
function getHeatmapChar(intensity) {
  switch (intensity) {
    case 0:
      return sequential.gray("\xB7");
    case 1:
      return claudeOrange("\u2591");
    case 2:
      return claudeOrange("\u2592");
    case 3:
      return claudeOrange("\u2593");
    case 4:
      return claudeOrange("\u2588");
    default:
      return sequential.gray("\xB7");
  }
}
export { generateHeatmap };
