/**
 * utils/model/deprecatedModels.ts
 *
 * 2.1.316 新增：已弃用/已退役模型表（Sonnet 4.5、Opus 4.1 等的退役日期）与提示词段落
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1yv1s0pm.js (3)
 * attribution: placement 3
 */
import { realpath } from "fs/promises";
import { homedir } from "os";
import { sep } from "path";
import { hm } from "../pathPrefix.js";
import { ripGrep } from "../ripgrep.js";
import { withDeadline } from "../sleep.js";
import { kW } from "../attachments/fileAttachments.js";

/**
 * 弃用/退役模型族表（名称、id、状态、日期）。
 */
//@ chunk-1yv1s0pm.js:11938-13795 placement
var DEPRECATED_MODEL_FAMILIES = [
    {
      family: "sonnet-4-5",
      name: "Claude Sonnet 4.5",
      ids: ["claude-sonnet-4-5", "claude-sonnet-4-5-20250929"],
      status: "deprecated",
      date: "2026-11-30",
      current: "SONNET_ID",
    },
    {
      family: "opus-4-1",
      name: "Claude Opus 4.1",
      ids: ["claude-opus-4-1", "claude-opus-4-1-20250805"],
      status: "retired",
      date: "2026-08-05",
      current: "OPUS_ID",
    },
    {
      family: "opus-4-0",
      name: "Claude Opus 4",
      ids: ["claude-opus-4-0", "claude-opus-4-20250514"],
      status: "retired",
      date: "2026-06-15",
      current: "OPUS_ID",
    },
    {
      family: "sonnet-4-0",
      name: "Claude Sonnet 4",
      ids: ["claude-sonnet-4-0", "claude-sonnet-4-20250514"],
      status: "retired",
      date: "2026-06-15",
      current: "SONNET_ID",
    },
    {
      family: "haiku-3",
      name: "Claude Haiku 3",
      ids: ["claude-3-haiku-20240307"],
      status: "retired",
      date: "2026-04-20",
      current: "HAIKU_ID",
    },
    {
      family: "sonnet-3-7",
      name: "Claude Sonnet 3.7",
      ids: ["claude-3-7-sonnet-latest", "claude-3-7-sonnet-20250219"],
      status: "retired",
      date: "2026-02-19",
      current: "SONNET_ID",
    },
    {
      family: "haiku-3-5",
      name: "Claude Haiku 3.5",
      ids: ["claude-3-5-haiku-latest", "claude-3-5-haiku-20241022"],
      status: "retired",
      date: "2026-02-19",
      current: "HAIKU_ID",
    },
    {
      family: "opus-3",
      name: "Claude Opus 3",
      ids: ["claude-3-opus-latest", "claude-3-opus-20240229"],
      status: "retired",
      date: "2026-01-05",
      current: "OPUS_ID",
    },
    {
      family: "sonnet-3-5",
      name: "Claude Sonnet 3.5",
      ids: ["claude-3-5-sonnet-latest", "claude-3-5-sonnet-20241022", "claude-3-5-sonnet-20240620"],
      status: "retired",
      date: "2025-10-28",
      current: "SONNET_ID",
    },
    {
      family: "sonnet-3",
      name: "Claude Sonnet 3",
      ids: ["claude-3-sonnet-20240229"],
      status: "retired",
      date: "2025-07-21",
      current: "SONNET_ID",
    },
    {
      family: "claude-2",
      name: "Claude 2",
      ids: ["claude-2.1", "claude-2.0"],
      status: "retired",
      date: "2025-07-21",
      current: "OPUS_ID",
    },
  ],
  _ = new Map(DEPRECATED_MODEL_FAMILIES.flatMap((e) => e.ids.map((id) => [id, e.family]))),
  A = { OPUS_ID: "Opus", SONNET_ID: "Sonnet", HAIKU_ID: "Haiku" },
  T = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
/**
 * 用 ripgrep 在项目中查找对弃用模型 id 的引用。
 */
//@ chunk-1yv1s0pm.js:13795-14902 placement
async function grepForDeprecatedModels(e, a, r, o = 1000) {
  let [f, t] = await Promise.all([realpath(e).catch(() => e), realpath(homedir()).catch(() => homedir())]);
  if (hm(f, t, !0)) return { families: [], timedOut: !1, cancelled: !1 };
  let timeout = AbortSignal.timeout(o),
    any = AbortSignal.any([r, timeout]),
    h = ripGrep(
      [
        "--no-config",
        "--line-buffered",
        "--only-matching",
        "--with-filename",
        "--null",
        "--no-line-number",
        "--no-heading",
        "--max-count",
        "20",
        "--max-filesize",
        "1M",
        "--max-depth",
        "8",
        ...["node_modules", "site-packages", "dist-packages", "vendor", "third_party", "*.lock"].flatMap(
          (n) => ["-g", `!${n}`],
        ),
        "-e",
        `[A-Za-z0-9._]*(?:${[..._.keys()].map((n) => n.replaceAll(".", "\\.")).join("|")})[A-Za-z0-9@_-]*`,
      ],
      e,
      any,
      { rawLines: !0 },
    );
  h.catch(() => {});
  let O =
      (await withDeadline(h, o * 1.5).catch((n) => {
        if (any.aborted) return [];
        throw n;
      })) ?? [],
    aborted = timeout.aborted,
    aborted_2 = r.aborted,
    d = new Set(),
    C = e.endsWith(sep) ? e : `${e}${sep}`,
    y = new Map(),
    g = !1;
  for (let n of O) {
    let index = n.indexOf("\x00"),
      k = !g;
    if (((g = index === -1), index === -1 || !k)) continue;
    let sliced = n.slice(0, index),
      m = _.get(n.slice(index + 1));
    if (!sliced.startsWith(C) || m === void 0 || d.has(m)) continue;
    let c = y.get(sliced);
    if (c === void 0) ((c = kW(sliced, a)), y.set(sliced, c));
    if (!c) {
      if ((d.add(m), d.size === DEPRECATED_MODEL_FAMILIES.length)) break;
    }
  }
  return { families: [...d].sort(), timedOut: aborted, cancelled: aborted_2 };
}
//@ chunk-1yv1s0pm.js:14902-16074 placement
function formatDeprecatedModelsSection(e, a, r, o = new Date().toISOString().slice(0, 10)) {
  return `## Deprecated or Retired Models in This Project

Files in this project name these Claude API models, which are deprecated or retired:

${DEPRECATED_MODEL_FAMILIES.filter((t) => e.includes(t.family)).map((t) => {
  let format = T.format(new Date(`${t.date}T00:00:00Z`));
  return `- ${t.name} (${t.ids.map((id) => `\`${id}\``).join(", ")}): ${t.status === "deprecated" && o <= t.date ? `deprecated; it retires on ${format}` : `retired on ${format}, so Claude API requests to it fail`}. Current ${A[t.current]} model: \`${a[t.current]}\`.`;
}).join(`
`)}

The first time you read, write, or run code that calls one of these models, tell the user once, briefly, in one short note that covers all of them: each model's status and date${r ? ", the current model, and that `/claude-api migrate` can make the switch" : " and the current model"}. Mentions only in docs, changelogs, tests, or third-party code are not worth raising. Leave model IDs already in the user's code as they are unless the user asks you to change them or to fix errors they cause; new code you write uses current models. These dates are the Claude API's; Amazon Bedrock and Google Cloud set their own schedules.`;
}
