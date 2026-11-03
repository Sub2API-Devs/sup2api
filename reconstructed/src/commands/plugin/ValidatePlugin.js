/**
 * commands/plugin/ValidatePlugin.tsx
 *
 * `claude plugin validate`：校验清单与组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/ValidatePlugin.tsx
 * pieces: chunk-vrb44rx7.js (4)
 * attribution: sole-consumer 2, affinity 1, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { resolveValidateTarget, sanitizeForDisplay } from "../../utils/plugins/validatePlugin.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { plural } from "../../utils/stringUtils.js";
import { logError } from "../../utils/log.js";
import { formatAdviceLines, readmeAdviceFor } from "../../services/plugins/pluginReadmeAdvice.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { P } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-vrb44rx7.js:214694-214725 sole-consumer
function Ek(ae) {
  return `${ae}
`;
}
//@ chunk-vrb44rx7.js:214725-214759 sole-consumer
function Dk(Se) {
  return Se.success;
}
//@ chunk-vrb44rx7.js:214759-214803 affinity
function Mk(kt) {
  return kt.warnings.length > 0;
}
//@ chunk-vrb44rx7.js:214803-217501 fingerprint = ValidatePlugin (0.654)
function ValidatePlugin(t0) {
  let C = w(5),
    { onComplete: onComplete, path: path } = t0,
    x,
    T;
  if (C[0] !== onComplete || C[1] !== path)
    ((x = () => {
      let runValidation = async function je() {
        if (!path) {
          onComplete(`Usage: /plugin validate <path>

Validate a plugin or marketplace manifest, or the skills, agents,
and commands in a directory.

Examples:
  /plugin validate .claude-plugin/plugin.json
  /plugin validate /path/to/plugin-directory
  /plugin validate .claude/skills
  /plugin validate .claude
  /plugin validate .

When given a directory, validates .claude-plugin/marketplace.json
or .claude-plugin/plugin.json (both, and the plugin, if both exist).
With no manifest, the components are validated instead: a directory
named skills, agents, or commands validates its own; a directory
named .claude validates the ones inside it; any other directory
validates the ones under .claude, plus its top-level ones if a
.claude-plugin directory or a skills/<name>/SKILL.md marks it as a
plugin checkout.

Or from the command line:
  claude plugin validate <path>`);
          return;
        }
        try {
          let {
            manifest: manifest,
            contents: contents,
            resolvedPath: resolvedPath,
            pluginRoot: pluginRoot,
          } = await resolveValidateTarget(path);
          let V = manifest ? [manifest, ...contents] : contents;
          let B = manifest
            ? `Validating ${manifest.fileType} manifest: ${manifest.filePath}

`
            : `Validating components in: ${resolvedPath}

`;
          for (const _ of V) {
            if (_ !== manifest)
              B =
                B +
                `Validating ${_.fileType}: ${_.filePath}

`;
            if (_.errors.length > 0)
              ((B =
                B +
                `${re.cross} Found ${_.errors.length} ${plural(_.errors.length, "error")}:

`),
                _.errors.forEach((error) => {
                  B =
                    B +
                    `  ${re.pointer} ${error.path}: ${error.message}
`;
                }),
                (B =
                  B +
                  `
`));
            if (_.warnings.length > 0)
              ((B =
                B +
                `${re.warning} Found ${_.warnings.length} ${plural(_.warnings.length, "warning")}:

`),
                _.warnings.forEach((error_0) => {
                  B =
                    B +
                    `  ${re.pointer} ${error_0.path}: ${error_0.message}
`;
                }),
                (B =
                  B +
                  `
`));
            if (_.notes !== void 0)
              (_.notes.forEach((warning) => {
                B =
                  B +
                  `  ${re.pointer} ${warning}
`;
              }),
                (B =
                  B +
                  `
`));
          }
          let me = await import("./chunk-5aas12zq.js");
          let directoryChecksRoot = me.directoryChecksRoot({
            pluginRoot: pluginRoot,
            manifest: manifest,
            resolvedPath: resolvedPath,
          });
          if (directoryChecksRoot !== null) {
            let he;
            try {
              let lintPluginForDirectory = await me.lintPluginForDirectory(directoryChecksRoot);
              he =
                lintPluginForDirectory === null
                  ? []
                  : me.formatDirectoryReport(
                      directoryChecksRoot,
                      lintPluginForDirectory,
                      "claude plugin validate <path> --profile directory",
                    );
            } catch (t3) {
              let rt = t3;
              (logError(rt), (he = me.formatDirectoryChecksFailure(directoryChecksRoot)));
            }
            if (he.length > 0)
              B =
                B +
                (he.join(`
`) +
                  `
`);
          }
          if (
            ((B =
              B +
              formatAdviceLines(await readmeAdviceFor(path, manifest, contents))
                .map(Ek)
                .join("")),
            V.every(Dk))
          )
            ((B =
              B +
              (V.some(Mk)
                ? `${re.tick} Validation passed with warnings
`
                : `${re.tick} Validation passed
`)),
              (process.exitCode = 0));
          else
            ((B =
              B +
              `${re.cross} Validation failed
`),
              (process.exitCode = 1));
          onComplete(B);
        } catch (error) {
          let et = error;
          ((process.exitCode = 2),
            logForDebugging(`Plugin validation failed unexpectedly for ${path}: ${errorMessage(et)}`, {
              level: "error",
            }),
            onComplete(
              `${re.cross} Unexpected error during validation: ${sanitizeForDisplay(errorMessage(et), 200)}`,
            ));
        }
      };
      runValidation();
    }),
      (T = [onComplete, path]),
      (C[0] = onComplete),
      (C[1] = path),
      (C[2] = x),
      (C[3] = T));
  else ((x = C[2]), (T = C[3]));
  P(x, T);
  let D;
  if (C[4] === MEMO_CACHE_SENTINEL)
    ((D = e(Box, { flexDirection: "column", children: e(Text, { children: "Running validation..." }) })),
      (C[4] = D));
  else D = C[4];
  return D;
}

export { ValidatePlugin };
