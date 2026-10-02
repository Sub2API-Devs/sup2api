import type { Rollout } from './types'
export interface ShellNode {
  node_id: string; release_digest: string; mode: string; ready: boolean
  last_seen: string; enabled: boolean; stopped: boolean; error?: string
  shell_boot_id?: string; core_boot_id?: string; route_revision?: number
  cpu_percent?: number | null; offloading?: boolean
}
export interface Release { digest: string; manifest: { release_id: string; build_id: string; source_commit: string; created_at: string } }
export interface PluginRelease extends Rollout { created_at: string; updated_at: string; created_by?: number | null }
export interface PluginHistory { id: number; plugin_key: string; rollout_id?: number; node_id: string; boot_id: string; state: string; version: string; message: string; created_at: string }
