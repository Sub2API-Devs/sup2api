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

/**
 * 从主目录启动时，收集与 Windows 卷挂载相关的启动位置事实，用于遥测。
 */
//@ chunk-nyy5qxew.js:341-585 placement
function launchLocationFacts(e, o) {
  if (e !== "launched_from_home") return {};
  try {
    return {
      ...(refusedOnlyAsProfileOnMountWithoutDrive(o) && {
        only_refused_by: lit("windows_profile_on_mount_without_drive"),
      }),
      ...(launchTouchesWindowsVolumeMountedTwice(o) && { on_volume_mounted_twice: !0 }),
      ...(launchTouchesWindowsVolumeBesideUnreadMount(o) && { mount_source_unread: !0 }),
    };
  } catch (error) {
    return (logError(toError(error)), {});
  }
}

export { launchLocationFacts };
