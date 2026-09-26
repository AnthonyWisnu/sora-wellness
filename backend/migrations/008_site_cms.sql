CREATE TABLE site_content (
  studio_id integer PRIMARY KEY REFERENCES studio(id),
  draft jsonb NOT NULL,
  published jsonb NOT NULL,
  draft_version integer NOT NULL DEFAULT 1,
  published_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_content_media (
  studio_id integer NOT NULL REFERENCES studio(id),
  kind text NOT NULL CHECK (kind IN ('draft', 'published')),
  media_id uuid NOT NULL REFERENCES media_assets(id),
  PRIMARY KEY (studio_id, kind, media_id)
);

CREATE TABLE site_publications (
  studio_id integer NOT NULL REFERENCES studio(id),
  version integer NOT NULL,
  document jsonb NOT NULL,
  published_by uuid NOT NULL REFERENCES app_users(id),
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (studio_id, version)
);
