package usage

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// Usage export (CONTRACTS §66.5): GET /me/usage/export and GET /usage/export
// take the list's filters plus tz= (the time column's zone) and lang=zh|en
// (the header row), and stream CSV newest first, keyset-paged so a long
// export never runs one large query. At most exportMaxRows rows; a longer
// result ends with a note row. Cells a spreadsheet would read as a formula
// are prefixed with '. The self-service export has no account or upstream
// columns, like the list. Every export is audited.

const (
	exportMaxRows = 100_000
	exportBatch   = 1000
)

type exportColumn struct {
	zh, en string
	admin  bool // operators only
	value  func(r *Record, loc *time.Location) string
}

var exportColumns = []exportColumn{
	{"时间", "Time", false, func(r *Record, loc *time.Location) string { return r.CreatedAt.In(loc).Format("2006-01-02 15:04:05") }},
	{"请求 ID", "Request ID", false, func(r *Record, _ *time.Location) string { return r.RequestID }},
	{"客户端请求 ID", "Client request ID", false, func(r *Record, _ *time.Location) string { return r.ClientRequestID }},
	{"用户", "User", true, func(r *Record, _ *time.Location) string { return r.UserEmail }},
	{"API 密钥", "API key", false, func(r *Record, _ *time.Location) string { return r.APIKeyName }},
	{"分组", "Group", false, func(r *Record, _ *time.Location) string { return r.GroupName }},
	{"账号", "Account", true, func(r *Record, _ *time.Location) string { return r.AccountName }},
	{"模型", "Model", false, func(r *Record, _ *time.Location) string { return r.Model }},
	{"上游模型", "Upstream model", true, func(r *Record, _ *time.Location) string { return r.UpstreamModel }},
	{"端点", "Endpoint", false, func(r *Record, _ *time.Location) string { return r.Endpoint }},
	{"协议", "Protocol", false, func(r *Record, _ *time.Location) string { return r.Protocol }},
	{"流式", "Stream", false, func(r *Record, _ *time.Location) string { return strconv.FormatBool(r.Stream) }},
	{"状态码", "Status", false, func(r *Record, _ *time.Location) string { return strconv.Itoa(r.StatusCode) }},
	{"成功", "Success", false, func(r *Record, _ *time.Location) string { return strconv.FormatBool(r.Success) }},
	{"错误类型", "Error type", false, func(r *Record, _ *time.Location) string { return r.ErrorType }},
	{"输入 Token", "Input tokens", false, func(r *Record, _ *time.Location) string { return strconv.FormatInt(r.InputTokens, 10) }},
	{"输出 Token", "Output tokens", false, func(r *Record, _ *time.Location) string { return strconv.FormatInt(r.OutputTokens, 10) }},
	{"缓存读取 Token", "Cache read tokens", false, func(r *Record, _ *time.Location) string { return strconv.FormatInt(r.CacheReadTokens, 10) }},
	{"缓存写入 Token", "Cache write tokens", false, func(r *Record, _ *time.Location) string {
		return strconv.FormatInt(r.CacheCreationTokens+r.CacheCreation1hTokens, 10)
	}},
	{"费用", "Cost", false, func(r *Record, _ *time.Location) string { return r.TotalCost.String() }},
	{"原价", "List price", false, func(r *Record, _ *time.Location) string {
		if r.RateMultiplier.IsPositive() {
			return r.TotalCost.DivRound(r.RateMultiplier, 8).String()
		}
		return decimal.Zero.String()
	}},
	{"倍率", "Multiplier", false, func(r *Record, _ *time.Location) string { return r.RateMultiplier.String() }},
	{"计费状态", "Billing status", false, func(r *Record, _ *time.Location) string { return r.BillingStatus }},
	{"首 token (ms)", "First token (ms)", false, func(r *Record, _ *time.Location) string { return strconv.Itoa(r.FirstTokenMs) }},
	{"耗时 (ms)", "Duration (ms)", false, func(r *Record, _ *time.Location) string { return strconv.Itoa(r.LatencyMs) }},
	{"调用 IP", "Client IP", false, func(r *Record, _ *time.Location) string { return r.ClientIP }},
}

