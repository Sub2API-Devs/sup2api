-- Built-in plugins ship inside the image and are installed and enabled by the
-- core at startup. They can be disabled but never uninstalled.
ALTER TABLE plugins ADD COLUMN builtin boolean NOT NULL DEFAULT false;
