// The dev mock (web/mock, vite --mode mock) answering requests as its server
// does, for the specs that hold it to what the core answers. The mock is node
// code outside the app's type program, so it is loaded by path and its answers
// are untyped. Specs using it run in the node environment.

export interface Answer {
  status: number
  body: any
}

export interface MockServer {
  /** Answers a request as the mock server does: a plain value is wrapped in {data}. */
  call(method: string, url: string, body?: unknown, token?: string): Promise<Answer>
  /** The access token of a mock identity (password admin). */
  signIn(email: string): Promise<string>
  /** The fields of a 400, in order. */
  fields(a: Answer): string[] | undefined
}

type Route = { method: string; re: RegExp; keys: string[]; handler: (req: unknown) => unknown }

const mockFile = (name: string) => new URL(`../../mock/${name}.ts`, import.meta.url).pathname

/** Loads the router and the mock areas named (each registers its routes). */
export async function mockServer(...areas: string[]): Promise<MockServer> {
  const routes: Route[] = (await import(/* @vite-ignore */ mockFile('router'))).routes
  for (const area of areas) await import(/* @vite-ignore */ mockFile(area))

  async function call(method: string, url: string, body?: unknown, token?: string): Promise<Answer> {
    const u = new URL(url, 'http://mock')
    for (const r of routes) {
      const m = r.method === method ? r.re.exec(u.pathname) : null
      if (!m) continue
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
      const out: any = await r.handler({
        method,
        path: u.pathname,
        params,
        query: Object.fromEntries(u.searchParams),
        body,
        headers: token ? { authorization: `Bearer ${token}` } : {}
      })
      return out && typeof out === 'object' && '__status' in out
        ? { status: out.__status, body: out.body }
        : { status: 200, body: { data: out } }
    }
    throw new Error(`no mock route for ${method} ${url}`)
  }
  const signIn = async (email: string) => (await call('POST', '/auth/login', { email, password: 'admin' })).body.data.access_token as string
  const fields = (a: Answer) => a.body.error?.details?.fields?.map((f: { field: string }) => f.field)
  return { call, signIn, fields }
}