func (s *Service) myExport(c *gin.Context) {
	uid, _ := core.UserID(c.Request.Context())
	s.export(c, &uid)
}

func (s *Service) allExport(c *gin.Context) { s.export(c, nil) }

func (s *Service) export(c *gin.Context, self *int64) {
	ctx := c.Request.Context()
	// Validate the filters before any byte of the file is sent; each page
	// below parses them again and adds its keyset bound.
	if _, err := parseFilter(c, self); err != nil {
		httpapi.Fail(c, err)
		return
	}
	_, loc, err := parseTZ(c)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	lang := c.Query("lang")
	if lang == "" {
		lang = "en"
		if strings.HasPrefix(strings.ToLower(c.GetHeader("Accept-Language")), "zh") {
			lang = "zh"
		}
	}
	if lang != "zh" && lang != "en" {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("lang must be zh or en"))
		return
	}
	var cols []exportColumn
	for _, col := range exportColumns {
		if !col.admin || self == nil {
			cols = append(cols, col)
		}
	}
	name := "usage_" + time.Now().In(loc).Format("20060102_150405") + ".csv"
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="`+name+`"`)
	c.Header("Cache-Control", "no-store")
	c.Status(http.StatusOK)
	_, _ = c.Writer.Write([]byte{0xEF, 0xBB, 0xBF}) // UTF-8 BOM: spreadsheets then read the file as UTF-8
	w := csv.NewWriter(c.Writer)
	head := make([]string, len(cols))
	for i, col := range cols {
		head[i] = col.en
		if lang == "zh" {
			head[i] = col.zh
		}
	}
	_ = w.Write(head)

	rows, truncated := 0, false
	var cursorAt time.Time
	var cursorID int64
	for rows < exportMaxRows {
		page, err := parseFilter(c, self)
		if err != nil {
			break
		}
		if cursorID != 0 {
			page.And("(u.created_at, u.id) < (?, ?)", cursorAt, cursorID)
		}
		args, cond := page.Args(), page.Cond()
		batch := min(exportBatch, exportMaxRows-rows)
		q, err := s.db.Pool.Query(ctx, `SELECT `+recordColumns+recordJoins+cond+
			` ORDER BY u.created_at DESC, u.id DESC LIMIT `+strconv.Itoa(batch+1), args...)
		if err != nil {
			// Headers are sent: end the file with the error so it is not
			// mistaken for a complete export.
			_ = w.Write([]string{"# export failed: " + err.Error()})
			break
		}
		n := 0
		more := false
		for q.Next() {
			if n == batch {
				more = true
				break
			}
			var r Record
			if err := q.Scan(r.scanTargets()...); err != nil {
				q.Close()
				_ = w.Write([]string{"# export failed: " + err.Error()})
				w.Flush()
				return
			}
			if self != nil {
				r.hideUpstream()
			}
			line := make([]string, len(cols))
			for i, col := range cols {
				line[i] = csvCell(col.value(&r, loc))
			}
			_ = w.Write(line)
			n++
			cursorAt, cursorID = r.CreatedAt, r.ID
		}
		q.Close()
		rows += n
		w.Flush()
		if !more {
			break
		}
		if rows >= exportMaxRows {
			truncated = true
		}
	}
	if truncated {
		_ = w.Write([]string{fmt.Sprintf("# truncated at %d rows; narrow the time range or filters", exportMaxRows)})
	}
	w.Flush()
	uid, _ := core.UserID(ctx)
	detail, _ := json.Marshal(map[string]any{"rows": rows, "truncated": truncated, "self": self != nil, "query": c.Request.URL.RawQuery})
	_, _ = s.db.Pool.Exec(ctx, `INSERT INTO audit_logs (user_id, action, target_type, detail, ip) VALUES ($1, 'usage.export', 'usage', $2, $3)`,
		uid, detail, c.ClientIP())
}

// csvCell keeps a spreadsheet from evaluating a text cell as a formula.
func csvCell(v string) string {
	if v != "" && strings.ContainsRune("=+-@\t\r", rune(v[0])) {
		return "'" + v
	}
	return v
}
