package engine

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

var errCreditSnapshotMissing = errors.New("original credit wire snapshot is missing")
var errCreditSnapshotExpired = errors.New("original credit wire snapshot has expired")

type creditSnapshot struct {
	Hash          string
	Identity      resources.Identity
	ConfigHash    string
	ClientDigests []string
	BaseDigest    string
	Echoes        map[string]json.RawMessage
	WirePrompt    json.RawMessage
	WireContent   json.RawMessage
	Prefill       *bool
	Betas         []string
	ExpiresAt     time.Time
}
type creditRegistry struct {
	mu       sync.Mutex
	dir      string
	cipher   cipher.AEAD
	maxBytes int64
}

func newCreditRegistry(dir, key string, maxBytes int64) (*creditRegistry, error) {
	if key == "" || dir == "" {
		return nil, fmt.Errorf("credit snapshots require a configured worker key")
	}
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	sum := sha256.Sum256([]byte("ccgateway-credit-snapshot-v1:" + key))
	block, err := aes.NewCipher(sum[:])
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if maxBytes <= 0 {
		maxBytes = 128 << 20
	}
	return &creditRegistry{dir: dir, cipher: aead, maxBytes: maxBytes}, nil
}
func creditHashValid(value string) bool {
	raw, err := hex.DecodeString(value)
	return err == nil && len(raw) == sha256.Size && hex.EncodeToString(raw) == value
}

func (r *creditRegistry) read(hash string) (*creditSnapshot, error) {
	if !creditHashValid(hash) {
		return nil, fmt.Errorf("invalid credit snapshot identity")
	}
	path := filepath.Join(r.dir, hash+".credit")
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, errCreditSnapshotMissing
		}
		return nil, fmt.Errorf("original credit wire snapshot is unavailable: %w", err)
	}
	defer file.Close()
	encrypted, err := io.ReadAll(io.LimitReader(file, 64<<20+1))
	if err != nil || len(encrypted) > 64<<20 || len(encrypted) < r.cipher.NonceSize() {
		return nil, fmt.Errorf("invalid credit snapshot size")
	}
	nonce := encrypted[:r.cipher.NonceSize()]
	raw, err := r.cipher.Open(nil, nonce, encrypted[r.cipher.NonceSize():], []byte(hash))
	if err != nil {
		return nil, fmt.Errorf("credit snapshot authentication failed")
	}
	var snapshot creditSnapshot
	if json.Unmarshal(raw, &snapshot) != nil || snapshot.Hash != hash {
		return nil, fmt.Errorf("credit snapshot expired or invalid")
	}
	return &snapshot, nil
}
func (r *creditRegistry) load(hash string, now time.Time) (*creditSnapshot, error) {
	snapshot, err := r.read(hash)
	if err != nil {
		return nil, err
	}
	if !snapshot.ExpiresAt.After(now) {
		return nil, errCreditSnapshotExpired
	}
	return snapshot, nil
}
func (r *creditRegistry) Load(hash string) (*creditSnapshot, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.load(hash, time.Now())
}

func (r *creditRegistry) Save(snapshot creditSnapshot) error {
	if !creditHashValid(snapshot.Hash) || len(snapshot.ClientDigests) < 1 || len(snapshot.ClientDigests) > 3 || len(snapshot.WirePrompt) == 0 || !snapshot.ExpiresAt.After(time.Now()) || snapshot.ExpiresAt.After(time.Now().Add(credits.Lifetime)) {
		return fmt.Errorf("invalid credit snapshot")
	}
	raw, err := json.Marshal(snapshot)
	if err != nil || len(raw) > 64<<20-r.cipher.Overhead()-r.cipher.NonceSize() {
		return fmt.Errorf("credit snapshot exceeds limit")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	// Multiple runtimes sharing DataDir must serialize quota and immutable
	// token checks too. Local mutex alone protects only one registry object.
	lock, err := os.OpenFile(filepath.Join(r.dir, ".registry.lock"), os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return err
	}
	defer lock.Close()
	if lockResourceLease(lock) != nil {
		return fmt.Errorf("credit registry is busy")
	}
	now := time.Now()
	if _, statErr := os.Stat(filepath.Join(r.dir, snapshot.Hash+".credit")); !os.IsNotExist(statErr) {
		old, err := r.read(snapshot.Hash)
		if statErr != nil || err != nil {
			return fmt.Errorf("existing credit snapshot unavailable")
		}
		if !old.ExpiresAt.After(now) {
			return fmt.Errorf("expired credit cannot be reissued")
		}
		// A repeated response may not move the token or refresh its lifetime.
		a, b := *old, snapshot
		a.ExpiresAt = time.Time{}
		b.ExpiresAt = time.Time{}
		if digest(a) != digest(b) {
			return fmt.Errorf("credit snapshot conflicts with its original request")
		}
		return nil
	}
	entries, err := os.ReadDir(r.dir)
	if err != nil {
		return err
	}
	var occupied int64
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".credit-write-") && entry.Type().IsRegular() {
			// The exclusive registry lock proves no current writer owns this
			// direct temporary file; a previous process died before rename.
			if err := os.Remove(filepath.Join(r.dir, entry.Name())); err != nil {
				return err
			}
			continue
		}
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".credit" {
			continue
		}
		hash := entry.Name()[:len(entry.Name())-len(".credit")]
		path := filepath.Join(r.dir, entry.Name())
		existing, err := r.read(hash)
		if err == nil && !existing.ExpiresAt.After(now.Add(-24*time.Hour)) {
			if err = os.Remove(path); err != nil {
				return err
			}
			continue
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		occupied += info.Size()
	}
	nonce := make([]byte, r.cipher.NonceSize())
	if _, err = rand.Read(nonce); err != nil {
		return err
	}
	encrypted := r.cipher.Seal(nonce, nonce, raw, []byte(snapshot.Hash))
	if occupied+int64(len(encrypted)) > r.maxBytes {
		return fmt.Errorf("credit wire snapshot capacity exceeded")
	}
	file, err := os.CreateTemp(r.dir, ".credit-write-")
	if err != nil {
		return err
	}
	name := file.Name()
	defer os.Remove(name)
	if err = file.Chmod(0600); err == nil {
		_, err = file.Write(encrypted)
	}
	if err == nil {
		err = file.Sync()
	}
	closeErr := file.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	return os.Rename(name, filepath.Join(r.dir, snapshot.Hash+".credit"))
}

// lookup retains an expired snapshot's issuer identity without treating it as
// proof that its prompt may bypass normal validation.
func (r *creditRegistry) lookup(hash string) (*creditSnapshot, bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	snapshot, err := r.read(hash)
	if err != nil {
		return nil, false, err
	}
	return snapshot, snapshot.ExpiresAt.After(time.Now()), nil
}
