CREATE TABLE IF NOT EXISTS website_metrics (
  name text PRIMARY KEY,
  value bigint NOT NULL CHECK (value >= 0)
);

INSERT INTO website_metrics (name, value)
VALUES ('page_views', 1000)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS website_post_likes (
  slug text NOT NULL,
  visitor_hash text NOT NULL CHECK (visitor_hash ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY (slug, visitor_hash)
);
