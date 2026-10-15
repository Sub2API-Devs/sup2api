import type { TableColumn } from '@sub2api/ui'
import { useGrowthHost } from './host'

// Table columns shared by the user pages and the admin dashboard (which adds
// the user / inviter column).

export function commissionColumns(withInviter = false): TableColumn[] {
  const t = useGrowthHost().t
  return [
    ...(withInviter ? [{ key: 'inviter_user_id', label: t('inviterUserId') }] : []),
    { key: 'invitee_user_id', label: t('inviteeUserId') },
    { key: 'event_type', label: t('eventType') },
    { key: 'base_amount', label: t('baseAmount'), align: 'right' },
    { key: 'commission', label: t('commission'), align: 'right' },
    { key: 'created_at', label: t('createdAt') }
  ]
}

export function checkinColumns(withUser = false): TableColumn[] {
  const t = useGrowthHost().t
  return [
    ...(withUser ? [{ key: 'user_id', label: t('userId') }] : []),
    { key: 'checkin_date', label: t('checkinDate') },
    { key: 'quota_awarded', label: t('quotaAwarded'), align: 'right' },
    { key: 'created_at', label: t('createdAt') }
  ]
}

export function referralColumns(): TableColumn[] {
  const t = useGrowthHost().t
  return [
    { key: 'user_id', label: t('userId') },
    { key: 'code', label: t('code') },
    { key: 'inviter_user_id', label: t('inviterUserId') },
    { key: 'invitees', label: t('invitees') },
    { key: 'commission', label: t('totalCommission'), align: 'right' },
    { key: 'bound_at', label: t('boundAt') }
  ]
}
