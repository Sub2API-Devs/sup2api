/**
 * utils/plugins/pluginNameCollision.ts
 *
 * 2.1.316 新增：插件名冲突
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
import { quotedPrintable, printableLabel, printableName } from "../printableName.js";
import { describeNameCollision } from "./crossMarketplaceInstall.js";
import { marketplaceSuffix } from "./pluginIdentifier.js";
import { getOriginalCwdOrNull } from "../../bootstrap/state.js";
import { countWhere } from "../collections.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { runCommandHint } from "../worktreeResumeHint.js";

//@ chunk-5xgkngpb.js:4539605-4542693 placement
/**
 * 查找名字冲突的插件（忽略大小写，@ 与 . 视为 -）。
 */
function findPluginNameCollision(options) {
  let { refused, askedFor, surface, rootKept = false } = options;
  let holders = options.sharedWith === "installed" ? options.holders : [];
  let mouth =
    options.sharedWith === "installed"
      ? holders
      : [
          {
            id: options.twin,
            shares: options.shares,
          },
        ];
  let quoteId = (id) => `"${quotedPrintable(id, 200)}"`;
  let mapped = mouth.map((holder) => describeNameCollision(holder.id, refused, holder.shares));
  let any = mapped.some((described) => described.capitals);
  let punctuationNote = mapped.some((described) => described.punctuation) ? '"." and "-"' : "";
  let sharedText = `because ${mouth.length > 1 ? "their" : "the two"} ids ${mapped.some((described) => described.atSign) ? `are the same once "@" and "." are written as "-"${any ? " and capitals are ignored" : ""}` : any || punctuationNote !== "" ? `differ only in ${any ? `capitals${punctuationNote === "" ? "" : ", "}` : ""}${punctuationNote}` : "give one folder name"}`;
  let sharedWhat = mouth.every((holder) => holder.shares === "folder")
    ? "its folder"
    : mouth.every((holder) => holder.shares === "data")
      ? "its saved data"
      : "its folder or its saved data";
  let rootAlsoHeld = refused !== askedFor && (rootKept || holders.some((holder) => holder.id === askedFor));
  let message = rootAlsoHeld
    ? `${quoteId(refused)} was not installed: ${quoteId(askedFor)} needs it, but it`
    : refused === askedFor
      ? `${quoteId(refused)} was not installed: it`
      : `${quoteId(askedFor)} was not installed: it needs ${quoteId(refused)}, which`;
  let dependentNote = rootAlsoHeld ? ` ${quoteId(askedFor)} will not load without it.` : "";
  if (options.sharedWith === "same-install" || holders.some((holder) => holder.id === askedFor)) {
    let other = options.sharedWith === "same-install" ? options.twin : askedFor;
    let fixNote =
      marketplaceSuffix(other) === marketplaceSuffix(refused)
        ? "Only the marketplace's maintainer can fix this, by renaming one of them."
        : "Only a maintainer of one of the two marketplaces can fix this, by renaming one of them.";
    return `${message} would share ${sharedWhat} with ${quoteId(other)}${other === askedFor ? "" : ", which the same install brings along"}, ${sharedText}.${dependentNote} ${fixNote}`;
  }
  let flattened = holders.flatMap((holder) =>
    holder.installations.map((installation) => ({
      id: holder.id,
      ...installation,
    })),
  );
  let isProjectScope = (installation) => installation.scope === "project" || installation.scope === "local";
  let cwd = flattened.some(isProjectScope) ? getOriginalCwdOrNull() : null;
  let inOtherProject = (installation) =>
    isProjectScope(installation) &&
    (installation.projectPath === undefined || installation.projectPath !== cwd);
  let managedCount = countWhere(flattened, (installation) => installation.scope === "managed");
  let isOrAre = holders.length > 1 ? "are" : "is";
  let holderPhrase =
    managedCount > 0 && managedCount === flattened.length
      ? "which your organization installed"
      : managedCount > 0
        ? `which ${isOrAre} installed, also by your organization`
        : flattened.length > 0 && flattened.every(inOtherProject)
          ? `which ${isOrAre} installed in ${normalizeCaseForComparison_2(flattened.map((installation) => installation.projectPath)).length > 1 ? "other projects" : "another project"}`
          : `which ${isOrAre} installed`;
  let holderList = new Intl.ListFormat("en", {
    type: "conjunction",
  }).format(holders.map((holder) => quoteId(holder.id)));
  let coreMessage = `${message} would share ${sharedWhat} with ${holderList}, ${holderPhrase}, ${sharedText}.${dependentNote}${holders.length > 1 ? "" : " Only one of the two can be installed."}`;
  if (managedCount > 0 || flattened.length === 0)
    return surface === "notice" && managedCount > 0
      ? `Ask your administrator: ${coreMessage}`
      : `${coreMessage}${managedCount > 0 ? " Ask your administrator." : ""}`;
  let steps = normalizeCaseForComparison_2(
    flattened.map((installation) => {
      let step = `uninstall ${quoteId(installation.id)}`;
      if (inOtherProject(installation) && installation.projectPath === undefined)
        return `${step} in the project it is installed for`;
      let step_2 =
        surface === "cli"
          ? runCommandHint("plugin uninstall", installation.id, {
              extra: installation.scope === "user" ? undefined : `--scope ${installation.scope}`,
              fallback: step,
            })
          : `${step}${installation.scope === "user" || inOtherProject(installation) ? "" : ` at ${installation.scope} scope`}${surface === "notice" && !inOtherProject(installation) ? " in /plugin" : ""}`;
      let projectLabel = inOtherProject(installation)
        ? printableLabel(printableName(installation.projectPath ?? "", 200))
        : "";
      return inOtherProject(installation)
        ? `${step_2} in ${projectLabel === "" ? "that project" : projectLabel}`
        : step_2;
    }),
  );
  let targetLabel =
    refused === askedFor
      ? `${quoteId(refused)} instead`
      : rootAlsoHeld
        ? `${quoteId(refused)} as well`
        : quoteId(askedFor);
  let dataNote =
    surface === "cli"
      ? "Uninstalling a plugin also deletes its saved data."
      : `${surface === "ui" ? "When it asks" : "If /plugin asks"}, let it delete the plugin's saved data: the new plugin would otherwise start with it.`;
  return surface === "notice"
    ? `First ${steps.join("; ")}, to install ${targetLabel}. ${dataNote} ${coreMessage}`
    : `${coreMessage} To install ${targetLabel}, first ${steps.length > 1 ? `do each of these: ${steps.join("; ")}` : steps[0]}. ${dataNote}`;
}
export { findPluginNameCollision };
