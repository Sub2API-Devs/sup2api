package notify

import (
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Perm("GET", "/notifications/channels", "settings:read", s.listChannels)
	r.Perm("GET", "/notifications", "settings:read", s.list)
	r.Perm("POST", "/notifications/test", "settings:manage", s.test)
}

// ChannelView is a channel as the console shows it.
type ChannelView struct {
	ID          string                 `json:"id"`
	PluginKey   string                 `json:"plugin_key"`
	PluginName  manifest.LocalizedText `json:"plugin_name"`
	Label       manifest.LocalizedText `json:"label"`
	Description manifest.LocalizedText `json:"description"`
	Recipient   string                 `json:"recipient"`
}

func (s *Service) listChannels(c *gin.Context) {
	out := []ChannelView{}
	for _, b := range s.NotificationChannels() {
		out = append(out, ChannelView{ID: b.Channel.ID, PluginKey: b.Plugin.Key, PluginName: pluginName(b.Plugin),
			Label: b.Channel.Label, Description: b.Channel.Description, Recipient: b.Channel.RecipientFormat()})
	}
	httpapi.OK(c, out)
}

// Record is one row of GET /notifications.
type Record struct {
	ID            int64      `json:"id"`
	Source        string     `json:"source"`
	Channel       string     `json:"channel"`
	Recipients    []string   `json:"recipients"`
	Subject       string     `json:"subject"`
	Body          string     `json:"body"`
	Severity      string     `json:"severity"`
	Status        string     `json:"status"`
	Attempts      int        `json:"attempts"`
	LastError     string     `json:"last_error"`
	NextAttemptAt time.Time  `json:"next_attempt_at"`
	CreatedAt     time.Time  `json:"created_at"`
	SentAt        *time.Time `json:"sent_at"`
}

// list is GET /notifications?status=&source=, newest first.
func (s *Service) list(c *gin.Context) {
	ctx := c.Request.Context()
	page, size := httpapi.Pagination(c)
	status, source := c.Query("status"), c.Query("source")
	const where = `WHERE ($1 = '' OR status = $1) AND ($2 = '' OR source = $2)`
	var total int64
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM notifications `+where, status, source).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows, err := s.db.Pool.Query(ctx, `SELECT id, source, channel, recipients, subject, body, severity, status, attempts, last_error,
		next_attempt_at, created_at, sent_at FROM notifications `+where+` ORDER BY id DESC LIMIT $3 OFFSET $4`, status, source, size, (page-1)*size)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	items := []Record{}
	for rows.Next() {
		var r Record
		if err := rows.Scan(&r.ID, &r.Source, &r.Channel, &r.Recipients, &r.Subject, &r.Body, &r.Severity, &r.Status, &r.Attempts,
			&r.LastError, &r.NextAttemptAt, &r.CreatedAt, &r.SentAt); err != nil {
			httpapi.Fail(c, err)
			return
		}
		items = append(items, r)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
}

// sourceTest is the source of console tests, so they do not count toward
// the rate limit of the core's own notifications.
const sourceTest = core.NotificationSourceCore + ":test"

// test is POST /notifications/test {channel, recipients}: a test message
// from the core, to check a channel's configuration.
func (s *Service) test(c *gin.Context) {
	var in struct {
		Channel    string   `json:"channel"`
		Recipients []string `json:"recipients"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	zh := core.Locale(c.Request.Context()) == "zh"
	subject, body := "Sub2API test notification", "This is a test notification. The channel works."
	if zh {
		subject, body = "Sub2API 测试通知", "这是一条测试通知，说明该渠道可以正常发送。"
	}
	r, err := s.Notify(c.Request.Context(), sourceTest, core.Notification{Channel: in.Channel, Recipients: in.Recipients,
		Subject: subject, Body: body})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"id": r.ID})
}

func pluginName(p core.PluginInfo) manifest.LocalizedText {
	if p.Manifest != nil && len(p.Manifest.Name) > 0 {
		return p.Manifest.Name
	}
	return manifest.LocalizedText{"en": p.Key}
}
