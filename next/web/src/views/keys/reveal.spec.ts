import { describe, expect, it, vi } from 'vitest'
import { maskKey, revealKey, searchQuery, searchedPrefix } from './reveal'

const post = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/host', () => ({ api: { post } }))

const PREFIX = 'sk-s2a-a1b2c'
const FULL = `${PREFIX}${'x'.repeat(35)}`

describe('API key reveal', () => {
  it('asks the owner endpoint for the full key', async () => {
    post.mockResolvedValue({ key: FULL })
    expect(await revealKey(7)).toBe(FULL)
    expect(post).toHaveBeenCalledWith('/me/api-keys/7/reveal', {})
  })

  it('masks a key after its prefix', () => {
    expect(maskKey(PREFIX)).toBe('sk-s2a-a1b2c******')
  })
})

describe('API key search query', () => {
  it('cuts a pasted key to its prefix, so the secret never leaves in a query string', () => {
    expect(searchQuery(FULL)).toBe(PREFIX)
    expect(searchQuery(`  ${FULL}\n`)).toBe(PREFIX)
    expect(searchQuery(`${PREFIX}x`)).toBe(PREFIX)
  })

  it.each([
    ['in double quotes', `"${FULL}"`],
    ['in single quotes', `'${FULL}'`],
    ['after Bearer', `Bearer ${FULL}`],
    ['in an authorization header', `Authorization: Bearer ${FULL}`],
    ['in an assignment', `ANTHROPIC_API_KEY=${FULL}`],
    ['in a quoted assignment', `export KEY="${FULL}";`],
    ['after its name and a tab, as the bulk copy writes it', `laptop\t${FULL}`],
    ['on the second line', `laptop\n${FULL}\n`],
    ['after other words', `team ${FULL} please`]
  ])('sends only the prefix of a key pasted %s', (_how, pasted) => {
    expect(searchQuery(pasted)).toBe(PREFIX)
  })

  it('finds a key whatever its case, and sends it as typed', () => {
    expect(searchQuery(FULL.toUpperCase())).toBe('SK-S2A-A1B2C')
    expect(searchQuery(`Bearer Sk-S2a-${'Q'.repeat(40)}`)).toBe('Sk-S2a-QQQQQ')
  })

  it('sends the prefix of the first key when several were pasted', () => {
    expect(searchQuery(`${FULL}\nsk-s2a-${'z'.repeat(40)}`)).toBe(PREFIX)
  })

  it('sends a prefix, or less of one, as typed', () => {
    expect(searchQuery(PREFIX)).toBe(PREFIX)
    expect(searchQuery('sk-s2a-a1')).toBe('sk-s2a-a1')
    expect(searchQuery('sk-s2a-')).toBe('sk-s2a-')
    expect(searchQuery('sk-')).toBe('sk-')
  })

  it('sends any other text trimmed, however long', () => {
    expect(searchQuery('  laptop ')).toBe('laptop')
    expect(searchQuery('my-very-long-key-name-2026')).toBe('my-very-long-key-name-2026')
    expect(searchQuery('team sk-s2a- gateway')).toBe('team sk-s2a- gateway')
    expect(searchQuery('   ')).toBe('')
  })

  it('never sends more of a key than its prefix, whatever surrounds it', () => {
    const secret = FULL.slice(PREFIX.length)
    for (const around of ['', '"', "'", '`', 'Bearer ', 'KEY=', 'x\t', '(', '<', 'key:'])
      expect(searchQuery(`${around}${FULL}${around}`)).not.toContain(secret.slice(0, 4))
  })
})

describe('the key prefix a search asks for', () => {
  it('is the start of a key that says more than the scheme, lowercased and no longer than a prefix', () => {
    expect(searchedPrefix('sk-s2a-a')).toBe('sk-s2a-a')
    expect(searchedPrefix('SK-S2A-A1B2Cdef')).toBe(PREFIX)
    expect(searchedPrefix(PREFIX)).toBe(PREFIX)
  })

  it('is none for the scheme alone, less of it, or text that does not start as a key', () => {
    for (const q of ['', 's', 'sk-', 'sk-s2a-', 'laptop', 'my sk-s2a-a1b2c']) expect(searchedPrefix(q)).toBe('')
  })
})
