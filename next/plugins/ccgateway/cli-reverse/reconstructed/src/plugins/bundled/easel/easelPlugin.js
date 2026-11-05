/**
 * plugins/bundled/easel/easelPlugin.ts
 *
 * 2.1.316 新增：easel 插件入口：chart 调用处理、自动图表（对工具结果自动作图）与 ui.render 显示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7stfs6p0.js (56)
 * attribution: placement 54, layout 2
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

//@ chunk-7stfs6p0.js:81486-81497 placement
/**
 * 100
 */
var DEFAULT_SVG_WIDTH = 100;
//@ chunk-7stfs6p0.js:81497-81509 placement
/**
 * 1000
 */
var DEFAULT_TERMINAL_ROWS = 1000;
//@ chunk-7stfs6p0.js:81509-81518 placement
/**
 * 2
 */
var UNKNOWN_FIELD_COUNT = 2;
//@ chunk-7stfs6p0.js:81518-81528 placement
/**
 * 40
 */
var MAX_LABEL_CHARS = 40;
//@ chunk-7stfs6p0.js:81528-81537 placement
/**
 * 5
 */
var MAX_LISTED_TBL_ROWS = 5;
//@ chunk-7stfs6p0.js:81537-81547 placement
/**
 * 66
 */
var UNREAD_TEXT_WIDTH = 66;
//@ chunk-7stfs6p0.js:81547-81624 placement
/**
 * 统计非空点数
 */
var countNonNullPoints = (chart) =>
  stableSum(
    chart.series.flatMap((series) => series.samples).map((sample) => (sample.value === null ? 0 : 1)),
  );
//@ chunk-7stfs6p0.js:81624-81768 placement
/**
 * 已绘制图表的用量遥测（形式、格式、系列数、点数、是否省略）。
 */
var drawnUsage = (usage, chart) => ({
  ...usage,
  outcome: "drawn",
  form: chart.form,
  format: formatLabel(chart),
  seriesCount: chart.series.length,
  pointCount: countNonNullPoints(chart),
  hasLeftOut: chart.leftOutNotes.length > 0,
});
//@ chunk-7stfs6p0.js:81768-81828 placement
/**
 * NaN 用默认值，否则向下取整并封顶
 */
var clampRounded = (value, max, fallback) =>
  Number.isNaN(value) ? fallback : Math.min(Math.floor(value), max);
//@ chunk-7stfs6p0.js:81828-82020 placement
/**
 * 由请求与数据生成图表结果：给模型的图例文本、终端行渲染器与 SVG 渲染器。
 */
function buildChartResult(chart, layout, usage) {
  let plan = planChartLayout(chart, layout);
  return {
    kind: "chart",
    modelText: renderLegend(plan).join(`
`),
    terminalRows: (rows) =>
      rasterizeChart(layoutChart(plan, Math.max(0, clampRounded(rows, DEFAULT_TERMINAL_ROWS, 0)))),
    svg: (width = DEFAULT_SVG_WIDTH) =>
      ansiToSvg(
        layoutChart(
          plan,
          Math.max(MIN_PLOT_WIDTH, clampRounded(width, DEFAULT_SVG_WIDTH, DEFAULT_SVG_WIDTH)),
        ),
      ),
    usage: drawnUsage(usage, chart),
  };
}
//@ chunk-7stfs6p0.js:82020-82038 placement
/**
 * 未绘制摘要的行数
 */
var NOT_DRAWN_SUMMARY_LINES = 1 + MAX_TABLE_DESCRIPTION_CHARS + UNKNOWN_FIELD_COUNT * MAX_LISTED_NAMES;
//@ chunk-7stfs6p0.js:82038-82211 placement
/**
 * 未绘制的结果文本（Not drawn + 原因列表，按宽度折行）。
 */
