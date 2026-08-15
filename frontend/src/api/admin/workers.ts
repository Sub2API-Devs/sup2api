import { apiClient } from '../client'

export interface Worker {
  id: number
  name: string
  base_url: string
  remote_worker_id: string
  instance_id: string
  protocol_version: string
  version: string
  status: string
  enabled: boolean
  log_stream_key: string
  last_seen_at?: string
  last_heartbeat_at?: string
  last_heartbeat_latency_ms: number
  consecutive_failures: number
  heartbeat_interval_seconds: number
  heartbeat_timeout_seconds: number
  account_count: number
  log_count: number
  last_error?: string
  created_at: string
  updated_at: string
}

export interface WorkerAccount {
  id: number
  worker_id: number
  remote_account_id: string
  name: string
  kind: 'openai_api_key' | 'openai_oauth' | string
  status: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface WorkerLog {
  id: number
  worker_id: number
  event_id: string
  event_type: string
  instance_id: string
  request_id: string
  channel_id: number
  model_name: string
  worker_created_at: number
  payload: Record<string, unknown>
  consumed_at: string
}

export interface WorkerNATSSecurityConfig {
  authentication_mode: 'nkey_jwt_nsc' | string
  ready: boolean
  worker_url: string
  subject: string
  credential_ttl_days: number
  operator_id: string
  operator_name: string
  account_id: string
  account_name: string
  issuer_configured: boolean
  control_credentials_configured: boolean
}

export interface WorkerAccountInput {
  name: string
  api_key?: string
  base_url?: string
  models?: string
  group?: string
  test_model?: string
}

export async function list(): Promise<Worker[]> {
  const { data } = await apiClient.get<Worker[]>('/admin/workers')
  return data
}

export interface CreateWorkerInput {
  name: string
  base_url: string
  pairing_token?: string
  worker_id?: string
  control_plane_target?: string
  control_plane_insecure: boolean
  nats_url?: string
  enabled: boolean
  heartbeat_interval_seconds: number
  heartbeat_timeout_seconds: number
}

export async function create(input: CreateWorkerInput): Promise<Worker> {
  const { data } = await apiClient.post<Worker>('/admin/workers', input)
  return data
}

export interface WorkerRuntimeConfig {
  worker_id: string
  control_plane_target: string
  control_plane_insecure: boolean
  nats_url: string
}

export interface UpdateWorkerInput {
  name: string
  base_url: string
  control_plane_target?: string
  control_plane_insecure?: boolean
  nats_url?: string
  enabled: boolean
  heartbeat_interval_seconds: number
  heartbeat_timeout_seconds: number
}

export async function getConfig(id: number): Promise<WorkerRuntimeConfig> {
  const { data } = await apiClient.get<WorkerRuntimeConfig>(`/admin/workers/${id}/config`)
  return data
}

export async function update(id: number, input: UpdateWorkerInput): Promise<Worker> {
  const { data } = await apiClient.put<Worker>(`/admin/workers/${id}`, input)
  return data
}

export async function setEnabled(id: number, enabled: boolean): Promise<Worker> {
  const { data } = await apiClient.patch<Worker>(`/admin/workers/${id}/enabled`, { enabled })
  return data
}

export async function remove(id: number): Promise<void> {
  await apiClient.delete(`/admin/workers/${id}`)
}

export async function testConnection(id: number): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<Record<string, unknown>>(`/admin/workers/${id}/test`)
  return data
}

export async function getNATSSecurity(): Promise<WorkerNATSSecurityConfig> {
  const { data } = await apiClient.get<WorkerNATSSecurityConfig>('/admin/workers/nats-security')
  return data
}

export async function updateNATSSecurity(input: {
  worker_url: string
  credential_ttl_days: number
}): Promise<WorkerNATSSecurityConfig> {
  const { data } = await apiClient.put<WorkerNATSSecurityConfig>('/admin/workers/nats-security', input)
  return data
}

export async function listAccounts(id: number): Promise<WorkerAccount[]> {
  const { data } = await apiClient.get<WorkerAccount[]>(`/admin/workers/${id}/accounts`)
  return data
}

export async function createAPIKeyAccount(id: number, input: WorkerAccountInput): Promise<WorkerAccount> {
  const { data } = await apiClient.post<WorkerAccount>(`/admin/workers/${id}/accounts/openai/api-key`, input)
  return data
}

export async function startOAuth(id: number, input: WorkerAccountInput): Promise<{ session_id: string; authorize_url: string; expires_in: number }> {
  const { data } = await apiClient.post<{ session_id: string; authorize_url: string; expires_in: number }>(
    `/admin/workers/${id}/accounts/openai/oauth/start`, input
  )
  return data
}

export async function completeOAuth(id: number, input: { session_id: string; input: string }): Promise<WorkerAccount> {
  const { data } = await apiClient.post<WorkerAccount>(`/admin/workers/${id}/accounts/openai/oauth/complete`, input)
  return data
}

export async function refreshAccount(workerId: number, accountId: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<Record<string, unknown>>(
    `/admin/workers/${workerId}/accounts/${encodeURIComponent(accountId)}/refresh`
  )
  return data
}

export async function testAccount(workerId: number, accountId: string, input: { model?: string; endpoint_type?: string; stream?: boolean } = {}): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<Record<string, unknown>>(
    `/admin/workers/${workerId}/accounts/${encodeURIComponent(accountId)}/test`, input
  )
  return data
}

export async function deleteAccount(workerId: number, accountId: string): Promise<void> {
  await apiClient.delete(`/admin/workers/${workerId}/accounts/${encodeURIComponent(accountId)}`)
}

export async function listLogs(id: number, limit = 50, beforeId?: number): Promise<WorkerLog[]> {
  const { data } = await apiClient.get<WorkerLog[]>(`/admin/workers/${id}/logs`, {
    params: { limit, before_id: beforeId }
  })
  return data
}

export default {
  list,
  create,
  getConfig,
  update,
  setEnabled,
  remove,
  testConnection,
  getNATSSecurity,
  updateNATSSecurity,
  listAccounts,
  createAPIKeyAccount,
  startOAuth,
  completeOAuth,
  refreshAccount,
  testAccount,
  deleteAccount,
  listLogs
}
