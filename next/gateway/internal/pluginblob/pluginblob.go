// Package pluginblob keeps plugin packages for the cores of a cluster. The
// primary's shell holds every package that is not downloaded from a market;
// a follower's shell fetches from the primary over the authenticated node
// network and pushes uploads to it. Packages are addressed by sha256 and
// verified on every write.
package pluginblob

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const DefaultMaxBytes = 256 << 20

func validSum(s string) bool {
	if len(s) != 64 {
		return false
	}
	for _, c := range s {
		if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
			return false
		}
	}
	return true
}

// Store is a content-addressed directory.
type Store struct {
	Dir      string
	MaxBytes int64
}

func (s *Store) path(sum string) string { return filepath.Join(s.Dir, sum[:2], sum) }

func (s *Store) max() int64 {
	if s.MaxBytes > 0 {
		return s.MaxBytes
	}
	return DefaultMaxBytes
}

// Has reports whether the package is stored.
func (s *Store) Has(sum string) bool {
	if !validSum(sum) {
		return false
	}
	_, err := os.Stat(s.path(sum))
	return err == nil
}

// Write stores r under sum after verifying its digest and size.
func (s *Store) Write(sum string, r io.Reader) error {
	if !validSum(sum) {
		return fmt.Errorf("invalid package digest")
	}
	file := s.path(sum)
	if err := os.MkdirAll(filepath.Dir(file), 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(file), ".write-")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	h := sha256.New()
	n, err := io.Copy(io.MultiWriter(tmp, h), io.LimitReader(r, s.max()+1))
	if err == nil && n > s.max() {
		err = fmt.Errorf("package exceeds %d bytes", s.max())
	}
	if err == nil && hex.EncodeToString(h.Sum(nil)) != sum {
		err = errors.New("package digest mismatch")
	}
	if err == nil {
		err = tmp.Sync()
	}
	if cerr := tmp.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmp.Name(), file)
}

func (s *Store) serve(w http.ResponseWriter, r *http.Request, sum string) {
	f, err := os.Open(s.path(sum))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		http.Error(w, "package unreadable", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	http.ServeContent(w, r, "", st.ModTime(), f)
}

// GC removes packages no plugin version references, once older than grace;
// the grace period covers uploads stored before their row commits.
func (s *Store) GC(referenced map[string]bool, grace time.Duration) (int, error) {
	removed := 0
	err := filepath.WalkDir(s.Dir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				return nil
			}
			return err
		}
		if d.IsDir() || !validSum(d.Name()) || referenced[d.Name()] {
			return nil
		}
		info, err := d.Info()
		if err != nil || time.Since(info.ModTime()) < grace {
			return nil
		}
		if os.Remove(path) == nil {
			removed++
		}
		return nil
	})
	return removed, err
}

// Service answers the local core and, on the primary, the other nodes.
type Service struct {
	Store *Store
	// Primary reports whether this node is the primary and the primary's
	// HTTPS peer origin.
	Primary func(context.Context) (self bool, peerURL string, err error)
	// NodesWithPackage returns enabled nodes that hold the given package digest.
	NodesWithPackage func(context.Context, string) ([]NodeRef, error)
	// Client is the authenticated node client; it only reaches the primary.
	Client *http.Client
}

// NodeRef identifies a peer node for package fallback.
type NodeRef struct {
	ID      string
	PeerURL string
}

func sumFrom(path, prefix string) (string, bool) {
	sum := strings.TrimPrefix(path, prefix)
	return sum, strings.HasPrefix(path, prefix) && validSum(sum)
}

// Local serves GET and PUT /system/plugin-blobs/<sha256> on the management
// socket for the core of this node.
func (s *Service) Local() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sum, ok := sumFrom(r.URL.Path, "/system/plugin-blobs/")
		if !ok {
			http.NotFound(w, r)
			return
		}
		switch r.Method {
		case http.MethodGet:
			if !s.Store.Has(sum) {
				if err := s.pull(r.Context(), sum); err != nil {
					if errors.Is(err, errNotFound) {
						http.NotFound(w, r)
						return
					}
					http.Error(w, err.Error(), http.StatusBadGateway)
					return
				}
			}
			s.Store.serve(w, r, sum)
		case http.MethodPut:
			if err := s.Store.Write(sum, r.Body); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			if err := s.push(r.Context(), sum); err != nil {
				http.Error(w, err.Error(), http.StatusBadGateway)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})
}

// Peer serves the primary's private endpoint /internal/plugin-blobs/<sha256>
// after node authentication and authorization.
func (s *Service) Peer() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sum, ok := sumFrom(r.URL.Path, "/internal/plugin-blobs/")
		if !ok {
			http.NotFound(w, r)
			return
		}
		switch r.Method {
		case http.MethodGet, http.MethodHead:
			s.Store.serve(w, r, sum)
		case http.MethodPut:
			if err := s.Store.Write(sum, r.Body); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})
}

var errNotFound = errors.New("package not found on the primary")

func (s *Service) pull(ctx context.Context, sum string) error {
	self, origin, err := s.Primary(ctx)
	if err != nil {
		return err
	}
	if self {
		return errNotFound
	}
	// Try the primary first.
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, origin+"/internal/plugin-blobs/"+sum, nil)
	if err != nil {
		return err
	}
	res, err := s.Client.Do(req)
	if err == nil {
		defer res.Body.Close()
		if res.StatusCode == http.StatusNotFound && res.Header.Get("X-Sub2api-Peer-Error") == "" {
			// Primary doesn't have it; try fallback nodes.
		} else if res.StatusCode != http.StatusOK {
			return fmt.Errorf("fetch package from the primary: HTTP %d", res.StatusCode)
		} else {
			return s.Store.Write(sum, res.Body)
		}
	}
	// Primary failed or returned 404; try other nodes with the package.
	if s.NodesWithPackage == nil {
		if err != nil {
			return fmt.Errorf("fetch package from the primary: %w", err)
		}
		return errNotFound
	}
	nodes, err := s.NodesWithPackage(ctx, sum)
	if err != nil || len(nodes) == 0 {
		if err != nil {
			return fmt.Errorf("fetch package from the primary: %w; fallback query failed: %w", err, err)
		}
		return errNotFound
	}
	// Try each node in turn.
	for _, node := range nodes {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, node.PeerURL+"/internal/plugin-blobs/"+sum, nil)
		if err != nil {
			continue
		}
		res, err := s.Client.Do(req)
		if err != nil {
			continue
		}
		defer res.Body.Close()
		if res.StatusCode == http.StatusOK {
			return s.Store.Write(sum, res.Body)
		}
	}
	return fmt.Errorf("package %s not available from primary or %d fallback nodes", sum, len(nodes))
}

func (s *Service) push(ctx context.Context, sum string) error {
	self, origin, err := s.Primary(ctx)
	if err != nil {
		return err
	}
	if self {
		return nil
	}
	// Write locally first, then replicate asynchronously.
	f, err := os.Open(s.Store.path(sum))
	if err != nil {
		return err
	}
	st, err := f.Stat()
	if err != nil {
		f.Close()
		return err
	}
	size := st.Size()
	f.Close()

	// Replicate asynchronously to the primary (best-effort).
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		f, err := os.Open(s.Store.path(sum))
		if err != nil {
			return
		}
		defer f.Close()
		req, err := http.NewRequestWithContext(ctx, http.MethodPut, origin+"/internal/plugin-blobs/"+sum, f)
		if err != nil {
			return
		}
		req.ContentLength = size
		res, err := s.Client.Do(req)
		if err != nil {
			return
		}
		res.Body.Close()
	}()
	return nil
}
