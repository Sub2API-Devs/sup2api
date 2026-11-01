// Package uploads is the resumable chunked image upload and its import
// through the guard (Python images.py; U1-U6, R12-R16). Writer B
// implements it; see IMPLEMENTATION.md.
package uploads

// This file is FROZEN (foundation writer).

import (
	"errors"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/rnd"
)

// Options are the dependencies of New (implemented by writer B:
// func New(opts Options) (contract.Uploads, error)).
type Options struct {
	// Dir is the uploads directory (store.Store.UploadsPath()).
	Dir    string
	Images guardapi.ImagesAPI
	Clock  clock.Clock // STALE_SECONDS against file times
	Rand   rnd.Source  // upload ids: rnd.TokenURLSafe(r, 16)
	Log    *logx.Logger
}

// Defaults fills the nil fields and checks the required ones.
func (o *Options) Defaults() error {
	if o.Dir == "" || o.Images == nil {
		return errors.New("uploads: Dir and Images are required")
	}
	if o.Clock == nil {
		o.Clock = clock.Real()
	}
	if o.Rand == nil {
		o.Rand = rnd.Crypto()
	}
	if o.Log == nil {
		o.Log = logx.Discard()
	}
	return nil
}
