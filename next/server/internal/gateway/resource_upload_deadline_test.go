package gateway

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestReviewUploadIdleDeadlineInterruptsNetworkRead(t *testing.T) {
	for _, progress := range []bool{false, true} {
		t.Run(fmt.Sprint(progress), func(t *testing.T) {
			done := make(chan error, 1)
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				clear, err := resourceReadDeadline(w, r, 300*time.Millisecond)
				if err != nil {
					done <- err
					return
				}
				defer clear()
				defer r.Body.Close()
				_, err = io.ReadAll(r.Body)
				done <- err
				w.WriteHeader(204)
			}))
			defer srv.Close()
			conn, err := net.Dial("tcp", srv.Listener.Addr().String())
			if err != nil {
				t.Fatal(err)
			}
			defer conn.Close()
			_, err = fmt.Fprint(conn, "POST / HTTP/1.1\r\nHost: fixture\r\nContent-Length: 20\r\n\r\n")
			if err != nil {
				t.Fatal(err)
			}
			if progress {
				for i := 0; i < 20; i++ {
					if _, err = conn.Write([]byte("x")); err != nil {
						t.Fatal(err)
					}
					time.Sleep(25 * time.Millisecond)
				}
			}
			select {
			case err := <-done:
				if (err == nil) != progress {
					t.Fatalf("progress=%v read=%v", progress, err)
				}
			case <-time.After(2 * time.Second):
				t.Fatal("idle network read did not terminate")
			}
		})
	}
}
