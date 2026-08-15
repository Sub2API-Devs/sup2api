package workervault

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"

	bolt "go.etcd.io/bbolt"
	_ "modernc.org/sqlite"
)

var (
	accountsBucket = []byte("accounts-v1")
	metadataBucket = []byte("metadata-v1")
	keyCheckName   = []byte("key-check")
	ErrNotFound    = errors.New("worker account not found")
)

const keyCheckPlaintext = "sup2api-worker-vault-key-v1"

// Account is the Worker-local source of truth. Callers must expose Summary,
// never Account, across the management boundary.
type Account struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Kind             string    `json:"kind"`
	Status           string    `json:"status"`
	BaseURL          string    `json:"base_url"`
	Models           string    `json:"models,omitempty"`
	Group            string    `json:"group,omitempty"`
	TestModel        string    `json:"test_model,omitempty"`
	APIKey           string    `json:"api_key,omitempty"`
	AccessToken      string    `json:"access_token,omitempty"`
	RefreshToken     string    `json:"refresh_token,omitempty"`
	IDToken          string    `json:"id_token,omitempty"`
	ClientID         string    `json:"client_id,omitempty"`
	ChatGPTAccountID string    `json:"chatgpt_account_id,omitempty"`
	Email            string    `json:"email,omitempty"`
	ExpiresAt        int64     `json:"expires_at,omitempty"`
	LastTestAt       int64     `json:"last_test_at,omitempty"`
	LastTestStatus   int       `json:"last_test_status,omitempty"`
	LastError        string    `json:"last_error,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Summary struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Kind             string    `json:"kind"`
	Status           string    `json:"status"`
	BaseURL          string    `json:"base_url"`
	Models           string    `json:"models,omitempty"`
	Group            string    `json:"group,omitempty"`
	TestModel        string    `json:"test_model,omitempty"`
	Email            string    `json:"email,omitempty"`
	ChatGPTAccountID string    `json:"chatgpt_account_id,omitempty"`
	ExpiresAt        int64     `json:"expires_at,omitempty"`
	LastTestAt       int64     `json:"last_test_at,omitempty"`
	LastTestStatus   int       `json:"last_test_status,omitempty"`
	LastError        string    `json:"last_error,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (a Account) Summary() Summary {
	return Summary{
		ID: a.ID, Name: a.Name, Kind: a.Kind, Status: a.Status, BaseURL: a.BaseURL,
		Models: a.Models, Group: a.Group, TestModel: a.TestModel, Email: a.Email,
		ChatGPTAccountID: a.ChatGPTAccountID, ExpiresAt: a.ExpiresAt,
		LastTestAt: a.LastTestAt, LastTestStatus: a.LastTestStatus, LastError: a.LastError,
		CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt,
	}
}

type Vault struct {
	mu   sync.RWMutex
	db   *sql.DB
	aead cipher.AEAD
}

