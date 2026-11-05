/**
 * commands/plugin/PluginTag.tsx
 *
 * 2.1.316 新增：/plugin tag：为插件创建 {name}--v{version} git 标签（可推送、试运行）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wb51jffc.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { tagPluginRelease, formatTagName, createPluginGitTag } from "../../services/plugins/pluginTag.js";
import { warningLine } from "./SkillDoctor.js";
import { useEffect, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wb51jffc.js:212858-213153 placement
var PLUGIN_TAG_USAGE = `Usage: /plugin tag [path] [--push] [--dry-run] [-f|--force]

Create a {name}--v{version} git tag for the plugin at <path> (default: .).
Validates plugin.json and any enclosing marketplace entry agree on the version.

For -m/--message and --remote, use the CLI: claude plugin tag --help`;
//@ chunk-wb51jffc.js:213153-214738 placement
/**
 * 校验插件并创建/推送版本标签。
 */
function PluginTagFlow(props) {
  let $ = useMemoCache(9);
  let { onComplete, path, push, dryRun, force, unknownFlag } = props;
  let runTag;
  let deps;
  if (
    $[0] !== dryRun ||
    $[1] !== force ||
    $[2] !== onComplete ||
    $[3] !== path ||
    $[4] !== push ||
    $[5] !== unknownFlag
  ) {
    runTag = () => {
      runTag();
      async function runTag() {
        if (unknownFlag !== undefined) {
          onComplete(
            unknownFlag === "--help" || unknownFlag === "-h"
              ? PLUGIN_TAG_USAGE
              : `${figures_default.cross} Unexpected argument "${unknownFlag}".

${PLUGIN_TAG_USAGE}`,
          );
          return;
        }
        let tagResult = await tagPluginRelease(path ?? ".", {
          force,
        });
        let mapped = tagResult.warnings.map(warningLine);
        if (!tagResult.ok) {
          mapped.push(`${figures_default.cross} ${tagResult.error}`);
          onComplete(
            mapped.join(`
`),
          );
          return;
        }
        let { plan } = tagResult;
        mapped.push(`Plugin:  ${plan.pluginName}`, `Version: ${plan.version} (from ${plan.versionFrom})`);
        if (plan.marketplace)
          mapped.push(
            `Marketplace entry: plugins[${plan.marketplace.entryIndex}] in ${plan.marketplace.path}` +
              (plan.marketplace.entryVersion ? ` (version: ${plan.marketplace.entryVersion})` : ""),
          );
        mapped.push(`Tag:     ${plan.tag}`, "");
        let pushCommand = `git -C ${plan.gitRoot} push ${force ? "--force " : ""}origin refs/tags/${plan.tag}`;
        if (dryRun) {
          mapped.push(
            `${figures_default.tick} Dry run \u2014 would create tag ${plan.tag} at HEAD in ${plan.gitRoot}`,
            `  git -C ${plan.gitRoot} tag ${force ? "-f " : ""}-a ${plan.tag} -m "${formatTagName(plan, undefined)}"`,
            `  ${pushCommand}`,
          );
          onComplete(
            mapped.join(`
`),
          );
          return;
        }
        let pluginGitTag = await createPluginGitTag(plan, {
          push,
          force,
          message: undefined,
          remote: "origin",
          allowGitTerminalPrompt: false,
        });
        if (!pluginGitTag.ok) {
          mapped.push(`${figures_default.cross} ${pluginGitTag.error}`);
          onComplete(
            mapped.join(`
`),
          );
          return;
        }
        mapped.push(`${figures_default.tick} Created tag ${plan.tag}`);
        mapped.push(
          pluginGitTag.pushed ? `${figures_default.tick} Pushed to origin` : `  Push with: ${pushCommand}`,
        );
        mapped.push("", "For -m/--message and --remote, use: claude plugin tag --help");
        onComplete(
          mapped.join(`
`),
        );
      }
    };
    deps = [onComplete, path, push, dryRun, force, unknownFlag];
    $[0] = dryRun;
    $[1] = force;
    $[2] = onComplete;
    $[3] = path;
    $[4] = push;
    $[5] = unknownFlag;
    $[6] = runTag;
    $[7] = deps;
  } else {
    runTag = $[6];
    deps = $[7];
  }
  useEffect(runTag, deps);
  let footer;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    footer = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default(Text, {
        children: "Preparing tag\u2026",
      }),
    });
    $[8] = footer;
  } else footer = $[8];
  return footer;
}
//@ chunk-wb51jffc.js:214738-214742 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:214738", () => {
  init_react_production();
});
export { PluginTagFlow };
