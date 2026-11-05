/**
 * plugins/functionHooks/toolDescribeHooks.ts
 *
 * 2.1.316 新增：tool.describe 事件钩子（改写工具描述）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hasModuleHookingSite, getLoadedModulesForSite } from "../hooksModules/loadedModuleFilters.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { isLoneSecDefaultShortcut } from "./modAdmission.js";
import { wellFormedLeaves } from "./ui/validateTree.js";
import { toolProvider } from "./providerTiers.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  setToolDescribeResolver,
  setToolDescribePresence,
  setToolDescribeBuildPresence,
} from "../../services/api/toolDescriptionCache.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:59874-60780 placement
/**
 * 判断插件是否订阅了 tool.describe 钩子（是则返回次数），配套的 Nyt 记录「已发送」标记、Jto 负责调用钩子并应用返回的 description 与 isDeferred。
 */
var applyToolDescribeHooks; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var toolDescribeChanged;
var applyToolDescribe;
deferInit("chunk-5xgkngpb.js:59874", () => {
  applyToolDescribeHooks = (name) =>
    hasModuleHookingSite(
      "tool.describe",
      name === undefined
        ? undefined
        : {
            tool: name,
          },
      getLoadedModulesForSite("tool.describe"),
    );
  toolDescribeChanged = identity_2(
    {
      isSent: false,
    },
    (state) => {
      state.isSent = false;
    },
  );
  applyToolDescribe = (tool, description, isDeferred) =>
    !hasModuleHookingSite("tool.describe", {
      tool: tool.name,
    })
      ? Promise.resolve({
          description,
          isDeferred,
        })
      : isLoneSecDefaultShortcut("tool.describe")
        ? Promise.resolve({
            description: wellFormedLeaves(description),
            isDeferred,
          })
        : toolProvider(tool)
            .then(async (provider) => ({
              isCounted: applyToolDescribeHooks(tool.name),
              result: await NO_CORE_AT_CHAIN_BOTTOM(
                "tool.describe",
                {},
              )({
                tool: tool.name,
                description,
                provider,
                ...(isDeferred && {
                  isDeferred,
                }),
              }),
            }))
            .then(({ isCounted, result }) => {
              let nextIsDeferred = result.isDeferred === true;
              if (nextIsDeferred !== isDeferred)
                logForDebugging(
                  `tool.describe ${tool.name}: a hook set isDeferred ${String(isDeferred)} -> ${String(nextIsDeferred)}`,
                );
              if (
                (nextIsDeferred !== isDeferred || result.description !== wellFormedLeaves(description)) &&
                !isCounted
              ) {
                logForDebugging(
                  `tool.describe ${tool.name}: the built-in sec-default plugin changed this tool, though its hook should only pass the event on`,
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
                description: result.description,
                isDeferred: nextIsDeferred,
              };
            });
});
//@ chunk-5xgkngpb.js:60780-60789 placement
// deferred: uses setToolDescribeResolver (../../services/api/toolDescriptionCache.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:60780", () => {
  setToolDescribeResolver(applyToolDescribe);
});
//@ chunk-5xgkngpb.js:60789-60846 placement
// deferred: uses setToolDescribePresence (../../services/api/toolDescriptionCache.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:60789", () => {
  setToolDescribePresence((toolName) =>
    hasModuleHookingSite(
      "tool.describe",
      toolName === undefined
        ? undefined
        : {
            tool: toolName,
          },
    ),
  );
});
//@ chunk-5xgkngpb.js:60846-60855 placement
// deferred: uses setToolDescribeBuildPresence (../../services/api/toolDescriptionCache.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:60846", () => {
  setToolDescribeBuildPresence(applyToolDescribeHooks);
});
//@ chunk-5xgkngpb.js:80578-80762 placement
/**
 * tool.describe 事件定义：核心原样返回描述（延迟加载时带 isDeferred）。
 */
var TOOL_DESCRIBE_EVENT; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:80578", () => {
  TOOL_DESCRIBE_EVENT = {
    site: UI_ENV_SITE_RULES["tool.describe"],
    core: {
      name: "core",
      isCore: true,
      budgetMs: 0,
      run: async (request) => {
        let { description, isDeferred } = request;
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
});
export { TOOL_DESCRIBE_EVENT };
