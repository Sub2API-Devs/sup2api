// Package rnd is the controller's source of randomness: crypto/rand in
// production, a fixed sequence in tests (the Python tests patched
// secrets.choice). Helpers reproduce the Python secrets functions the
// controller uses, with the same output alphabets and lengths.
//
// FROZEN: accounts.Options.Rand and every helper signature.
package rnd

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"io"
	"sync"
)

// Source provides random bytes and uniform choices.
type Source interface {
	io.Reader
	// Intn is a uniform integer in [0, n); n > 0.
	Intn(n int) int
}

// Crypto is the production source (crypto/rand).
func Crypto() Source { return cryptoSource{} }

type cryptoSource struct{}

func (cryptoSource) Read(p []byte) (int, error) { return rand.Read(p) }

func (cryptoSource) Intn(n int) int {
	if n <= 0 {
		panic("rnd: Intn of non-positive n")
	}
	// Rejection sampling, as secrets.randbelow does.
	max := ^uint64(0) - ^uint64(0)%uint64(n)
	var b [8]byte
	for {
		if _, err := rand.Read(b[:]); err != nil {
			panic(err)
		}
		v := binary.LittleEndian.Uint64(b[:])
		if v < max {
			return int(v % uint64(n))
		}
	}
}

// Fixed is a deterministic test source: Intn returns the next value of
// choices modulo n (cycling; 0 when choices is empty); Read fills bytes
// from a counter starting at seed.
func Fixed(seed byte, choices ...int) *FixedSource {
	return &FixedSource{next: seed, choices: choices}
}

// FixedSource is the deterministic source returned by Fixed.
type FixedSource struct {
	mu      sync.Mutex
	next    byte
	choices []int
	i       int
}

func (f *FixedSource) Read(p []byte) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i := range p {
		p[i] = f.next
		f.next++
	}
	return len(p), nil
}

func (f *FixedSource) Intn(n int) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.choices) == 0 {
		return 0
	}
	v := f.choices[f.i%len(f.choices)]
	f.i++
	if v < 0 {
		v = -v
	}
	return v % n
}

// Bytes reads n random bytes from s (panics if the source fails: the
// production source never does).
func Bytes(s Source, n int) []byte {
	b := make([]byte, n)
	if _, err := io.ReadFull(s, b); err != nil {
		panic(err)
	}
	return b
}

// TokenHex is secrets.token_hex(n): 2n lower-case hex characters.
func TokenHex(s Source, n int) string { return hex.EncodeToString(Bytes(s, n)) }

// TokenURLSafe is secrets.token_urlsafe(n): URL-safe base64 of n bytes
// without padding (43 characters for n=32, 22 for n=16).
func TokenURLSafe(s Source, n int) string {
	return base64.RawURLEncoding.EncodeToString(Bytes(s, n))
}

// Choice is secrets.choice(items): one element, uniformly.
func Choice[T any](s Source, items []T) T { return items[s.Intn(len(items))] }
