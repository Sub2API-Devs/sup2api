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
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { plural } from "../../utils/stringUtils.js";
import { logError } from "../../utils/log.js";
import { formatAdviceLines, readmeAdviceFor } from "../../services/plugins/pluginReadmeAdvice.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { P } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-vrb44rx7.js:214694-214725 sole-consumer
function withTrailingNewline(ae) {
  return `${ae}
`;
}
//@ chunk-vrb44rx7.js:214725-214759 sole-consumer
function succeededResult(Se) {
  return Se.success;
}
//@ chunk-vrb44rx7.js:214759-214803 affinity
function hasWarnings(kt) {
  return kt.warnings.length > 0;
}
//@ chunk-vrb44rx7.js:214803-217501 fingerprint = ValidatePlugin (0.654)
function ValidatePlugin(props) {
  let $ = w(5);
  let { onComplete, path } = props;
  let t1;
  let t2;
  if ($[0] !== onComplete || $[1] !== path) {
    t1 = () => {
      let runValidation = async function runValidation() {
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
          let { manifest, contents, resolvedPath, pluginRoot } = await resolveValidateTarget(path);
          let V = manifest ? [manifest, ...contents] : contents;
          let output = manifest
            ? `Validating ${manifest.fileType} manifest: ${manifest.filePath}

`
            : `Validating components in: ${resolvedPath}

`;
          for (const result of V) {
            if (result !== manifest)
              output =
                output +
                `Validating ${result.fileType}: ${result.filePath}

`;
            if (result.errors.length > 0) {
              output =
                output +
                `${figures_default.cross} Found ${result.errors.length} ${plural(result.errors.length, "error")}:

`;
              result.errors.forEach((error) => {
                output =
                  output +
                  `  ${figures_default.pointer} ${error.path}: ${error.message}
`;
              });
              output =
                output +
                `
`;
            }
            if (result.warnings.length > 0) {
              output =
                output +
                `${figures_default.warning} Found ${result.warnings.length} ${plural(result.warnings.length, "warning")}:

`;
              result.warnings.forEach((warning) => {
                output =
                  output +
                  `  ${figures_default.pointer} ${warning.path}: ${warning.message}
`;
              });
              output =
                output +
                `
`;
            }
            if (result.notes !== undefined) {
              result.notes.forEach((warning) => {
                output =
                  output +
                  `  ${figures_default.pointer} ${warning}
`;
              });
              output =
                output +
                `
`;
            }
          }
          let me = await import("./chunk-5aas12zq.js");
          let ne = me.directoryChecksRoot({
            pluginRoot,
            manifest,
            resolvedPath,
          });
          if (ne !== null) {
            let he;
            try {
              let Oe = await me.lintPluginForDirectory(ne);
              he =
                Oe === null
                  ? []
                  : me.formatDirectoryReport(ne, Oe, "claude plugin validate <path> --profile directory");
            } catch (error) {
              let rt = error;
              logError(rt);
              he = me.formatDirectoryChecksFailure(ne);
            }
            if (he.length > 0)
              output =
                output +
                (he.join(`
`) +
                  `
`);
          }
          output =
            output +
            formatAdviceLines(await readmeAdviceFor(path, manifest, contents))
              .map(withTrailingNewline)
              .join("");
          if (V.every(succeededResult)) {
            output =
              output +
              (V.some(hasWarnings)
                ? `${figures_default.tick} Validation passed with warnings
`
                : `${figures_default.tick} Validation passed
`);
            process.exitCode = 0;
          } else {
            output =
              output +
              `${figures_default.cross} Validation failed
`;
            process.exitCode = 1;
          }
          onComplete(output);
        } catch (error) {
          let error_2 = error;
          process.exitCode = 2;
          logForDebugging(`Plugin validation failed unexpectedly for ${path}: ${errorMessage(error_2)}`, {
            level: "error",
          });
          onComplete(
            `${figures_default.cross} Unexpected error during validation: ${sanitizeForDisplay(errorMessage(error_2), 200)}`,
          );
        }
      };
      runValidation();
    };
    t2 = [onComplete, path];
    $[0] = onComplete;
    $[1] = path;
    $[2] = t1;
    $[3] = t2;
  } else {
    t1 = $[2];
    t2 = $[3];
  }
  P(t1, t2);
  let t3;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default(Text, {
        children: "Running validation...",
      }),
    });
    $[4] = t3;
  } else t3 = $[4];
  return t3;
}
export { ValidatePlugin };
