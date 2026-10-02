package control

import (
	"context"
	"log/slog"
	"net/http"
	"path/filepath"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/shell/internal/pluginblob"
)

// PluginBlobs builds the plugin package service of node. Packages live under
// root/plugin-blobs; client is the authenticated node client.
func PluginBlobs(store *Store, node, root string, client *http.Client, maxBytes int64) *pluginblob.Service {
	return &pluginblob.Service{
		Store:  &pluginblob.Store{Dir: filepath.Join(root, "plugin-blobs"), MaxBytes: maxBytes},
		Client: client,
		Primary: func(ctx context.Context) (bool, string, error) {
			return store.PrimaryPeer(ctx, node)
		},
	}
}

// ManagementHandler serves the local management socket: the updater API and
// the plugin packages of this node's core.
func ManagementHandler(store *Store, blobs *pluginblob.Service) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/system/plugin-blobs/", blobs.Local())
	mux.Handle("/", store.Handler())
	return mux
}

// CollectPluginBlobs removes packages no version references any more, every
// interval, keeping recent ones whose upload may still be committing.
func CollectPluginBlobs(ctx context.Context, store *Store, blobs *pluginblob.Service, interval time.Duration) {
	tick := time.NewTicker(interval)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
		referenced, err := store.ReferencedPackages(ctx)
		if err != nil {
			continue
		}
		if n, err := blobs.Store.GC(referenced, time.Hour); n > 0 || err != nil {
			slog.Info("plugin package cleanup", "removed", n, "error", err)
		}
	}
}
