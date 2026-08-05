package workervault

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	bolt "go.etcd.io/bbolt"
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
	db   *bolt.DB
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
	db, err := bolt.Open(path, 0o600, &bolt.Options{Timeout: time.Second})
	if err != nil {
		return nil, fmt.Errorf("open worker vault: %w", err)
	}
	if err := os.Chmod(path, 0o600); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("protect worker vault: %w", err)
	}
	vault := &Vault{db: db, aead: aead}
	if err := db.Update(func(tx *bolt.Tx) error {
		if _, err := tx.CreateBucketIfNotExists(accountsBucket); err != nil {
			return err
		}
		metadata, err := tx.CreateBucketIfNotExists(metadataBucket)
		if err != nil {
			return err
		}
		sealed := metadata.Get(keyCheckName)
		if sealed == nil {
			sealed, err = vault.seal(string(keyCheckName), []byte(keyCheckPlaintext))
			if err != nil {
				return err
			}
			return metadata.Put(keyCheckName, sealed)
		}
		plaintext, err := vault.unseal(string(keyCheckName), sealed)
		if err != nil || string(plaintext) != keyCheckPlaintext {
			return errors.New("worker vault key does not match the existing vault")
		}
		return nil
	}); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("initialize worker vault: %w", err)
	}
	return vault, nil
}

func (v *Vault) Close() error {
	if v == nil || v.db == nil {
		return nil
	}
	return v.db.Close()
}

func (v *Vault) Ping() error {
	if v == nil || v.db == nil {
		return errors.New("worker vault is closed")
	}
	return v.db.View(func(tx *bolt.Tx) error {
		if tx.Bucket(accountsBucket) == nil {
			return errors.New("worker vault account bucket is unavailable")
		}
		return nil
	})
}

func (v *Vault) Put(account *Account) error {
	if account == nil || account.ID == "" {
		return errors.New("worker account id is required")
	}
	raw, err := json.Marshal(account)
	if err != nil {
		return err
	}
	sealed, err := v.seal(account.ID, raw)
	if err != nil {
		return err
	}
	return v.db.Update(func(tx *bolt.Tx) error {
		return tx.Bucket(accountsBucket).Put([]byte(account.ID), sealed)
	})
}

func (v *Vault) Get(id string) (*Account, error) {
	var sealed []byte
	err := v.db.View(func(tx *bolt.Tx) error {
		value := tx.Bucket(accountsBucket).Get([]byte(id))
		if value == nil {
			return ErrNotFound
		}
		sealed = append([]byte(nil), value...)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return v.open(id, sealed)
}

func (v *Vault) List() ([]Account, error) {
	accounts := make([]Account, 0)
	err := v.db.View(func(tx *bolt.Tx) error {
		return tx.Bucket(accountsBucket).ForEach(func(key, value []byte) error {
			account, err := v.open(string(key), value)
			if err != nil {
				return err
			}
			accounts = append(accounts, *account)
			return nil
		})
	})
	sort.Slice(accounts, func(i, j int) bool { return accounts[i].CreatedAt.After(accounts[j].CreatedAt) })
	return accounts, err
}

func (v *Vault) Delete(id string) error {
	return v.db.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket(accountsBucket)
		if bucket.Get([]byte(id)) == nil {
			return ErrNotFound
		}
		return bucket.Delete([]byte(id))
	})
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
