/**
 * plugins/bundled/easel/easelPlugin.ts
 *
 * 2.1.316 新增：easel 插件入口：chart 调用处理、自动图表（对工具结果自动作图）与 ui.render 显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (54)
 * attribution: placement 54
 */
import {
  stableSum,
  elideList,
  wrapToWidth,
  cleanCellText,
  formatCount,
  isPlainObject,
  cleanAllStrings,
  isValidChartInput,
  validateChartInput,
  selectPath,
  toolResultText,
  collectToolUses,
} from "./chartSchema.js";
import {
  formatLabel,
  MAX_TABLE_DESCRIPTION_CHARS,
  FAILED_USAGE,
  failedUsageWithForm,
  describeNamesReadAsBars,
  describeTables,
  easelSettingsEvent,
  usageEventFor,
  buildEaselTelemetryEvent,
} from "./readTable.js";
import { planChartLayout, renderLegend, rasterizeChart, layoutChart, MIN_PLOT_WIDTH } from "./renderChart.js";
import { ansiToSvg } from "./chartSvg.js";
import { MAX_LISTED_NAMES, readChartRequestData, CHART_THEME_COLORS } from "./planChart.js";
import { asBarsForm, VALUE, CHART_TOOL_DEF, waitForToolUses } from "./parseValues.js";
import {
  MCP_EASEL_CHART,
  AUTO_CHART_HINT,
  CHART_TOOL_HINT,
  POLICY_WITHHOLDS_TEXT,
  NO_CONVERSATION_MESSAGE,
  EASEL_FAILED_MESSAGE,
} from "./easelMessages.js";

//@ chunk-3s7ydtfd.js:81486-81497 placement
/**
 * 100
 */
var DEFAULT_SVG_WIDTH = 100;
//@ chunk-3s7ydtfd.js:81497-81509 placement
/**
 * 1000
 */
var DEFAULT_TERMINAL_ROWS = 1000;
//@ chunk-3s7ydtfd.js:81509-81518 placement
/**
 * 2
 */
var UNKNOWN_FIELD_COUNT = 2;
//@ chunk-3s7ydtfd.js:81518-81528 placement
/**
 * 40
 */
var MAX_LABEL_CHARS = 40;
//@ chunk-3s7ydtfd.js:81528-81537 placement
/**
 * 5
 */
var MAX_LISTED_TBL_ROWS = 5;
//@ chunk-3s7ydtfd.js:81537-81547 placement
/**
 * 66
 */
var UNREAD_TEXT_WIDTH = 66;
//@ chunk-3s7ydtfd.js:81547-81624 placement
/**
 * 统计非空点数
 */
var countNonNullPoints = (e) =>
  stableSum(e.series.flatMap((t) => t.samples).map((t) => (t.value === null ? 0 : 1)));
//@ chunk-3s7ydtfd.js:81624-81768 placement
/**
 * 已绘制图表的用量遥测（形式、格式、系列数、点数、是否省略）。
 */
var drawnUsage = (e, t) => ({
  ...e,
  outcome: "drawn",
  form: t.form,
  format: formatLabel(t),
  seriesCount: t.series.length,
  pointCount: countNonNullPoints(t),
  hasLeftOut: t.leftOutNotes.length > 0,
});
//@ chunk-3s7ydtfd.js:81768-81828 placement
/**
 * NaN 用默认值，否则向下取整并封顶
 */
var clampRounded = (e, t, o) => (Number.isNaN(e) ? o : Math.min(Math.floor(e), t));
//@ chunk-3s7ydtfd.js:81828-82020 placement
/**
 * 由请求与数据生成图表结果：给模型的图例文本、终端行渲染器与 SVG 渲染器。
 */
function buildChartResult(e, t, o) {
  let r = planChartLayout(e, t);
  return {
    kind: "chart",
    modelText: renderLegend(r).join(`
`),
    terminalRows: (s) =>
      rasterizeChart(layoutChart(r, Math.max(0, clampRounded(s, DEFAULT_TERMINAL_ROWS, 0)))),
    svg: (s = DEFAULT_SVG_WIDTH) =>
      ansiToSvg(
        layoutChart(r, Math.max(MIN_PLOT_WIDTH, clampRounded(s, DEFAULT_SVG_WIDTH, DEFAULT_SVG_WIDTH))),
      ),
    usage: drawnUsage(o, e),
  };
}
//@ chunk-3s7ydtfd.js:82020-82038 placement
/**
 * 未绘制摘要的行数
 */