func Open(path string, key []byte) (*Vault, error) {
	if len(key) != 32 {
		return nil, fmt.Errorf("worker vault key must contain exactly 32 bytes")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, fmt.Errorf("create worker vault directory: %w", err)
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	legacy, err := readLegacyBoltVault(path)
	if err != nil {
		return nil, err
	}
	backupPath := ""
	if legacy != nil {
		if err := validateLegacyKey(aead, legacy); err != nil {
			return nil, err
		}
		backupPath = path + ".bbolt.backup"
		if err := os.Rename(path, backupPath); err != nil {
			return nil, fmt.Errorf("backup legacy worker vault: %w", err)
		}
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		restoreLegacyVault(path, backupPath)
		return nil, fmt.Errorf("open worker SQLite vault: %w", err)
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	vault := &Vault{db: db, aead: aead}
	if err := vault.initialize(legacy); err != nil {
		_ = db.Close()
		restoreLegacyVault(path, backupPath)
		return nil, fmt.Errorf("initialize worker vault: %w", err)
	}
	for _, suffix := range []string{"", "-wal", "-shm"} {
		if err := os.Chmod(path+suffix, 0o600); err != nil && !errors.Is(err, os.ErrNotExist) {
			_ = db.Close()
			restoreLegacyVault(path, backupPath)
			return nil, fmt.Errorf("protect worker SQLite vault: %w", err)
		}
	}
	return vault, nil
}

func restoreLegacyVault(path, backupPath string) {
	if backupPath == "" {
		return
	}
	_ = os.Remove(path)
	_ = os.Remove(path + "-wal")
	_ = os.Remove(path + "-shm")
	_ = os.Rename(backupPath, path)
}

type legacyVault struct {
	keyCheck []byte
	accounts map[string][]byte
}

func readLegacyBoltVault(path string) (*legacyVault, error) {
	header := make([]byte, 16)
	file, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("inspect worker vault: %w", err)
	}
	n, readErr := file.Read(header)
	_ = file.Close()
	if readErr != nil && n == 0 {
		return nil, fmt.Errorf("inspect worker vault header: %w", readErr)
	}
	if strings.HasPrefix(string(header[:n]), "SQLite format 3") {
		return nil, nil
	}
	db, err := bolt.Open(path, 0o600, &bolt.Options{ReadOnly: true, Timeout: time.Second})
	if err != nil {
		return nil, fmt.Errorf("open legacy worker BoltDB vault: %w", err)
	}
	defer db.Close()
	legacy := &legacyVault{accounts: make(map[string][]byte)}
	if err := db.View(func(tx *bolt.Tx) error {
		accounts := tx.Bucket(accountsBucket)
		metadata := tx.Bucket(metadataBucket)
		if accounts == nil || metadata == nil {
			return errors.New("legacy worker vault buckets are unavailable")
		}
		legacy.keyCheck = append([]byte(nil), metadata.Get(keyCheckName)...)
		return accounts.ForEach(func(key, value []byte) error {
			legacy.accounts[string(key)] = append([]byte(nil), value...)
			return nil
		})
	}); err != nil {
		return nil, fmt.Errorf("read legacy worker vault: %w", err)
	}
	return legacy, nil
}

func validateLegacyKey(aead cipher.AEAD, legacy *legacyVault) error {
	vault := &Vault{aead: aead}
	plaintext, err := vault.unseal(string(keyCheckName), legacy.keyCheck)
	if err != nil || string(plaintext) != keyCheckPlaintext {
		return errors.New("worker vault key does not match the existing vault")
	}
	return nil
}

func (v *Vault) initialize(legacy *legacyVault) error {
	for _, statement := range []string{
		`PRAGMA journal_mode = WAL`, `PRAGMA synchronous = FULL`, `PRAGMA busy_timeout = 5000`,
		`CREATE TABLE IF NOT EXISTS vault_metadata (key TEXT PRIMARY KEY, value BLOB NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS worker_accounts (id TEXT PRIMARY KEY, sealed BLOB NOT NULL)`,
	} {
		if _, err := v.db.Exec(statement); err != nil {
			return err
		}
	}
	tx, err := v.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if legacy != nil {
		if _, err := tx.Exec(`INSERT OR IGNORE INTO vault_metadata(key, value) VALUES (?, ?)`, string(keyCheckName), legacy.keyCheck); err != nil {
			return err
		}
		for id, sealed := range legacy.accounts {
			if _, err := tx.Exec(`INSERT OR IGNORE INTO worker_accounts(id, sealed) VALUES (?, ?)`, id, sealed); err != nil {
				return err
			}
		}
	}
	var sealed []byte
	err = tx.QueryRow(`SELECT value FROM vault_metadata WHERE key = ?`, string(keyCheckName)).Scan(&sealed)
	if errors.Is(err, sql.ErrNoRows) {
		sealed, err = v.seal(string(keyCheckName), []byte(keyCheckPlaintext))
		if err == nil {
			_, err = tx.Exec(`INSERT INTO vault_metadata(key, value) VALUES (?, ?)`, string(keyCheckName), sealed)
		}
	}
	if err != nil {
		return err
	}
	plaintext, err := v.unseal(string(keyCheckName), sealed)
	if err != nil || string(plaintext) != keyCheckPlaintext {
		return errors.New("worker vault key does not match the existing vault")
	}
	return tx.Commit()
}

func (v *Vault) Close() error {
	if v == nil || v.db == nil {
		return nil
	}
	v.mu.Lock()
	defer v.mu.Unlock()
	_, _ = v.db.Exec(`PRAGMA wal_checkpoint(TRUNCATE)`)
	return v.db.Close()
}

func (v *Vault) Ping() error {
	if v == nil || v.db == nil {
		return errors.New("worker vault is closed")
	}
	v.mu.RLock()
	defer v.mu.RUnlock()
	var one int
	return v.db.QueryRow(`SELECT 1`).Scan(&one)
}

func (v *Vault) Put(account *Account) error {
	if account == nil || account.ID == "" {
		return errors.New("worker account id is required")
	}
	v.mu.Lock()
	defer v.mu.Unlock()
	raw, err := json.Marshal(account)
	if err != nil {
		return err
	}
	sealed, err := v.seal(account.ID, raw)
	if err != nil {
		return err
	}
	_, err = v.db.Exec(`INSERT INTO worker_accounts(id, sealed) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET sealed = excluded.sealed`, account.ID, sealed)
	return err
}

func (v *Vault) Get(id string) (*Account, error) {
	v.mu.RLock()
	defer v.mu.RUnlock()
	var sealed []byte
	err := v.db.QueryRow(`SELECT sealed FROM worker_accounts WHERE id = ?`, id).Scan(&sealed)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return v.open(id, sealed)
}

func (v *Vault) List() ([]Account, error) {
	v.mu.RLock()
	defer v.mu.RUnlock()
	return v.listLocked()
}

func (v *Vault) listLocked() ([]Account, error) {
	rows, err := v.db.Query(`SELECT id, sealed FROM worker_accounts`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	accounts := make([]Account, 0)
	for rows.Next() {
		var id string
		var sealed []byte
		if err := rows.Scan(&id, &sealed); err != nil {
			return nil, err
		}
		account, err := v.open(id, sealed)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, *account)
	}
	slices.SortFunc(accounts, func(a, b Account) int { return b.CreatedAt.Compare(a.CreatedAt) })
	return accounts, rows.Err()
}

func (v *Vault) Rekey(newKey []byte) error {
	if v == nil || v.db == nil {
		return errors.New("worker vault is closed")
	}
	if len(newKey) != 32 {
		return errors.New("worker vault key must contain exactly 32 bytes")
	}
	v.mu.Lock()
	defer v.mu.Unlock()
	accounts, err := v.listLocked()
	if err != nil {
		return err
	}
	block, err := aes.NewCipher(newKey)
	if err != nil {
		return err
	}
	next, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}
	previous := v.aead
	v.aead = next
	sealedCheck, err := v.seal(string(keyCheckName), []byte(keyCheckPlaintext))
	if err != nil {
		v.aead = previous
		return err
	}
	sealedAccounts := make([][]byte, 0, len(accounts))
	for _, account := range accounts {
		raw, marshalErr := json.Marshal(account)
		if marshalErr != nil {
			v.aead = previous
			return marshalErr
		}
		sealed, sealErr := v.seal(account.ID, raw)
		if sealErr != nil {
			v.aead = previous
			return sealErr
		}
		sealedAccounts = append(sealedAccounts, sealed)
	}
	tx, err := v.db.Begin()
	if err != nil {
		v.aead = previous
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`UPDATE vault_metadata SET value = ? WHERE key = ?`, sealedCheck, string(keyCheckName)); err != nil {
		v.aead = previous
		return err
	}
	for index, account := range accounts {
		if _, err := tx.Exec(`UPDATE worker_accounts SET sealed = ? WHERE id = ?`, sealedAccounts[index], account.ID); err != nil {
			v.aead = previous
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		v.aead = previous
		return err
	}
	return nil
}

func (v *Vault) Delete(id string) error {
	v.mu.Lock()
	defer v.mu.Unlock()
	result, err := v.db.Exec(`DELETE FROM worker_accounts WHERE id = ?`, id)
	if err != nil {
		return err
	}
	deleted, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if deleted == 0 {
		return ErrNotFound
	}
	return nil
}

func (v *Vault) seal(id string, plaintext []byte) ([]byte, error) {
	nonce := make([]byte, v.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	result := make([]byte, 1, 1+len(nonce)+len(plaintext)+v.aead.Overhead())
	result[0] = 1
	result = append(result, nonce...)
	return v.aead.Seal(result, nonce, plaintext, []byte(id)), nil
}

func (v *Vault) open(id string, sealed []byte) (*Account, error) {
	plaintext, err := v.unseal(id, sealed)
	if err != nil {
		return nil, fmt.Errorf("decrypt worker account %q: %w", id, err)
	}
	var account Account
	if err := json.Unmarshal(plaintext, &account); err != nil {
		return nil, fmt.Errorf("decode worker account %q: %w", id, err)
	}
	if account.ID != id {
		return nil, errors.New("worker vault record identity mismatch")
	}
	return &account, nil
}

func (v *Vault) unseal(id string, sealed []byte) ([]byte, error) {
	if len(sealed) < 1+v.aead.NonceSize()+v.aead.Overhead() || sealed[0] != 1 {
		return nil, errors.New("unsupported or damaged worker vault record")
	}
	nonce := sealed[1 : 1+v.aead.NonceSize()]
	return v.aead.Open(nil, nonce, sealed[1+v.aead.NonceSize():], []byte(id))
}