var refusedResult_2 = (outcome, lines, usage) => ({
  kind: "refused",
  modelText: (
    "Not drawn. " +
    elideList(lines, NOT_DRAWN_SUMMARY_LINES, "more line").join(`
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
    ...usage,
    outcome,
  },
});
//@ chunk-7stfs6p0.js:82211-82366 placement
/**
 * x 列是名称而非时间时改画为柱状并加说明。
 */
var redrawAsBars = (chart, form, usage) =>
  buildChartResult(
    {
      ...chart,
      notes: [
        `drawn as bars, not as ${form.form ?? "line"}: ${form.x ?? "x"} holds names, not times`,
        ...chart.notes,
      ],
    },
    asBarsForm(form),
    {
      ...usage,
      isFormReplaced: true,
    },
  );
//@ chunk-7stfs6p0.js:82366-82574 placement
function describeOtherResults(refusal, results, usage) {
  let mapped = results
    .slice(-MAX_LISTED_TBL_ROWS)
    .map(
      ({ id, tool, text }) =>
        `${cleanCellText(id, MAX_LABEL_CHARS)} (${cleanCellText(tool, MAX_LABEL_CHARS)}, ${formatCount(text.length, "character")})`,
    );
  let hasResults = mapped.length > 0;
  return refusedResult_2(
    refusal.code,
    [
      refusal.why +
        (hasResults
          ? `
Or name another tool result:`
          : ""),
      ...mapped,
    ],
    usage,
  );
}
//@ chunk-7stfs6p0.js:82574-82814 placement
var NO_DATA_MESSAGES = (noToolResults) =>
  noToolResults
    ? {
        code: "no_result",
        why: "No tool has answered yet. Pass the rows as data",
      }
    : {
        code: "data_not_found",
        why: "data is neither the id of a tool result nor a table. Pass an id, JSON records, or the text of a CSV, TSV or markdown table",
      };
//@ chunk-7stfs6p0.js:82814-82832 placement
/**
 * 含换行或以 [ { 开头
 */
var JSON_LOOKING_RE = /\n|^[[{]/;
//@ chunk-7stfs6p0.js:82832-82927 placement
/**
 * 取输入里的 JSON 数据文本
 */
function jsonDataFromInput(input) {
  let data = isPlainObject(input) ? input.data : undefined;
  return typeof data === "string" && JSON_LOOKING_RE.test(data.trim()) ? data : undefined;
}
//@ chunk-7stfs6p0.js:82927-82976 placement
/**
 * 补上推导出的格式
 */
var withDerivedFormat = (usage, table, deriveFormat) => ({
  ...usage,
  format: deriveFormat ? formatLabel(table) : usage.format,
});
//@ chunk-7stfs6p0.js:82976-83087 placement
/**
 * y/by 为字符串时包成数组。
 */
function normalizeChartInput(input) {
  return isPlainObject(input)
    ? {
        ...input,
        ...(typeof input.y === "string" && {
          y: [input.y],
        }),
        ...(typeof input.by === "string" && {
          by: [input.by],
        }),
      }
    : input;
}
//@ chunk-7stfs6p0.js:83087-83150 placement
/**
 * share 图默认 combine=sum
 */
var defaultShareCombine = (input) =>
  input.form === "share"
    ? {
        ...input,
        combine: input.combine ?? "sum",
      }
    : input;
//@ chunk-7stfs6p0.js:83150-83903 placement
/**
 * 处理 easel chart 调用：校验输入、选定数据来源（指定结果或上一个工具结果）、绘图并返回说明。
 */
function handleChartCall(event) {
  let input = normalizeChartInput(cleanAllStrings(event.input ?? {}));
  if (!isValidChartInput(input)) return refusedResult_2("bad_call", validateChartInput(input), FAILED_USAGE);
  let request = defaultShareCombine(input);
  let { data: dataRef } = request;
  let filtered = event.results.filter((result) => result.tool !== MCP_EASEL_CHART);
  let usesLastResult = dataRef === undefined;
  let picked = usesLastResult
    ? filtered.findLast((result) => result.text.trim() !== "")
    : filtered.find((result) => result.id === dataRef);
  let results = filtered.filter((result) => result !== picked);
  let inlineJson = jsonDataFromInput(event.input);
  let dataJson = typeof dataRef === "object" ? JSON.stringify(dataRef) : undefined;
  let rawData = dataJson ?? picked?.text ?? inlineJson;
  let usage = failedUsageWithForm(
    request,
    dataJson
      ? "rows"
      : picked
        ? usesLastResult
          ? "last_result"
          : "result_id"
        : inlineJson === undefined
          ? "none"
          : "text",
  );
  if (rawData === undefined) return describeOtherResults(NO_DATA_MESSAGES(usesLastResult), results, usage);
  let options = {
    zone: request.zone === "local" ? event.zone : "UTC",
    nowMs: event.nowMs,
  };
  let chartRequestData = readChartRequestData(rawData, request, options);
  if (chartRequestData.kind === "data") return buildChartResult(chartRequestData, request, usage);
  let attempt = chartRequestData.problem.fitsBars
    ? describeNamesReadAsBars(
        chartRequestData,
        readChartRequestData(rawData, asBarsForm(request), options),
        request,
      )
    : chartRequestData;
  if (attempt.kind === "data") return redrawAsBars(attempt, request, usage);
  let [firstTable, ...otherTables] = attempt.tables;
  return firstTable !== undefined
    ? refusedResult_2(
        attempt.problem.code,
        [attempt.problem.why, ...describeTables(attempt.tables)],
        withDerivedFormat(usage, firstTable, otherTables.length === 0),
      )
    : describeOtherResults(attempt.problem, results, usage);
}
//@ chunk-7stfs6p0.js:83903-84269 placement
function describeRequestShape(input, context) {
  let request = {
    form: "line",
  };
  let chartRequestData = readChartRequestData(input, request, {
    zone: "UTC",
    nowMs: context.nowMs,
  });
  if (!(
    chartRequestData.kind === "data" &&
    chartRequestData.isSeries &&
    chartRequestData.leftOutNotes.length === 0
  ))
    return {
      kind: "none",
    };
  let query = cleanCellText(
    context.query.replaceAll(
      `
`,
      " ",
    ),
  );
  let subject =
    chartRequestData.subject.toLowerCase() === VALUE && query !== "" ? query : chartRequestData.subject;
  return buildChartResult(
    {
      ...chartRequestData,
      subject,
      series: chartRequestData.series.map((series) =>
        series.name === chartRequestData.subject
          ? {
              ...series,
              name: subject,
            }
          : series,
      ),
    },
    request,
    {
      ...FAILED_USAGE,
      dataFrom: "last_result",
    },
  );
}
//@ chunk-7stfs6p0.js:84269-84419 placement
/**
 * 注册 chart 工具（设置了代理时不注册并记录）。
 */
function registerChartTool(host, settings) {
  host.tool.register(CHART_TOOL_DEF).catch((error) =>
    host.ui.log(`no chart tool: ${String(error)}`, {
      to: "debug",
    }),
  );
  if (settings)
    host.telemetry.log(easelSettingsEvent(settings)).catch(() => {
      return;
    });
}
//@ chunk-7stfs6p0.js:84419-84666 placement
/**
 * 记录 easel 遥测（mark 与带界面列表的 log 事件）。
 */
function logEaselUsage(ctx, usage, info) {
  ctx.telemetry.mark(usageEventFor(usage, info.isAsked)).catch(() => {
    return;
  });
  ctx.session
    .surfaces()
    .catch(() => [])
    .then((surfaces) =>
      ctx.telemetry.log(
        buildEaselTelemetryEvent(usage, {
          isAsked: info.isAsked,
          isInSubagent: info.agentId !== undefined,
          surfaces,
          elapsedMs: info.elapsedMs,
        }),
      ),
    )
    .catch(() => {
      return;
    });
}
//@ chunk-7stfs6p0.js:84666-84691 placement
/**
 * 10/20/40/80/160
 */
var TERMINAL_WIDTH_STEPS = [10, 20, 40, 80, 160];
//@ chunk-7stfs6p0.js:84691-84702 placement
/**
 * 256
 */
var MAX_CACHED_CHARTS = 256;
//@ chunk-7stfs6p0.js:84702-84712 placement
/**
 * 80
 */
var DEFAULT_COLUMNS = 80;
//@ chunk-7stfs6p0.js:84712-84894 placement
/**
 * 缓存图表结果（满了淘汰最后一个），无图表时记入 chartlessIds。
 */
function cacheChart(cache, toolUseId, chart) {
  if (chart.kind === "none") {
    cache.chartlessIds.add(toolUseId);
    return chart;
  }
  let last = [...cache.charts.keys()].at(-1);
  if (cache.charts.size >= MAX_CACHED_CHARTS && last !== undefined) cache.charts.delete(last);
  cache.charts.set(toolUseId, chart);
  return chart;
}
//@ chunk-7stfs6p0.js:84894-84928 placement
/**
 * 合并普通对象
 */
var mergePlainObject = (base, extra) => ({
  ...base,
  ...(isPlainObject(extra) && extra),
});
//@ chunk-7stfs6p0.js:84928-84981 placement
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
//@ chunk-7stfs6p0.js:84981-85008 placement
/**
 * 不是终端渲染
 */
var isNonTerminalSurface = (surface) => surface !== "terminal";
//@ chunk-7stfs6p0.js:85008-85031 placement
/**
 * 非空
 */
var isNonEmpty = (value) => value.length > 0;
//@ chunk-7stfs6p0.js:85031-85060 placement
/**
 * 0/false/no/off
 */
var FALSEY_RE = /^(0|false|no|off)$/i;
//@ chunk-7stfs6p0.js:85060-85088 placement
/**
 * 1/true/yes/on
 */
var TRUTHY_RE = /^(1|true|yes|on)$/i;
//@ chunk-7stfs6p0.js:85088-85115 placement
/**
 * 非 easel 的 MCP 工具名
 */
var NON_EASEL_MCP_RE = /^mcp__(?!easel__)/;
//@ chunk-7stfs6p0.js:85115-85131 layout
var NON_WORD_RE = /[^\w-]/;
//@ chunk-7stfs6p0.js:85131-85253 placement
/**
 * 从工具输入的 query/expr/query_expr 中取第一个非空查询文本。
 */
function queryTextOf(input) {
  return (
    ["query", "expr", "query_expr"]
      .flatMap((key) => selectPath(input, key))
      .find((value) => typeof value === "string" && value.trim() !== "") ?? ""
  );
}
//@ chunk-7stfs6p0.js:85253-85279 placement
/**
 * 追加自动图表提示
 */
var withAutoChartHint = (context) => [...(context ?? []), AUTO_CHART_HINT];
//@ chunk-7stfs6p0.js:85279-85417 placement
/**
 * 是否按读屏模式输出图表。
 */
function isScreenReaderRequest(flag, toolResults) {
  let normalized = flag?.trim() ?? "";
  let matches = FALSEY_RE.test(normalized);
  let found = toolResults.find((result) => result.axScreenReader !== undefined);
  return matches ? false : TRUTHY_RE.test(normalized) || found?.axScreenReader === true;
}
//@ chunk-7stfs6p0.js:85417-85561 placement
/**
 * 读结果里的 _meta.easel（nowMs、时区，默认 UTC）。
 */
function readEaselMeta(storedResult) {
  let [meta] = selectPath(storedResult, "0._meta.easel");
  let { nowMs, zone } = isPlainObject(meta) ? meta : {};
  return {
    nowMs: typeof nowMs === "number" ? nowMs : null,
    zone: typeof zone === "string" ? zone : "UTC",
  };
}
//@ chunk-7stfs6p0.js:85561-85584 placement
/**
 * 非空
 */
var nonEmpty2 = (value) => value.length > 0;
//@ chunk-7stfs6p0.js:85584-85605 placement
/**
 * 无图表的固定结果
 */
var NO_CHART = {
  kind: "none",
};
//@ chunk-7stfs6p0.js:85605-85767 placement
/**
 * 复用进行中的会话消息读取，失败时清除缓存。
 */
function cachedTranscript(load, cache, generation) {
  if (cache.transcript && cache.transcript !== generation) return cache.transcript;
  let promise = load();
  cache.transcript = promise;
  promise.catch(() => {
    if (cache.transcript === promise) cache.transcript = undefined;
  });
  return promise;
}
//@ chunk-7stfs6p0.js:85767-86343 placement
async function memoizeChartRender(loadTranscript, cache, options) {
  let { tool_use_id: toolUseId, tool, input, output, isErrored } = options.row;
  if (isErrored || output === undefined || toolUseId === undefined) return NO_CHART;
  let cached = cache.chartlessIds.has(toolUseId) ? NO_CHART : cache.charts.get(toolUseId);
  if (cached) return cached;
  let isOtherTool = tool !== MCP_EASEL_CHART;
  let hasWholeOutput = isOtherTool && options.hasWholeOutput;
  let autoChartCall = cache.autoChartCalls.get(toolUseId);
  if (hasWholeOutput)
    return cacheChart(
      cache,
      toolUseId,
      describeRequestShape(
        toolResultText(output),
        autoChartCall ?? {
          nowMs: null,
          query: queryTextOf(input),
        },
      ),
    );
  let transcript = cachedTranscript(loadTranscript, cache);
  let entries = await ((await transcript).some((entry) => entry.id === toolUseId)
    ? transcript
    : cachedTranscript(loadTranscript, cache, transcript));
  let index = entries.findIndex((entry) => entry.id === toolUseId);
  let entry = entries[index];
  if (!entry) return nonEmpty2(entries) ? cacheChart(cache, toolUseId, NO_CHART) : NO_CHART;
  return cacheChart(
    cache,
    toolUseId,
    isOtherTool
      ? describeRequestShape(
          toolResultText(entry.storedResult),
          autoChartCall ?? {
            nowMs: null,
            query: queryTextOf(entry.input),
          },
        )
      : handleChartCall({
          input: entry.input,
          results: entries.slice(0, index),
          ...readEaselMeta(entry.storedResult),
        }),
  );
}
//@ chunk-7stfs6p0.js:86343-86667 layout
async function resolveToolName(loadTranscript, cache, row) {
  let { tool_use_id: toolUseId, tool } = row;
  if (!NON_WORD_RE.test(tool) || toolUseId === undefined) return row;
  let cachedName = cache.calledTools.get(toolUseId);
  if (cachedName !== undefined)
    return {
      ...row,
      tool: cachedName,
    };
  cache.earlierTools ??= loadTranscript().then(
    (calls) => new Map(calls.map((call) => [call.id, call.tool])),
    (error) => {
      cache.earlierTools = undefined;
      throw error;
    },
  );
  let recordedName = (await cache.earlierTools).get(toolUseId);
  return recordedName === undefined
    ? row
    : {
        ...row,
        tool: recordedName,
      };
}
//@ chunk-7stfs6p0.js:86667-86729 placement
/**
 * 渲染宿主的纵向布局
 */
var renderHostColumn = (host, props, header) =>
  h(
    host.Box,
    {
      flexDirection: "column",
    },
    props.hostRow,
    header,
  );
//@ chunk-7stfs6p0.js:86729-86988 placement
function formatChartGroupHeader(props) {
  let hasManyCalls = props.callCount > 1;
  return h(
    props.elements.Box,
    {
      flexDirection: "column",
    },
    h(props.elements.Svg, {
      source: props.chart.svg(props.columns),
      alt: props.chart.modelText,
    }),
    hasManyCalls
      ? h(
          props.elements.Text,
          {
            dimColor: true,
          },
          `newest of ${props.callCount} calls: open the group for the rest`,
        )
      : null,
  );
}
//@ chunk-7stfs6p0.js:86988-86997 placement
/**
 * 6
 */
var PANE_HORIZONTAL_MARGIN = 6;
//@ chunk-7stfs6p0.js:86997-87066 placement
/**
 * “最新 N 次调用”的提示片段
 */
var autoChartCountHint = (callCount) =>
  callCount > 1 ? `newest of ${callCount} calls, ctrl+o for the rest \xB7 ` : "";
//@ chunk-7stfs6p0.js:87066-87137 placement
/**
 * 自动图表脚注
 */
var autoChartFooter = (callCount) =>
  `auto chart \xB7 ${autoChartCountHint(callCount)}turn off in /config: Auto charts`;
//@ chunk-7stfs6p0.js:87137-87171 placement
/**
 * 脚注行
 */
var autoChartFooterLines = (callCount) => (callCount === undefined ? [] : [autoChartFooter(callCount)]);
//@ chunk-7stfs6p0.js:87171-87191 placement
/**
 * "  ⏿  "
 */
var TREE_BRANCH_GLYPH = "  \u23BF  ";
//@ chunk-7stfs6p0.js:87191-87589 placement
function renderChartTitle(props, footerLines) {
  let width = props.columns - PANE_HORIZONTAL_MARGIN;
  return h(
    props.elements.Box,
    {
      flexDirection: "row",
    },
    h(
      props.elements.Text,
      {
        dimColor: true,
      },
      TREE_BRANCH_GLYPH,
    ),
    h(
      props.elements.Text,
      null,
      props.chart
        .terminalRows(width)
        .concat(
          footerLines
            .flatMap((line) => wrapToWidth(line, width))
            .map((text) => [
              {
                text,
                ink: "quiet",
              },
            ]),
        )
        .flatMap((row, rowIndex) => [
          rowIndex > 0
            ? `
`
            : "",
          ...row.map((cell) =>
            h(
              props.elements.Text,
              {
                color: CHART_THEME_COLORS[cell.ink].host,
                backgroundColor: cell.background && CHART_THEME_COLORS[cell.background].host,
                bold: cell.ink === "title",
              },
              cell.text,
            ),
          ),
        ]),
    ),
  );
}
//@ chunk-7stfs6p0.js:87589-87721 placement
/**
 * 渲染自动图表：读屏模式输出文本，否则渲染标题与图。
 */
function renderAutoChart(props) {
  let footerLines = autoChartFooterLines(props.autoCallCount);
  return props.isScreenReader
    ? h(
        props.elements.Text,
        null,
        [props.chart.modelText, ...footerLines].join(`
`),
      )
    : renderChartTitle(props, footerLines);
}
//@ chunk-7stfs6p0.js:87721-88559 placement
/**
 * 为显示中的行重新渲染图表（按视口宽度缓存）。
 */
async function renderChartsForRows(host, group) {
  let { cache, event } = group;
  let columns = event.viewport?.columns;
  let loadTranscript = async () => collectToolUses(await host.session.messages({}));
  let filtered = (
    await Promise.all(group.rows.map((row) => resolveToolName(loadTranscript, cache, row)))
  ).filter((row) => group.isCharted(row.tool));
  for (let row of filtered.toReversed()) {
    let chart = await memoizeChartRender(loadTranscript, cache, {
      row,
      hasWholeOutput: event.surface === "terminal",
    });
    if (chart.kind !== "chart") continue;
    if (event.surface !== "terminal") {
      let header = formatChartGroupHeader({
        elements: host.ui.resolve(event),
        chart,
        columns,
        callCount: filtered.length,
      });
      return renderHostColumn(host.ui.resolve(event), group, header);
    }
    if (cache.screenReader === "unread") {
      let envValue = await host.env.get("CLAUDE_AX_SCREEN_READER");
      let settingsSources = [];
      for (let source of ["policy", "flag", "user"])
        settingsSources.push(
          await host.settings.read({
            source,
          }),
        );
      cache.screenReader = isScreenReaderRequest(envValue, settingsSources) ? "on" : "off";
    }
    let isManualCall = row.tool === MCP_EASEL_CHART;
    let element = renderAutoChart({
      elements: host.ui.resolve(event),
      chart,
      columns: columns ?? DEFAULT_COLUMNS,
      isScreenReader: cache.screenReader === "on",
      autoCallCount: isManualCall ? undefined : filtered.length,
    });
    return renderHostColumn(host.ui.resolve(event), group, element);
  }
  return group.hostRow;
}
//@ chunk-7stfs6p0.js:88559-91081 placement
/**
 * easel 插件注册：维护图表与自动图表状态、读屏器开关，挂接 tool.call/ui.render 钩子。
 */
function registerEasel(on, settings, env = {}) {
  let readerOn = env.isReaderOn?.();
  let cache = {
    charts: new Map(),
    chartlessIds: new Set(),
    autoChartCalls: new Map(),
    calledTools: new Map(),
    screenReader: readerOn === undefined ? "unread" : readerOn ? "on" : "off",
  };
  let parts = String(settings.autoChartSkip ?? "").split(/[\s,]+/);
  let shouldChart = (toolName) =>
    NON_EASEL_MCP_RE.test(toolName) &&
    settings.autoCharts !== false &&
    env.isRegulated?.() !== true &&
    !parts.some((skipServer) => toolName.startsWith(`mcp__${skipServer}__`));
  let any = parts.some((skipServer) => skipServer !== "");
  let autoChartMode = settings.autoCharts === false ? "off" : any && "skips_servers";
  on("session.start", async (ctx, payload, next) => {
    if (isNonEmpty(await ctx.session.surfaces())) registerChartTool(ctx, autoChartMode);
    return next(payload);
  });
  on("session.attach", (ctx, payload, next) => {
    registerChartTool(ctx, autoChartMode);
    return next(payload);
  });
  on(
    "prompt.section",
    {
      name: "env_info_simple",
    },
    async (ctx, payload, next) => {
      let section = await next(payload);
      return section.text === null
        ? section
        : {
            text: `${section.text}
${CHART_TOOL_HINT}`,
          };
    },
  );
  on(
    "tool.call",
    {
      tool: MCP_EASEL_CHART,
    },
    async (ctx, payload, next) => {
      if (env.isRegulated?.() === true)
        return {
          deny: POLICY_WITHHOLDS_TEXT,
        };
      let { tool, tool_use_id: toolUseId, agentId, consent, $shadowed, ...rest } = payload;
      let input = mergePlainObject(rest, $shadowed);
      cache.transcript = undefined;
      cache.calledTools.set(toolUseId, MCP_EASEL_CHART);
      let isBatch = rest.data === undefined && agentId === undefined && env.isBatchAwaited?.() === true;
      let toolResults = await waitForToolUses(
        ctx,
        {
          tool_use_id: toolUseId,
          agentId,
          signal: next.signal,
        },
        isBatch ? TERMINAL_WIDTH_STEPS : [],
      );
      if (toolResults === undefined)
        return {
          deny: NO_CONVERSATION_MESSAGE,
        };
      let easel = {
        nowMs: await ctx.clock.now(),
        zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      let startTime = performance.now();
      let result = handleChartCall({
        input,
        results: toolResults,
        ...easel,
      });
      cacheChart(cache, toolUseId, result);
      logEaselUsage(ctx, result.usage, {
        isAsked: true,
        agentId,
        elapsedMs: performance.now() - startTime,
      });
      let modelText = result.modelText;
      return result.kind === "chart"
        ? {
            result: [textResultWithMeta(modelText, easel)],
          }
        : {
            deny: modelText,
          };
    },
  ).catch((error, payload) => {
    logEaselUsage(error, FAILED_USAGE, {
      isAsked: true,
      agentId: payload.agentId,
      elapsedMs: 0,
    });
    return {
      deny: EASEL_FAILED_MESSAGE,
    };
  });
  on(
    "tool.call",
    {
      tool: NON_EASEL_MCP_RE,
    },
    async (ctx, payload, next) => {
      if (payload.agentId === undefined) cache.calledTools.set(payload.tool_use_id, payload.tool);
      let result = await next(payload);
      cache.transcript = undefined;
      if (
        "deny" in result ||
        result.isError ||
        !shouldChart(payload.tool) ||
        payload.agentId !== undefined ||
        !isNonEmpty(await ctx.session.surfaces())
      )
        return result;
      let context = {
        nowMs: await ctx.clock.now(),
        query: queryTextOf(payload),
      };
      let startTime = performance.now();
      let shape = describeRequestShape(toolResultText(result.result), context);
      if (shape.kind !== "chart") {
        cacheChart(cache, payload.tool_use_id, shape);
        return result;
      }
      cache.autoChartCalls.set(payload.tool_use_id, context);
      logEaselUsage(ctx, shape.usage, {
        isAsked: false,
        agentId: payload.agentId,
        elapsedMs: performance.now() - startTime,
      });
      return {
        ...result,
        context: withAutoChartHint(result.context),
      };
    },
  ).catch(async (error, payload, next) => {
    let result = await next(payload);
    logEaselUsage(error, FAILED_USAGE, {
      isAsked: false,
      agentId: payload.agentId,
      elapsedMs: 0,
    });
    return result;
  });
  on(
    "ui.render",
    {
      component: "ToolResult",
      surface: "terminal",
      props: {
        tool: MCP_EASEL_CHART,
      },
    },
    async (ctx, payload, next) =>
      (await renderChartsForRows(ctx, {
        cache,
        event: payload,
        hostRow: null,
        rows: [
          {
            ...payload.props,
            input: undefined,
          },
        ],
        isCharted: () => true,
      })) ?? next(payload),
  );
  on(
    "ui.render",
    {
      component: "ToolUse",
      props: {
        tool: [/^mcp__/, NON_WORD_RE],
      },
    },
    async (ctx, payload, next) =>
      renderChartsForRows(ctx, {
        cache,
        event: payload,
        hostRow: await next(payload),
        rows: [payload.props],
        isCharted: (toolName) =>
          toolName === MCP_EASEL_CHART ? isNonTerminalSurface(payload.surface) : shouldChart(toolName),
      }),
  );
  on(
    "ui.render",
    {
      component: "ToolGroup",
      props: {
        isExpanded: false,
      },
    },
    async (ctx, payload, next) =>
      renderChartsForRows(ctx, {
        cache,
        event: payload,
        hostRow: await next(payload),
        rows: payload.props.calls,
        isCharted: shouldChart,
      }),
  );
}
export { registerEasel };