var NOT_DRAWN_SUMMARY_LINES = 1 + MAX_TABLE_DESCRIPTION_CHARS + UNKNOWN_FIELD_COUNT * MAX_LISTED_NAMES;
//@ chunk-3s7ydtfd.js:82038-82211 placement
/**
 * 未绘制的结果文本（Not drawn + 原因列表，按宽度折行）。
 */
var refusedResult_2 = (outcome, t, o) => ({
  kind: "refused",
  modelText: (
    "Not drawn. " +
    elideList(t, NOT_DRAWN_SUMMARY_LINES, "more line").join(`
- `)
  )
    .split(
      `
`,
    )
    .map((line) =>
      wrapToWidth(line, UNREAD_TEXT_WIDTH, 1 / 0).join(`
  `),
    ).join(`
`),
  usage: {
    ...o,
    outcome,
  },
});
//@ chunk-3s7ydtfd.js:82211-82366 placement
/**
 * x 列是名称而非时间时改画为柱状并加说明。
 */
var redrawAsBars = (e, t, o) =>
  buildChartResult(
    {
      ...e,
      notes: [`drawn as bars, not as ${t.form ?? "line"}: ${t.x ?? "x"} holds names, not times`, ...e.notes],
    },
    asBarsForm(t),
    {
      ...o,
      isFormReplaced: true,
    },
  );
//@ chunk-3s7ydtfd.js:82366-82574 placement
function describeOtherResults(e, t, o) {
  let mapped = t
    .slice(-MAX_LISTED_TBL_ROWS)
    .map(
      ({ id, tool, text }) =>
        `${cleanCellText(id, MAX_LABEL_CHARS)} (${cleanCellText(tool, MAX_LABEL_CHARS)}, ${formatCount(text.length, "character")})`,
    );
  let s = mapped.length > 0;
  return refusedResult_2(
    e.code,
    [
      e.why +
        (s
          ? `
Or name another tool result:`
          : ""),
      ...mapped,
    ],
    o,
  );
}
//@ chunk-3s7ydtfd.js:82574-82814 placement
var NO_DATA_MESSAGES = (e) =>
  e
    ? {
        code: "no_result",
        why: "No tool has answered yet. Pass the rows as data",
      }
    : {
        code: "data_not_found",
        why: "data is neither the id of a tool result nor a table. Pass an id, JSON records, or the text of a CSV, TSV or markdown table",
      };
//@ chunk-3s7ydtfd.js:82814-82832 placement
/**
 * 含换行或以 [ { 开头
 */
