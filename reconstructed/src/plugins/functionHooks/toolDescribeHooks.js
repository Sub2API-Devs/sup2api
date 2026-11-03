/**
 * plugins/functionHooks/toolDescribeHooks.ts
 *
 * 2.1.316 新增：tool.describe 事件钩子（改写工具描述）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { hasModuleHookingSite, getLoadedModulesForSite } from "../hooksModules/loadedModuleFilters.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { toolProvider } from "./providerTiers.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";
import { wellFormedLeaves } from "./ui/validateTree.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  setToolDescribeResolver,
  setToolDescribePresence,
  setToolDescribeBuildPresence,
} from "../../services/api/toolDescriptionCache.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";

//@ chunk-e6aww6q8.js:57418-58251 placement
/**
 * 判断插件是否订阅了 tool.describe 钩子（是则返回次数），配套的 Nyt 记录「已发送」标记、Jto 负责调用钩子并应用返回的 description 与 isDeferred。
 */
var applyToolDescribeHooks = (name) =>
  hasModuleHookingSite(
    "tool.describe",
    name === undefined
      ? undefined
      : {
          tool: name,
        },
    getLoadedModulesForSite("tool.describe"),
  );
var toolDescribeChanged = identity_2(
  {
    isSent: false,
  },
  (e) => {
    e.isSent = false;
  },
);
var applyToolDescribe = (e, n, r) =>
  hasModuleHookingSite("tool.describe", {
    tool: e.name,
  })
    ? toolProvider(e)
        .then(async (provider) => ({
          isCounted: applyToolDescribeHooks(e.name),
          result: await NO_CORE_AT_CHAIN_BOTTOM(
            "tool.describe",
            {},
          )({
            tool: e.name,
            description: n,
            provider,
            ...(r && {
              isDeferred: r,
            }),
          }),
        }))
        .then(({ isCounted, result: h }) => {
          let y = h.isDeferred === true;
          if (y !== r)
            logForDebugging(`tool.describe ${e.name}: a hook set isDeferred ${String(r)} -> ${String(y)}`);
          if ((y !== r || h.description !== wellFormedLeaves(n)) && !isCounted) {
            logForDebugging(
              `tool.describe ${e.name}: the built-in sec-default plugin changed this tool, though its hook should only pass the event on`,
              {
                level: "error",
              },
            );
            if (!toolDescribeChanged.isSent) {
              toolDescribeChanged.isSent = true;
              logFeatureSad("plugin_function_hooks_tool_describe", "sec_default_changed_tool");
            }
          }
          return {
            description: h.description,
            isDeferred: y,
          };
        })
    : Promise.resolve({
        description: n,
        isDeferred: r,
      });
//@ chunk-e6aww6q8.js:58251-58260 placement
setToolDescribeResolver(applyToolDescribe);
//@ chunk-e6aww6q8.js:58260-58317 placement
setToolDescribePresence((e) =>
  hasModuleHookingSite(
    "tool.describe",
    e === undefined
      ? undefined
      : {
          tool: e,
        },
  ),
);
//@ chunk-e6aww6q8.js:58317-58326 placement
setToolDescribeBuildPresence(applyToolDescribeHooks);
//@ chunk-e6aww6q8.js:78028-78212 placement
/**
 * tool.describe 事件定义：核心原样返回描述（延迟加载时带 isDeferred）。
 */
var TOOL_DESCRIBE_EVENT = {
  site: UI_ENV_SITE_RULES["tool.describe"],
  core: {
    name: "core",
    isCore: true,
    budgetMs: 0,
    run: async (e) => {
      let { description, isDeferred } = e;
      return isDeferred === true
        ? {
            description,
            isDeferred,
          }
        : {
            description,
          };
    },
  },
};
export { TOOL_DESCRIBE_EVENT };
