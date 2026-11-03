/**
 * utils/plugins/pluginNameCollision.ts
 *
 * 2.1.316 新增：插件名冲突
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { quotedPrintable, printableLabel, printableName } from "../printableName.js";
import { describeNameCollision } from "./crossMarketplaceInstall.js";
import { marketplaceSuffix } from "./pluginIdentifier.js";
import { getOriginalCwdOrNull } from "../../bootstrap/state.js";
import { count, uniq } from "../collections.js";
import { runCommandHint } from "../worktreeResumeHint.js";

//@ chunk-e6aww6q8.js:4432956-4436041 placement
/**
 * 查找名字冲突的插件（忽略大小写，@ 与 . 视为 -）。
 */
function findPluginNameCollision(e) {
  let { refused, askedFor, surface, rootKept = false } = e;
  let holders = e.sharedWith === "installed" ? e.holders : [];
  let S =
    e.sharedWith === "installed"
      ? holders
      : [
          {
            id: e.twin,
            shares: e.shares,
          },
        ];
  let w = (At) => `"${quotedPrintable(At, 200)}"`;
  let mapped = S.map((At) => describeNameCollision(At.id, refused, At.shares));
  let any = mapped.some((At) => At.capitals);
  let q = mapped.some((At) => At.punctuation) ? '"." and "-"' : "";
  let Z = `because ${S.length > 1 ? "their" : "the two"} ids ${mapped.some((At) => At.atSign) ? `are the same once "@" and "." are written as "-"${any ? " and capitals are ignored" : ""}` : any || q !== "" ? `differ only in ${any ? `capitals${q === "" ? "" : ", "}` : ""}${q}` : "give one folder name"}`;
  let Se = S.every((At) => At.shares === "folder")
    ? "its folder"
    : S.every((At) => At.shares === "data")
      ? "its saved data"
      : "its folder or its saved data";
  let ke = refused !== askedFor && (rootKept || holders.some((holder) => holder.id === askedFor));
  let we = ke
    ? `${w(refused)} was not installed: ${w(askedFor)} needs it, but it`
    : refused === askedFor
      ? `${w(refused)} was not installed: it`
      : `${w(askedFor)} was not installed: it needs ${w(refused)}, which`;
  let Ee = ke ? ` ${w(askedFor)} will not load without it.` : "";
  if (e.sharedWith === "same-install" || holders.some((holder) => holder.id === askedFor)) {
    let At = e.sharedWith === "same-install" ? e.twin : askedFor;
    let It =
      marketplaceSuffix(At) === marketplaceSuffix(refused)
        ? "Only the marketplace's maintainer can fix this, by renaming one of them."
        : "Only a maintainer of one of the two marketplaces can fix this, by renaming one of them.";
    return `${we} would share ${Se} with ${w(At)}${At === askedFor ? "" : ", which the same install brings along"}, ${Z}.${Ee} ${It}`;
  }
  let flattened = holders.flatMap((holder) =>
    holder.installations.map((installation) => ({
      id: holder.id,
      ...installation,
    })),
  );
  let Ie = (At) => At.scope === "project" || At.scope === "local";
  let Me = flattened.some(Ie) ? getOriginalCwdOrNull() : null;
  let We = (At) => Ie(At) && (At.projectPath === undefined || At.projectPath !== Me);
  let ze = count(flattened, (At) => At.scope === "managed");
  let lt = holders.length > 1 ? "are" : "is";
  let Je =
    ze > 0 && ze === flattened.length
      ? "which your organization installed"
      : ze > 0
        ? `which ${lt} installed, also by your organization`
        : flattened.length > 0 && flattened.every(We)
          ? `which ${lt} installed in ${uniq(flattened.map((At) => At.projectPath)).length > 1 ? "other projects" : "another project"}`
          : `which ${lt} installed`;
  let nt = new Intl.ListFormat("en", {
    type: "conjunction",
  }).format(holders.map((holder) => w(holder.id)));
  let pt = `${we} would share ${Se} with ${nt}, ${Je}, ${Z}.${Ee}${holders.length > 1 ? "" : " Only one of the two can be installed."}`;
  if (ze > 0 || flattened.length === 0)
    return surface === "notice" && ze > 0
      ? `Ask your administrator: ${pt}`
      : `${pt}${ze > 0 ? " Ask your administrator." : ""}`;
  let Et = uniq(
    flattened.map((At) => {
      let It = `uninstall ${w(At.id)}`;
      if (We(At) && At.projectPath === undefined) return `${It} in the project it is installed for`;
      let Yt =
        surface === "cli"
          ? runCommandHint("plugin uninstall", At.id, {
              extra: At.scope === "user" ? undefined : `--scope ${At.scope}`,
              fallback: It,
            })
          : `${It}${At.scope === "user" || We(At) ? "" : ` at ${At.scope} scope`}${surface === "notice" && !We(At) ? " in /plugin" : ""}`;
      let qt = We(At) ? printableLabel(printableName(At.projectPath ?? "", 200)) : "";
      return We(At) ? `${Yt} in ${qt === "" ? "that project" : qt}` : Yt;
    }),
  );
  let yt = refused === askedFor ? `${w(refused)} instead` : ke ? `${w(refused)} as well` : w(askedFor);
  let gt =
    surface === "cli"
      ? "Uninstalling a plugin also deletes its saved data."
      : `${surface === "ui" ? "When it asks" : "If /plugin asks"}, let it delete the plugin's saved data: the new plugin would otherwise start with it.`;
  return surface === "notice"
    ? `First ${Et.join("; ")}, to install ${yt}. ${gt} ${pt}`
    : `${pt} To install ${yt}, first ${Et.length > 1 ? `do each of these: ${Et.join("; ")}` : Et[0]}. ${gt}`;
}
export { findPluginNameCollision };
