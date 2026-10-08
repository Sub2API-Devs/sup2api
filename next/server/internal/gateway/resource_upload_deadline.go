package gateway

import (
	"context"
	"io"
	"net/http"
	"time"
)

const resourceUploadIdleTimeout = time.Minute

type resourceDeadlineBody struct {
	io.ReadCloser
	controller *http.ResponseController
	idle       time.Duration
	ctx        context.Context
}

func (b *resourceDeadlineBody) Read(p []byte) (int, error) {
	if err := b.controller.SetReadDeadline(time.Now().Add(b.idle)); err != nil {
		return 0, err
	}
	if err := b.ctx.Err(); err != nil {
		return 0, err
	}
	return b.ReadCloser.Read(p)
}

// A connection read deadline actually interrupts net/http's blocked Body.Read;
// calling Body.Close from a timer alone can wait on that same internal lock.
// No per-read goroutine is created, and progress resets the idle deadline.
func resourceReadDeadline(w http.ResponseWriter, r *http.Request, idle time.Duration) (func(), error) {
	controller := http.NewResponseController(w)
	if err := controller.SetReadDeadline(time.Now().Add(idle)); err != nil {
		return nil, err
	}
	r.Body = &resourceDeadlineBody{ReadCloser: r.Body, controller: controller, idle: idle, ctx: r.Context()}
	stop := context.AfterFunc(r.Context(), func() { _ = controller.SetReadDeadline(time.Now()) })
	return func() { stop(); _ = controller.SetReadDeadline(time.Time{}) }, nil
}
