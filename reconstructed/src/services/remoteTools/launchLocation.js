/**
 * services/remoteTools/launchLocation.ts
 *
 * 2.1.316 新增：启动位置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nyy5qxew.js (1)
 * attribution: placement 1
 */
import {
  refusedOnlyAsProfileOnMountWithoutDrive,
  launchTouchesWindowsVolumeMountedTwice,
  launchTouchesWindowsVolumeBesideUnreadMount,
} from "./servingGates.js";
import { lit } from "../analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";

//@ chunk-nyy5qxew.js:341-585 placement
/**
 * 从主目录启动时，收集与 Windows 卷挂载相关的启动位置事实，用于遥测。
 */
function launchLocationFacts(launchLocation, cwd) {
  if (launchLocation !== "launched_from_home") return {};
  try {
    return {
      ...(refusedOnlyAsProfileOnMountWithoutDrive(cwd) && {
        only_refused_by: lit("windows_profile_on_mount_without_drive"),
      }),
      ...(launchTouchesWindowsVolumeMountedTwice(cwd) && {
        on_volume_mounted_twice: true,
      }),
      ...(launchTouchesWindowsVolumeBesideUnreadMount(cwd) && {
        mount_source_unread: true,
      }),
    };
  } catch (error) {
    logError(toError(error));
    return {};
  }
}
export { launchLocationFacts };
