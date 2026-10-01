package gateway

import (
	"bytes"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"os"
	"testing"
)

func TestResponseSpoolSpillsAndRemovesPrivateFile(t *testing.T) {
	rr := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rr)
	spool := newBufferedResponse(ctx.Writer)
	data := bytes.Repeat([]byte("s"), 2<<20)
	if _, err := spool.Write(data); err != nil {
		t.Fatal(err)
	}
	if spool.file == nil || rr.Body.Len() != 0 {
		t.Fatal("spool did not isolate response")
	}
	path := spool.file.Name()
	if err := spool.publish(); err != nil {
		t.Fatal(err)
	}
	spool.close()
	if !bytes.Equal(rr.Body.Bytes(), data) {
		t.Fatal("spilled response corrupted")
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("temporary response retained", err)
	}
}
