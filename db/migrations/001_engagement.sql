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

-- Owner-requested starting likes. Deterministic hashes keep this seed repeatable.
INSERT INTO website_post_likes (slug, visitor_hash)
SELECT seed.slug,
       md5('initial-like-v1:' || seed.slug || ':' || n::text) ||
       md5('initial-like-v1-extra:' || seed.slug || ':' || n::text)
FROM (VALUES
  ('personal/why-mercor', 7),
  ('personal/durable-executions', 11),
  ('finance/time-value-money', 9),
  ('finance/studying-abroad-1', 6),
  ('finance/local-stack', 4)
) AS seed(slug, likes)
CROSS JOIN LATERAL generate_series(1, seed.likes) AS n
ON CONFLICT (slug, visitor_hash) DO NOTHING;
