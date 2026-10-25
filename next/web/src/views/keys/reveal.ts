import { api } from '@sub2api/host'

/** The full key of the caller's API key (audited as apikey.reveal). */
export const revealKey = async (id: number) => (await api.post<{ key: string }>(`/me/api-keys/${id}/reveal`, {})).key
