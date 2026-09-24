package usage

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestParseFilterClientRequestID(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)
	for _, self := range []*int64{nil, new(int64)} {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest("GET", "/usage?client_request_id=abc-123&request_id=r1", nil)
		f, err := parseFilter(c, self)
		if err != nil {
			t.Fatal(err)
		}
		sql := f.sql()
		if !strings.Contains(sql, "u.client_request_id = $") || !strings.Contains(sql, "u.request_id = $") {
			t.Fatalf("self=%v sql: %s", self != nil, sql)
		}
		found := false
		for _, a := range f.args {
			if a == "abc-123" {
				found = true
			}
		}
		if !found {
			t.Fatalf("args: %v", f.args)
		}
	}
}

func TestTruncClientRequestID(t *testing.T) {
	t.Parallel()
	long := strings.Repeat("x", 127) + "界界"
	got := trunc(long, 128)
	if len(got) != 127 || got != strings.Repeat("x", 127) {
		t.Fatalf("trunc = %q (%d)", got, len(got))
	}
	if trunc("short", 128) != "short" {
		t.Fatal("short")
	}
}
