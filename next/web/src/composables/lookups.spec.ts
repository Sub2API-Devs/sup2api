import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { get } }))

// lookups.ts caches module-wide: every test gets a fresh copy (and the
// ApiError class of that copy, which isApiError checks against).
async function fresh() {
  vi.resetModules()
  const { ApiError } = await import('@sub2api/host')
  return { ...(await import('./lookups')), ApiError }
}

describe('environment variables lookup', () => {
  // Braces: a function returned from beforeEach runs as its teardown.
  beforeEach(() => {
    get.mockReset()
  })

  const variables = [{ key: 'relay_timeout_seconds', layers: ['global', 'group', 'account'] }, { key: 'global_only', layers: ['global'] }]

  it('shows a layer only when it has variables', async () => {
    get.mockResolvedValue({ variables, process: {} })
    const { useEnvironmentLayer, useEnvironmentVariables } = await fresh()
    const account = useEnvironmentLayer('account')
    expect(account.value).toBe(false) // still loading
    await useEnvironmentVariables().ready
    expect(account.value).toBe(true)
    get.mockResolvedValue({ variables: [variables[1]], process: {} })
    const again = await fresh()
    await again.useEnvironmentVariables().ready
    expect(again.useEnvironmentLayer('account').value).toBe(false)
    expect(again.useEnvironmentLayer('global').value).toBe(true)
  })

  it('remembers a 403 and hides every layer without asking again', async () => {
    const { useEnvironmentLayer, useEnvironmentVariables, ApiError } = await fresh()
    get.mockImplementation(() => Promise.reject(new ApiError(403, { code: 'permission_denied', message: 'permission denied' })))
    const env = useEnvironmentVariables()
    await env.ready
    expect(env.denied.value).toBe(true)
    expect(useEnvironmentLayer('account').value).toBe(false)
    useEnvironmentVariables()
    expect(get).toHaveBeenCalledOnce()
  })

  it('retries after any other failure', async () => {
    const { useEnvironmentLayer, useEnvironmentVariables, ApiError } = await fresh()
    get.mockRejectedValueOnce(new ApiError(503, { code: 'unavailable', message: 'down' })).mockResolvedValue({ variables, process: {} })
    await useEnvironmentVariables().ready
    expect(useEnvironmentVariables().denied.value).toBe(false)
    await useEnvironmentVariables().ready
    expect(get).toHaveBeenCalledTimes(2)
    expect(useEnvironmentLayer('account').value).toBe(true)
  })
})
