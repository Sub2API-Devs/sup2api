-- Notifications (CONTRACTS §74.4): the plugin that provided the channel when
-- the notification was queued. Only that plugin may deliver it: a channel id
-- that passed to another plugin does not hand it the queued notifications.
-- NULL on rows queued before, which any provider of the channel delivers.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider varchar(64);
