import { useOptionalT } from '@/composables/optionalText'

// Shapes and labels shared by the upgrade page and its step lanes.

export interface UpgradeStep { step_id: number; node_id: string; action: string; status: string; error?: string }
export interface UpgradeEvent { id: number; kind: string; message: string; created_at: string }

/** `label(group, value)`: upgrades.<group>.<value> when translated, else the raw value. */
export function useUpgradeLabel() {
  const tr = useOptionalT()
  return (group: string, value: string) => tr(`upgrades.${group}.${value}`, undefined, value)
}
