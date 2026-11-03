/**
 * commands/plugin/PluginTag.tsx
 *
 * 2.1.316 新增：/plugin tag：为插件创建 {name}--v{version} git 标签（可推送、试运行）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrb44rx7.js (3)
 * attribution: placement 3
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { tagPluginRelease, formatTagName, createPluginGitTag } from "../../services/plugins/pluginTag.js";
import { warningLine } from "./SkillDoctor.js";
import { P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-vrb44rx7.js:212810-213105 placement
var PLUGIN_TAG_USAGE = `Usage: /plugin tag [path] [--push] [--dry-run] [-f|--force]

Create a {name}--v{version} git tag for the plugin at <path> (default: .).
Validates plugin.json and any enclosing marketplace entry agree on the version.

For -m/--message and --remote, use the CLI: claude plugin tag --help`;
//@ chunk-vrb44rx7.js:213105-214690 placement
/**
 * 校验插件并创建/推送版本标签。
 */
function PluginTagFlow(props) {
  let U = w(9);
  let { onComplete, path, push: C, dryRun, force, unknownFlag } = props;
  let L;
  let A;
  if (
    U[0] !== dryRun ||
    U[1] !== force ||
    U[2] !== onComplete ||
    U[3] !== path ||
    U[4] !== C ||
    U[5] !== unknownFlag
  ) {
    L = () => {
      K();
      async function K() {
        if (unknownFlag !== undefined) {
          onComplete(
            unknownFlag === "--help" || unknownFlag === "-h"
              ? PLUGIN_TAG_USAGE
              : `${figures_default.cross} Unexpected argument "${unknownFlag}".

${PLUGIN_TAG_USAGE}`,
          );
          return;
        }
        let V = await tagPluginRelease(path ?? ".", {
          force,
        });
        let mapped = V.warnings.map(warningLine);
        if (!V.ok) {
          mapped.push(`${figures_default.cross} ${V.error}`);
          onComplete(
            mapped.join(`
`),
          );
          return;
        }
        let { plan } = V;
        mapped.push(`Plugin:  ${plan.pluginName}`, `Version: ${plan.version} (from ${plan.versionFrom})`);
        if (plan.marketplace)
          mapped.push(
            `Marketplace entry: plugins[${plan.marketplace.entryIndex}] in ${plan.marketplace.path}` +
              (plan.marketplace.entryVersion ? ` (version: ${plan.marketplace.entryVersion})` : ""),
          );
        mapped.push(`Tag:     ${plan.tag}`, "");
        let J = `git -C ${plan.gitRoot} push ${force ? "--force " : ""}origin refs/tags/${plan.tag}`;
        if (dryRun) {
          mapped.push(
            `${figures_default.tick} Dry run \u2014 would create tag ${plan.tag} at HEAD in ${plan.gitRoot}`,
            `  git -C ${plan.gitRoot} tag ${force ? "-f " : ""}-a ${plan.tag} -m "${formatTagName(plan, undefined)}"`,
            `  ${J}`,
          );
          onComplete(
            mapped.join(`
`),
          );
          return;
        }
        let pluginGitTag = await createPluginGitTag(plan, {
          push: C,
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
        mapped.push(pluginGitTag.pushed ? `${figures_default.tick} Pushed to origin` : `  Push with: ${J}`);
        mapped.push("", "For -m/--message and --remote, use: claude plugin tag --help");
        onComplete(
          mapped.join(`
`),
        );
      }
    };
    A = [onComplete, path, C, dryRun, force, unknownFlag];
    U[0] = dryRun;
    U[1] = force;
    U[2] = onComplete;
    U[3] = path;
    U[4] = C;
    U[5] = unknownFlag;
    U[6] = L;
    U[7] = A;
  } else {
    L = U[6];
    A = U[7];
  }
  P(L, A);
  let fe;
  if (U[8] === MEMO_CACHE_SENTINEL) {
    fe = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default(Text, {
        children: "Preparing tag\u2026",
      }),
    });
    U[8] = fe;
  } else fe = U[8];
  return fe;
}
//@ chunk-vrb44rx7.js:214690-214694 placement
init_react_production();
export { PluginTagFlow };
