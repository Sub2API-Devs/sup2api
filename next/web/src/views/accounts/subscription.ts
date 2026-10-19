// Display name of an account's subscription type (CONTRACTS §59): the
// known Claude plans by name, anything else as reported.
const NAMES: Record<string, string> = { max: 'Max', pro: 'Pro', team: 'Team', enterprise: 'Enterprise' }

export function subscriptionLabel(value: string | null | undefined): string {
  if (!value) return ''
  return NAMES[value] ?? value
}
