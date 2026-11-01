package guardapi

import (
	"context"
	"io"
)

// AppHandle is an account container as the update code sees it (the Python
// container object): its inspect at the time it was fetched, plus exec,
// archive and top through the guard. It implements containerfs.App.
type AppHandle struct {
	g   AccountsAPI
	aid string
	c   *Container
}

// NewAppHandle wraps the inspect c of aid's app container.
func NewAppHandle(g AccountsAPI, aid string, c *Container) *AppHandle {
	return &AppHandle{g: g, aid: aid, c: c}
}

// AID is the runtime key.
func (h *AppHandle) AID() string { return h.aid }

// ID is the container ID.
func (h *AppHandle) ID() string { return h.c.ID }

// Attrs is the inspect the handle was made from (not refreshed).
func (h *AppHandle) Attrs() *Container { return h.c }

// Exec runs argv as user ("" default, "0" root, "1000"); the merged output.
func (h *AppHandle) Exec(ctx context.Context, argv []string, user string) (int, []byte, error) {
	r, err := h.g.AppExec(ctx, h.aid, argv, user)
	if err != nil {
		return 0, nil, err
	}
	return r.ExitCode, r.Output, nil
}

// ArchiveGet is the tar stream of path (ErrNotFound when it does not exist).
func (h *AppHandle) ArchiveGet(ctx context.Context, path string) (io.ReadCloser, error) {
	return h.g.AppArchiveGet(ctx, h.aid, path)
}

// ArchivePut unpacks a tar of size bytes into directory dir.
func (h *AppHandle) ArchivePut(ctx context.Context, dir string, archive io.Reader, size int64) error {
	return h.g.AppArchivePut(ctx, h.aid, dir, archive, size)
}

// Top is the process list (ps -eo pid,comm).
func (h *AppHandle) Top(ctx context.Context) (*Top, error) { return h.g.AppTop(ctx, h.aid) }
