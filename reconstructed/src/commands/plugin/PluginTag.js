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
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { tagPluginRelease, formatTagName, createPluginGitTag } from "../../services/plugins/pluginTag.js";
import { wk } from "./SkillDoctor.js";
import { P, j } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-vrb44rx7.js:212810-213105 placement
var PLUGIN_TAG_USAGE = `Usage: /plugin tag [path] [--push] [--dry-run] [-f|--force]

Create a {name}--v{version} git tag for the plugin at <path> (default: .).
Validates plugin.json and any enclosing marketplace entry agree on the version.

For -m/--message and --remote, use the CLI: claude plugin tag --help`;
/**
 * 校验插件并创建/推送版本标签。
 */
//@ chunk-vrb44rx7.js:213105-214690 placement
function PluginTagFlow(i) {
  let U = w(9),
    {
      onComplete: onComplete,
      path: path,
      push: C,
      dryRun: dryRun,
      force: force,
      unknownFlag: unknownFlag,
    } = i,
    L,
    A;
  if (
    U[0] !== dryRun ||
    U[1] !== force ||
    U[2] !== onComplete ||
    U[3] !== path ||
    U[4] !== C ||
    U[5] !== unknownFlag
  )
    ((L = () => {
      K();
      async function K() {
        if (unknownFlag !== void 0) {
          onComplete(
            unknownFlag === "--help" || unknownFlag === "-h"
              ? PLUGIN_TAG_USAGE
              : `${re.cross} Unexpected argument "${unknownFlag}".

${PLUGIN_TAG_USAGE}`,
          );
          return;
        }
        let V = await tagPluginRelease(path ?? ".", { force: force });
        let mapped = V.warnings.map(wk);
        if (!V.ok) {
          (mapped.push(`${re.cross} ${V.error}`),
            onComplete(
              mapped.join(`
`),
            ));
          return;
        }
        let { plan: plan } = V;
        if (
          (mapped.push(`Plugin:  ${plan.pluginName}`, `Version: ${plan.version} (from ${plan.versionFrom})`),
          plan.marketplace)
        )
          mapped.push(
            `Marketplace entry: plugins[${plan.marketplace.entryIndex}] in ${plan.marketplace.path}` +
              (plan.marketplace.entryVersion ? ` (version: ${plan.marketplace.entryVersion})` : ""),
          );
        mapped.push(`Tag:     ${plan.tag}`, "");
        let J = `git -C ${plan.gitRoot} push ${force ? "--force " : ""}origin refs/tags/${plan.tag}`;
        if (dryRun) {
          (mapped.push(
            `${re.tick} Dry run \u2014 would create tag ${plan.tag} at HEAD in ${plan.gitRoot}`,
            `  git -C ${plan.gitRoot} tag ${force ? "-f " : ""}-a ${plan.tag} -m "${formatTagName(plan, void 0)}"`,
            `  ${J}`,
          ),
            onComplete(
              mapped.join(`
`),
            ));
          return;
        }
        let pe = await createPluginGitTag(plan, {
          push: C,
          force: force,
          message: void 0,
          remote: "origin",
          allowGitTerminalPrompt: !1,
        });
        if (!pe.ok) {
          (mapped.push(`${re.cross} ${pe.error}`),
            onComplete(
              mapped.join(`
`),
            ));
          return;
        }
        (mapped.push(`${re.tick} Created tag ${plan.tag}`),
          mapped.push(pe.pushed ? `${re.tick} Pushed to origin` : `  Push with: ${J}`),
          mapped.push("", "For -m/--message and --remote, use: claude plugin tag --help"),
          onComplete(
            mapped.join(`
`),
          ));
      }
    }),
      (A = [onComplete, path, C, dryRun, force, unknownFlag]),
      (U[0] = dryRun),
      (U[1] = force),
      (U[2] = onComplete),
      (U[3] = path),
      (U[4] = C),
      (U[5] = unknownFlag),
      (U[6] = L),
      (U[7] = A));
  else ((L = U[6]), (A = U[7]));
  P(L, A);
  let fe;
  if (U[8] === MEMO_CACHE_SENTINEL)
    ((fe = e(Box, { flexDirection: "column", children: e(Text, { children: "Preparing tag\u2026" }) })),
      (U[8] = fe));
  else fe = U[8];
  return fe;
}
//@ chunk-vrb44rx7.js:214690-214694 placement
j();

export { PluginTagFlow };
