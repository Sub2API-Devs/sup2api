// Package secret provides AES-256-GCM encryption with the server master key
// for credentials, proxy passwords and plugin settings.
package secret

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"fmt"
)

// Cipher encrypts small secrets. Ciphertext layout: version(1) | nonce(12) | sealed.
type Cipher struct {
	aead cipher.AEAD
}

const version byte = 1

func New(masterKey []byte) (*Cipher, error) {
	if len(masterKey) != 32 {
		return nil, fmt.Errorf("master key must be 32 bytes, got %d", len(masterKey))
	}
	block, err := aes.NewCipher(masterKey)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Cipher{aead: aead}, nil
}

// Encrypt seals plaintext; aad binds the ciphertext to its context
// (e.g. "account:123") so it cannot be swapped between rows.
func (c *Cipher) Encrypt(plaintext, aad []byte) ([]byte, error) {
	nonce := make([]byte, c.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	out := make([]byte, 0, 1+len(nonce)+len(plaintext)+c.aead.Overhead())
	out = append(out, version)
	out = append(out, nonce...)
	return c.aead.Seal(out, nonce, plaintext, aad), nil
}

func (c *Cipher) Decrypt(ciphertext, aad []byte) ([]byte, error) {
	ns := c.aead.NonceSize()
	if len(ciphertext) < 1+ns+c.aead.Overhead() || ciphertext[0] != version {
		return nil, errors.New("secret: malformed ciphertext")
	}
	return c.aead.Open(nil, ciphertext[1:1+ns], ciphertext[1+ns:], aad)
}