var JSON_LOOKING_RE = /\n|^[[{]/;
//@ chunk-3s7ydtfd.js:82832-82927 placement
/**
 * 取输入里的 JSON 数据文本
 */
function jsonDataFromInput(e) {
  let t = isPlainObject(e) ? e.data : undefined;
  return typeof t === "string" && JSON_LOOKING_RE.test(t.trim()) ? t : undefined;
}
//@ chunk-3s7ydtfd.js:82927-82976 placement
/**
 * 补上推导出的格式
 */
var withDerivedFormat = (e, t, o) => ({
  ...e,
  format: o ? formatLabel(t) : e.format,
});
//@ chunk-3s7ydtfd.js:82976-83087 placement
/**
 * y/by 为字符串时包成数组。
 */
function normalizeChartInput(e) {
  return isPlainObject(e)
    ? {
        ...e,
        ...(typeof e.y === "string" && {
          y: [e.y],
        }),
        ...(typeof e.by === "string" && {
          by: [e.by],
        }),
      }
    : e;
}
//@ chunk-3s7ydtfd.js:83087-83150 placement
/**
 * share 图默认 combine=sum
 */
var defaultShareCombine = (e) =>
  e.form === "share"
    ? {
        ...e,
        combine: e.combine ?? "sum",
      }
    : e;
//@ chunk-3s7ydtfd.js:83150-83903 placement
/**
 * 处理 easel chart 调用：校验输入、选定数据来源（指定结果或上一个工具结果）、绘图并返回说明。
 */
function handleChartCall(e) {
  let t = normalizeChartInput(cleanAllStrings(e.input ?? {}));
  if (!isValidChartInput(t)) return refusedResult_2("bad_call", validateChartInput(t), FAILED_USAGE);
  let r = defaultShareCombine(t);
  let { data: s } = r;
  let filtered = e.results.filter((oe) => oe.tool !== MCP_EASEL_CHART);
  let m = s === undefined;
  let n = m ? filtered.findLast((oe) => oe.text.trim() !== "") : filtered.find((oe) => oe.id === s);
  let filtered_2 = filtered.filter((oe) => oe !== n);
  let f = jsonDataFromInput(e.input);
  let i = typeof s === "object" ? JSON.stringify(s) : undefined;
  let x = i ?? n?.text ?? f;
  let c = failedUsageWithForm(
    r,
    i ? "rows" : n ? (m ? "last_result" : "result_id") : f === undefined ? "none" : "text",
  );
  if (x === undefined) return describeOtherResults(NO_DATA_MESSAGES(m), filtered_2, c);
  let g = {
    zone: r.zone === "local" ? e.zone : "UTC",
    nowMs: e.nowMs,
  };
  let chartRequestData = readChartRequestData(x, r, g);
  if (chartRequestData.kind === "data") return buildChartResult(chartRequestData, r, c);
  let _ = chartRequestData.problem.fitsBars
    ? describeNamesReadAsBars(chartRequestData, readChartRequestData(x, asBarsForm(r), g), r)
    : chartRequestData;
  if (_.kind === "data") return redrawAsBars(_, r, c);
  let [A, ...Fe] = _.tables;
  return A !== undefined
    ? refusedResult_2(
        _.problem.code,
        [_.problem.why, ...describeTables(_.tables)],
        withDerivedFormat(c, A, Fe.length === 0),
      )
    : describeOtherResults(_.problem, filtered_2, c);
}
//@ chunk-3s7ydtfd.js:83903-84269 placement
function describeRequestShape(e, t) {
  let o = {
    form: "line",
  };
  let chartRequestData = readChartRequestData(e, o, {
    zone: "UTC",
    nowMs: t.nowMs,
  });
  if (!(
    chartRequestData.kind === "data" &&
    chartRequestData.isSeries &&
    chartRequestData.leftOutNotes.length === 0
  ))
    return {
      kind: "none",
    };
  let p = cleanCellText(
    t.query.replaceAll(
      `
`,
      " ",
    ),
  );
  let n = chartRequestData.subject.toLowerCase() === VALUE && p !== "" ? p : chartRequestData.subject;
  return buildChartResult(
    {
      ...chartRequestData,
      subject: n,
      series: chartRequestData.series.map((a) =>
        a.name === chartRequestData.subject
          ? {
              ...a,
              name: n,
            }
          : a,
      ),
    },
    o,
    {
      ...FAILED_USAGE,
      dataFrom: "last_result",
    },
  );
}
//@ chunk-3s7ydtfd.js:84269-84598 placement
/**
 * 注册 chart 工具（设置了代理时不注册并记录）。
 */
function registerChartTool(e, t, o) {
  if (o.isProxySet?.() === true) {
    e.ui.log("no chart tool: a proxy is set", {
      to: "debug",
    });
    e.telemetry
      .mark({
        feature: "easel_chart",
        kind: "sad",
        reason: "proxy_set",
      })
      .catch(() => {
        return;
      });
  } else
    e.tool.register(CHART_TOOL_DEF).catch((error) =>
      e.ui.log(`no chart tool: ${String(error)}`, {
        to: "debug",
      }),
    );
  if (t)
    e.telemetry.log(easelSettingsEvent(t)).catch(() => {
      return;
    });
}
//@ chunk-3s7ydtfd.js:84598-84845 placement
/**
 * 记录 easel 遥测（mark 与带界面列表的 log 事件）。
 */
function logEaselUsage(error, usage, o) {
  error.telemetry.mark(usageEventFor(usage, o.isAsked)).catch(() => {
    return;
  });
  error.session
    .surfaces()
    .catch(() => [])
    .then((surfaces) =>
      error.telemetry.log(
        buildEaselTelemetryEvent(usage, {
          isAsked: o.isAsked,
          isInSubagent: o.agentId !== undefined,
          surfaces,
          elapsedMs: o.elapsedMs,
        }),
      ),
    )
    .catch(() => {
      return;
    });
}
//@ chunk-3s7ydtfd.js:84845-84870 placement
/**
 * 10/20/40/80/160
 */
var TERMINAL_WIDTH_STEPS = [10, 20, 40, 80, 160];
//@ chunk-3s7ydtfd.js:84870-84881 placement
/**
 * 256
 */
var MAX_CACHED_CHARTS = 256;
//@ chunk-3s7ydtfd.js:84881-84891 placement
/**
 * 80
 */
var DEFAULT_COLUMNS = 80;
//@ chunk-3s7ydtfd.js:84891-85073 placement
/**
 * 缓存图表结果（满了淘汰最后一个），无图表时记入 chartlessIds。
 */
function cacheChart(e, toolUseId, o) {
  if (o.kind === "none") {
    e.chartlessIds.add(toolUseId);
    return o;
  }
  let last = [...e.charts.keys()].at(-1);
  if (e.charts.size >= MAX_CACHED_CHARTS && last !== undefined) e.charts.delete(last);
  e.charts.set(toolUseId, o);
  return o;
}
//@ chunk-3s7ydtfd.js:85073-85107 placement
/**
 * 合并普通对象
 */
var mergePlainObject = (e, t) => ({
  ...e,
  ...(isPlainObject(t) && t),
});
//@ chunk-3s7ydtfd.js:85107-85160 placement
/**
 * 带 easel _meta 的文本结果
 */
var textResultWithMeta = (text, easel) => ({
  type: "text",
  text,
  _meta: {
    easel,
  },
});
//@ chunk-3s7ydtfd.js:85160-85187 placement
/**
 * 不是终端渲染
 */
var isNonTerminalSurface = (surface) => surface !== "terminal";
//@ chunk-3s7ydtfd.js:85187-85210 placement
/**
 * 非空
 */
var isNonEmpty = (e) => e.length > 0;
//@ chunk-3s7ydtfd.js:85210-85239 placement
/**
 * 0/false/no/off
 */
var FALSEY_RE = /^(0|false|no|off)$/i;
//@ chunk-3s7ydtfd.js:85239-85267 placement
/**
 * 1/true/yes/on
 */
var TRUTHY_RE = /^(1|true|yes|on)$/i;
//@ chunk-3s7ydtfd.js:85267-85294 placement
/**
 * 非 easel 的 MCP 工具名
 */
var NON_EASEL_MCP_RE = /^mcp__(?!easel__)/;
//@ chunk-3s7ydtfd.js:85294-85416 placement
/**
 * 从工具输入的 query/expr/query_expr 中取第一个非空查询文本。
 */
function queryTextOf(e) {
  return (
    ["query", "expr", "query_expr"]
      .flatMap((t) => selectPath(e, t))
      .find((t) => typeof t === "string" && t.trim() !== "") ?? ""
  );
}
//@ chunk-3s7ydtfd.js:85416-85442 placement
/**
 * 追加自动图表提示
 */
var withAutoChartHint = (context) => [...(context ?? []), AUTO_CHART_HINT];
//@ chunk-3s7ydtfd.js:85442-85580 placement
/**
 * 是否按读屏模式输出图表。
 */
function isScreenReaderRequest(e, t) {
  let o = e?.trim() ?? "";
  let matches = FALSEY_RE.test(o);
  let found = t.find((p) => p.axScreenReader !== undefined);
  return matches ? false : TRUTHY_RE.test(o) || found?.axScreenReader === true;
}
//@ chunk-3s7ydtfd.js:85580-85724 placement
/**
 * 读结果里的 _meta.easel（nowMs、时区，默认 UTC）。
 */
function readEaselMeta(storedResult) {
  let [t] = selectPath(storedResult, "0._meta.easel");
  let { nowMs, zone } = isPlainObject(t) ? t : {};
  return {
    nowMs: typeof nowMs === "number" ? nowMs : null,
    zone: typeof zone === "string" ? zone : "UTC",
  };
}
//@ chunk-3s7ydtfd.js:85724-85747 placement
/**
 * 非空
 */
var nonEmpty2 = (e) => e.length > 0;
//@ chunk-3s7ydtfd.js:85747-85768 placement
/**
 * 无图表的固定结果
 */
var NO_CHART = {
  kind: "none",
};
//@ chunk-3s7ydtfd.js:85768-85930 placement
/**
 * 复用进行中的会话消息读取，失败时清除缓存。
 */
function cachedTranscript(e, t, o) {
  if (t.transcript && t.transcript !== o) return t.transcript;
  let r = e();
  t.transcript = r;
  r.catch(() => {
    if (t.transcript === r) t.transcript = undefined;
  });
  return r;
}
//@ chunk-3s7ydtfd.js:85930-86506 placement
async function memoizeChartRender(e, cache, o) {
  let { tool_use_id: toolUseId, tool, input, output, isErrored } = o.row;
  if (isErrored || output === undefined || toolUseId === undefined) return NO_CHART;
  let i = cache.chartlessIds.has(toolUseId) ? NO_CHART : cache.charts.get(toolUseId);
  if (i) return i;
  let x = tool !== MCP_EASEL_CHART;
  let hasWholeOutput = x && o.hasWholeOutput;
  let u = cache.autoChartCalls.get(toolUseId);
  if (hasWholeOutput)
    return cacheChart(
      cache,
      toolUseId,
      describeRequestShape(
        toolResultText(output),
        u ?? {
          nowMs: null,
          query: queryTextOf(input),
        },
      ),
    );
  let d = cachedTranscript(e, cache);
  let g = await ((await d).some((_) => _.id === toolUseId) ? d : cachedTranscript(e, cache, d));
  let index = g.findIndex((_) => _.id === toolUseId);
  let L = g[index];
  if (!L) return nonEmpty2(g) ? cacheChart(cache, toolUseId, NO_CHART) : NO_CHART;
  return cacheChart(
    cache,
    toolUseId,
    x
      ? describeRequestShape(
          toolResultText(L.storedResult),
          u ?? {
            nowMs: null,
            query: queryTextOf(L.input),
          },
        )
      : handleChartCall({
          input: L.input,
          results: g.slice(0, index),
          ...readEaselMeta(L.storedResult),
        }),
  );
}
//@ chunk-3s7ydtfd.js:86506-86568 placement
/**
 * 渲染宿主的纵向布局
 */
var renderHostColumn = (e, t, o) =>
  h(
    e.Box,
    {
      flexDirection: "column",
    },
    t.hostRow,
    o,
  );
//@ chunk-3s7ydtfd.js:86568-86827 placement
function formatChartGroupHeader(e) {
  let t = e.callCount > 1;
  return h(
    e.elements.Box,
    {
      flexDirection: "column",
    },
    h(e.elements.Svg, {
      source: e.chart.svg(e.columns),
      alt: e.chart.modelText,
    }),
    t
      ? h(
          e.elements.Text,
          {
            dimColor: true,
          },
          `newest of ${e.callCount} calls: open the group for the rest`,
        )
      : null,
  );
}
//@ chunk-3s7ydtfd.js:86827-86836 placement
/**
 * 6
 */
var PANE_HORIZONTAL_MARGIN = 6;
//@ chunk-3s7ydtfd.js:86836-86905 placement
/**
 * “最新 N 次调用”的提示片段
 */
var autoChartCountHint = (e) => (e > 1 ? `newest of ${e} calls, ctrl+o for the rest \xB7 ` : "");
//@ chunk-3s7ydtfd.js:86905-86976 placement
/**
 * 自动图表脚注
 */
var autoChartFooter = (e) => `auto chart \xB7 ${autoChartCountHint(e)}turn off in /config: Auto charts`;
//@ chunk-3s7ydtfd.js:86976-87010 placement
/**
 * 脚注行
 */
var autoChartFooterLines = (autoCallCount) =>
  autoCallCount === undefined ? [] : [autoChartFooter(autoCallCount)];
//@ chunk-3s7ydtfd.js:87010-87030 placement
/**
 * "  ⏿  "
 */
var TREE_BRANCH_GLYPH = "  \u23BF  ";
//@ chunk-3s7ydtfd.js:87030-87428 placement
function renderChartTitle(e, t) {
  let o = e.columns - PANE_HORIZONTAL_MARGIN;
  return h(
    e.elements.Box,
    {
      flexDirection: "row",
    },
    h(
      e.elements.Text,
      {
        dimColor: true,
      },
      TREE_BRANCH_GLYPH,
    ),
    h(
      e.elements.Text,
      null,
      e.chart
        .terminalRows(o)
        .concat(
          t
            .flatMap((r) => wrapToWidth(r, o))
            .map((text) => [
              {
                text,
                ink: "quiet",
              },
            ]),
        )
        .flatMap((r, s) => [
          s > 0
            ? `
`
            : "",
          ...r.map((p) =>
            h(
              e.elements.Text,
              {
                color: CHART_THEME_COLORS[p.ink].host,
                backgroundColor: p.background && CHART_THEME_COLORS[p.background].host,
                bold: p.ink === "title",
              },
              p.text,
            ),
          ),
        ]),
    ),
  );
}
//@ chunk-3s7ydtfd.js:87428-87560 placement
/**
 * 渲染自动图表：读屏模式输出文本，否则渲染标题与图。
 */
function renderAutoChart(e) {
  let t = autoChartFooterLines(e.autoCallCount);
  return e.isScreenReader
    ? h(
        e.elements.Text,
        null,
        [e.chart.modelText, ...t].join(`
`),
      )
    : renderChartTitle(e, t);
}
//@ chunk-3s7ydtfd.js:87560-88318 placement
/**
 * 为显示中的行重新渲染图表（按视口宽度缓存）。
 */
async function renderChartsForRows(e, t) {
  let { cache, event, rows } = t;
  let columns = event.viewport?.columns;
  for (let m of rows.toReversed()) {
    let n = await memoizeChartRender(async () => collectToolUses(await e.session.messages({})), cache, {
      row: m,
      hasWholeOutput: event.surface === "terminal",
    });
    if (n.kind !== "chart") continue;
    if (event.surface !== "terminal") {
      let i = formatChartGroupHeader({
        elements: e.ui.resolve(event),
        chart: n,
        columns,
        callCount: rows.length,
      });
      return renderHostColumn(e.ui.resolve(event), t, i);
    }
    if (cache.screenReader === "unread") {
      let i = await e.env.get("CLAUDE_AX_SCREEN_READER");
      let x = [];
      for (let source of ["policy", "flag", "user"])
        x.push(
          await e.settings.read({
            source,
          }),
        );
      cache.screenReader = isScreenReaderRequest(i, x) ? "on" : "off";
    }
    let a = m.tool === MCP_EASEL_CHART;
    let f = renderAutoChart({
      elements: e.ui.resolve(event),
      chart: n,
      columns: columns ?? DEFAULT_COLUMNS,
      isScreenReader: cache.screenReader === "on",
      autoCallCount: a ? undefined : rows.length,
    });
    return renderHostColumn(e.ui.resolve(event), t, f);
  }
  return t.hostRow;
}
//@ chunk-3s7ydtfd.js:88318-90767 placement
/**
 * easel 插件注册：维护图表与自动图表状态、读屏器开关，挂接 tool.call/ui.render 钩子。
 */
function registerEasel(e, t, o = {}) {
  let r = o.isReaderOn?.();
  let s = {
    charts: new Map(),
    chartlessIds: new Set(),
    autoChartCalls: new Map(),
    screenReader: r === undefined ? "unread" : r ? "on" : "off",
  };
  let parts = String(t.autoChartSkip ?? "").split(/[\s,]+/);
  let m = (tool) =>
    NON_EASEL_MCP_RE.test(tool) &&
    t.autoCharts !== false &&
    o.isRegulated?.() !== true &&
    !parts.some((i) => tool.startsWith(`mcp__${i}__`));
  let any = parts.some((f) => f !== "");
  let a = t.autoCharts === false ? "off" : any && "skips_servers";
  e("session.start", async (f, i, x) => {
    if (isNonEmpty(await f.session.surfaces())) registerChartTool(f, a, o);
    return x(i);
  });
  e("session.attach", (f, i, x) => {
    registerChartTool(f, a, o);
    return x(i);
  });
  e(
    "prompt.section",
    {
      name: "env_info_simple",
    },
    async (f, i, x) => {
      let l = await x(i);
      return l.text === null
        ? l
        : {
            text: `${l.text}
${CHART_TOOL_HINT}`,
          };
    },
  );
  e(
    "tool.call",
    {
      tool: MCP_EASEL_CHART,
    },
    async (f, i, x) => {
      if (o.isRegulated?.() === true)
        return {
          deny: POLICY_WITHHOLDS_TEXT,
        };
      let { tool, tool_use_id: toolUseId, agentId, consent, $shadowed, ...T } = i;
      let input = mergePlainObject(T, $shadowed);
      s.transcript = undefined;
      let _ = T.data === undefined && agentId === undefined && o.isBatchAwaited?.() === true;
      let w = await waitForToolUses(
        f,
        {
          tool_use_id: toolUseId,
          agentId,
          signal: x.signal,
        },
        _ ? TERMINAL_WIDTH_STEPS : [],
      );
      if (w === undefined)
        return {
          deny: NO_CONVERSATION_MESSAGE,
        };
      let easel = {
        nowMs: await f.clock.now(),
        zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      let startTime = performance.now();
      let et = handleChartCall({
        input,
        results: w,
        ...easel,
      });
      cacheChart(s, toolUseId, et);
      logEaselUsage(f, et.usage, {
        isAsked: true,
        agentId,
        elapsedMs: performance.now() - startTime,
      });
      let modelText = et.modelText;
      return et.kind === "chart"
        ? {
            result: [textResultWithMeta(modelText, easel)],
          }
        : {
            deny: modelText,
          };
    },
  ).catch((error, i) => {
    logEaselUsage(error, FAILED_USAGE, {
      isAsked: true,
      agentId: i.agentId,
      elapsedMs: 0,
    });
    return {
      deny: EASEL_FAILED_MESSAGE,
    };
  });
  e(
    "tool.call",
    {
      tool: NON_EASEL_MCP_RE,
    },
    async (f, i, x) => {
      let l = await x(i);
      s.transcript = undefined;
      if (
        "deny" in l ||
        l.isError ||
        !m(i.tool) ||
        i.agentId !== undefined ||
        !isNonEmpty(await f.session.surfaces())
      )
        return l;
      let d = {
        nowMs: await f.clock.now(),
        query: queryTextOf(i),
      };
      let startTime = performance.now();
      let g = describeRequestShape(toolResultText(l.result), d);
      if (g.kind !== "chart") {
        cacheChart(s, i.tool_use_id, g);
        return l;
      }
      s.autoChartCalls.set(i.tool_use_id, d);
      logEaselUsage(f, g.usage, {
        isAsked: false,
        agentId: i.agentId,
        elapsedMs: performance.now() - startTime,
      });
      return {
        ...l,
        context: withAutoChartHint(l.context),
      };
    },
  ).catch(async (error, i, x) => {
    let l = await x(i);
    logEaselUsage(error, FAILED_USAGE, {
      isAsked: false,
      agentId: i.agentId,
      elapsedMs: 0,
    });
    return l;
  });
  e(
    "ui.render",
    {
      component: "ToolResult",
      surface: "terminal",
      props: {
        tool: MCP_EASEL_CHART,
      },
    },
    async (f, i, x) =>
      (await renderChartsForRows(f, {
        cache: s,
        event: i,
        hostRow: null,
        rows: [
          {
            ...i.props,
            input: undefined,
          },
        ],
      })) ?? x(i),
  );
  e(
    "ui.render",
    {
      component: "ToolUse",
      props: {
        tool: /^mcp__/,
      },
    },
    async (f, i, x) => {
      let { tool } = i.props;
      let rows = (tool === MCP_EASEL_CHART ? isNonTerminalSurface(i.surface) : m(tool)) ? [i.props] : [];
      return renderChartsForRows(f, {
        cache: s,
        event: i,
        hostRow: await x(i),
        rows,
      });
    },
  );
  e(
    "ui.render",
    {
      component: "ToolGroup",
      props: {
        isExpanded: false,
      },
    },
    async (f, i, x) => {
      let rows = i.props.calls.filter((u) => m(u.tool));
      return renderChartsForRows(f, {
        cache: s,
        event: i,
        hostRow: await x(i),
        rows,
      });
    },
  );
}
export { registerEasel };
