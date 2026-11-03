/**
 * utils/pluginActivity.ts
 *
 * 2.1.316 新增：插件活动
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { stripCombiningRepeated } from "./sanitization.js";
import { printablePluginName } from "../components/ManagedSettingsSecurityDialog/utils.js";
import { truncateToLength } from "./stringUtils.js";
import { truncateToWidth } from "./format.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { parsePluginServerName } from "./plugins/lspPluginIntegration.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { parsePluginIdentifier, mbr } from "./plugins/pluginIdentifier.js";
import { logForDebugging } from "./debug.js";

//@ chunk-e6aww6q8.js:876906-876958 placement
var gCo = ["hook", "skill", "subagent", "command", "mcp"];
//@ chunk-e6aww6q8.js:876958-876997 placement
function Nqs(e) {
  return gCo.includes(e);
}
//@ chunk-e6aww6q8.js:876997-877016 placement
var hCo = 30,
  yCo = 200;
//@ chunk-e6aww6q8.js:877016-877093 placement
function Cet(e, n) {
  let r = stripCombiningRepeated(printablePluginName(e)),
    s = truncateToLength(r, yCo);
  return truncateToWidth(s, Math.max(hCo - n, 1));
}
/**
 * 插件活动标签（技能、命令、工作流、代理、钩子）。
 */
//@ chunk-e6aww6q8.js:877093-877537 placement
function activityLabel({ kind: kind, name: n }) {
  switch (kind) {
    case "skill":
      return `${Cet(n, bunStringWidth(" skill"))} skill`;
    case "command": {
      let h = bunStringWidth("/") + bunStringWidth(" command");
      return `/${Cet(n, h)} command`;
    }
    case "workflow": {
      let h = bunStringWidth("/") + bunStringWidth(" workflow");
      return `/${Cet(n, h)} workflow`;
    }
    case "agent":
      return `${Cet(n, bunStringWidth(" agent"))} agent`;
    case "hook":
      return `${Cet(n, bunStringWidth(" hook"))} hook`;
    case "mcp-server": {
      let r = parsePluginServerName(n)?.serverName ?? n,
        s = " MCP server";
      return `${Cet(r, bunStringWidth(" MCP server"))} MCP server`;
    }
  }
}
//@ chunk-e6aww6q8.js:877537-877601 placement
function SCo(e, n) {
  return n && e.startsWith(n) ? e.slice(n.length) : e;
}
/**
 * 命令或技能的活动描述。
 */
//@ chunk-e6aww6q8.js:877601-877830 placement
function commandActivity(e, n) {
  let r = e.kind === "workflow" ? `${n}:` : e.name.slice(0, e.name.lastIndexOf(":") + 1),
    s = e.userFacingName?.() ?? e.name,
    h = SCo(s, r);
  return {
    kind: e.kind === "workflow" ? "workflow" : e.loadedFrom === "plugin" ? "skill" : "command",
    name: h,
  };
}
//@ chunk-e6aww6q8.js:877830-877847 placement
var $Ht = 64,
  fFo = 6;
//@ chunk-e6aww6q8.js:877847-877906 placement
function HHt(e, n) {
  return `${e}\x00${(n ?? "").toLowerCase()}`;
}
/**
 * 记录插件活动（钩子、MCP）。
 */
//@ chunk-e6aww6q8.js:877906-878450 placement
function recordPluginActivity(e, n, r) {
  let s = getPluginRegistry(),
    { name: h, marketplace: marketplace } = parsePluginIdentifier(e);
  if (r.kind !== "hook" && !mbr(marketplace)) {
    let S = activityLabel(r),
      w = HHt(h, marketplace),
      filtered = (s.pluginActivityFeatures.get(w) ?? []).filter((q) => q !== S);
    (filtered.push(S), s.pluginActivityFeatures.set(w, filtered.slice(-fFo)));
  }
  if (
    (n === "hook" || n === "mcp") &&
    s.recentActivity.some((S) => S.trigger === n && S.name === h && S.marketplace === marketplace)
  )
    return;
  if (
    (s.recentActivity.push({ name: h, marketplace: marketplace, trigger: n, ts: Date.now() }),
    s.recentActivity.length > $Ht)
  )
    s.recentActivity = s.recentActivity.slice(-$Ht);
  logForDebugging(`pluginActivity: recorded ${n} for ${h}`, { level: "verbose" });
}
//@ chunk-e6aww6q8.js:878450-878521 placement
function $qs(e, n) {
  return getPluginRegistry().pluginActivityFeatures.get(HHt(e, n)) ?? [];
}
//@ chunk-e6aww6q8.js:878521-878616 placement
function pFo(e) {
  let n = getPluginRegistry(),
    filtered = n.recentActivity.filter((s) => s.ts > e);
  return ((n.recentActivity = []), filtered);
}

export { recordPluginActivity, Cet, fFo, Nqs, $qs, pFo, commandActivity };
