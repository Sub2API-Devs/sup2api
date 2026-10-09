// Runtime images of the per-account containers (GET /system/ccgateway/runtime):
// pure helpers of the "runtime" card, unit-tested apart from the component.
import type { CcgBundledRole, CcgRuntimeImages } from '@/api/types'

export type RuntimeState = 'notInstalled' | 'upToDate' | 'outdated' | 'unknown'
export type RuntimeComponent = 'controller' | 'app' | 'egress'
export const RUNTIME_COMPONENTS: readonly RuntimeComponent[] = ['controller', 'app', 'egress']

export function runtimeState(r: CcgRuntimeImages | null | undefined): RuntimeState {
  if (!r) return 'unknown'
  if (!r.installed) return r.reason ? 'unknown' : 'notInstalled'
  if (RUNTIME_COMPONENTS.some(c => !componentImages(r, c).expected || !componentImages(r, c).installed)) return 'unknown'
  return r.up_to_date ? 'upToDate' : 'outdated'
}

/** First 12 hex characters of an image digest (ref@sha256:…, sha256:… or a bare id); '' when there is none. */
export function shortDigest(ref: string | null | undefined): string {
  const m = /sha256:([0-9a-f]{12})/i.exec(ref || '')
  if (m) return m[1].toLowerCase()
  return /^[0-9a-f]{12,}$/i.test(ref || '') ? ref!.slice(0, 12).toLowerCase() : ''
}

/** Expected and installed image of one component. */
export function componentImages(r: CcgRuntimeImages, c: RuntimeComponent): { expected: string; installed: string } {
  const installed = r.installed ? { controller: r.installed.controller_image, app: r.installed.app_image, egress: r.installed.egress_image }[c] : ''
  return { expected: r.expected?.[c] || '', installed: installed || '' }
}

export function displayImage(ref: string | null | undefined): string {
  return shortDigest(ref) || ref || ''
}

// ---------------------------------------------------------------- bundled images (§53.10)

export const BUNDLED_ROLES: readonly CcgBundledRole[] = ['app', 'egress', 'controller', 'gateway']
/** Roles the panel pushes to the controller; the gateway (Caddy) is only used when installing the controller. */
export const PUSHED_ROLES: readonly CcgBundledRole[] = ['app', 'egress', 'controller']
/**
 * enabled: the controller runs / targets the bundled ref; notEnabled: it reports another image;
 * unknown: the controller state could not be read; installOnly: the gateway image, not pushed by the panel.
 */
export type BundledState = 'enabled' | 'notEnabled' | 'unknown' | 'installOnly'
/** The core gives the push at most 25 minutes; the tab waits a minute longer so the core's own answer arrives. */
export const BUNDLED_TIMEOUT_MS = 26 * 60_000

export function bundledState(r: CcgRuntimeImages, role: CcgBundledRole): BundledState {
  if (role === 'gateway') return 'installOnly'
  const ref = r.bundled?.images[role]
  if (!ref || !r.installed) return 'unknown'
  const installed = { app: r.installed.app_image, egress: r.installed.egress_image, controller: r.installed.controller_image }[role]
  if (!installed) return 'unknown'
  return installed === ref ? 'enabled' : 'notEnabled'
}

/** Every pushed role of the package is already the controller's image. */
export function bundledAllEnabled(r: CcgRuntimeImages): boolean {
  return PUSHED_ROLES.every(role => bundledState(r, role) === 'enabled')
}
