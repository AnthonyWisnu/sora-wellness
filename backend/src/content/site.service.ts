import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { Db } from '../shared/db';
import { initialSiteDocument, parseSiteDocument, referencedMedia, validatePublishedDocument, SiteDocument } from './site-document';

type SiteRow = { draft: SiteDocument; published: SiteDocument; draft_version: number; published_version: number; updated_at: Date; published_at: Date };

@Injectable()
export class SiteService {
  constructor(private readonly db: Db) {}

  private async ensure(): Promise<void> {
    if ((await this.db.query('SELECT 1 FROM site_content WHERE studio_id=1')).rowCount) return;
    await this.db.transaction(async (client) => {
      const studio = await client.query<{ name: string; description: string; address: string; hero_title: string; hero_subtitle: string; logo_media_id: string | null; hero_media_id: string | null }>('SELECT name,description,address,hero_title,hero_subtitle,logo_media_id,hero_media_id FROM studio WHERE id=1 FOR UPDATE');
      const existing = await client.query('SELECT 1 FROM site_content WHERE studio_id=1');
      if (existing.rowCount) return;
      const row = studio.rows[0];
      if (!row) throw new BadRequestException('Studio belum tersedia');
      const gallery = await client.query<{ media_id: string }>('SELECT media_id FROM studio_gallery WHERE studio_id=1 ORDER BY position');
      const document = initialSiteDocument({ name: row.name, description: row.description, address: row.address, logoMediaId: row.logo_media_id, heroMediaId: row.hero_media_id, galleryMediaIds: gallery.rows.map(item => item.media_id) });
      document.pages.home[0].title = row.hero_title || row.name;
      document.pages.home[0].body = row.hero_subtitle || row.description;
      await client.query('INSERT INTO site_content (studio_id,draft,published) VALUES (1,$1,$1)', [document]);
      await this.syncMedia(client, 'draft', document);
      await this.syncMedia(client, 'published', document);
    });
  }

  private async row(): Promise<SiteRow> {
    await this.ensure();
    return (await this.db.query<SiteRow>('SELECT draft,published,draft_version,published_version,updated_at,published_at FROM site_content WHERE studio_id=1')).rows[0];
  }

  async publicDocument() { return (await this.row()).published; }
  async draft() {
    const row = await this.row();
    return { document: row.draft, draftVersion: row.draft_version, publishedVersion: row.published_version, updatedAt: row.updated_at, publishedAt: row.published_at };
  }

  private async syncMedia(client: PoolClient, kind: 'draft' | 'published', document: SiteDocument) {
    const ids = referencedMedia(document);
    const found = await client.query('SELECT id FROM media_assets WHERE id=ANY($1::uuid[]) FOR SHARE', [ids]);
    if (found.rowCount !== ids.length) throw new BadRequestException('Ada gambar yang tidak ditemukan');
    await client.query('DELETE FROM site_content_media WHERE studio_id=1 AND kind=$1', [kind]);
    for (const id of ids) await client.query('INSERT INTO site_content_media (studio_id,kind,media_id) VALUES (1,$1,$2)', [kind,id]);
  }

  async save(raw: unknown, expectedVersion: number) {
    const document = parseSiteDocument(raw);
    await this.ensure();
    await this.db.transaction(async client => {
      const row = (await client.query<SiteRow>('SELECT * FROM site_content WHERE studio_id=1 FOR UPDATE')).rows[0];
      if (row.draft_version !== expectedVersion) throw new ConflictException('Draf telah berubah. Muat ulang sebelum menyimpan.');
      await this.syncMedia(client, 'draft', document);
      await client.query('UPDATE site_content SET draft=$1,draft_version=draft_version+1,updated_at=now() WHERE studio_id=1', [document]);
    });
    return this.draft();
  }

  private async validateFeatured(client: PoolClient, document: SiteDocument) {
    const classIds = [...new Set(Object.values(document.pages).flatMap(sections => sections.filter(section => section.visible).flatMap(section => section.featuredClassTypeIds)))];
    const packageIds = [...new Set(Object.values(document.pages).flatMap(sections => sections.filter(section => section.visible).flatMap(section => section.featuredPackageOptionIds)))];
    if (classIds.length) {
      const classes = await client.query('SELECT id FROM class_types WHERE id=ANY($1::uuid[]) AND active=true', [classIds]);
      if (classes.rowCount !== classIds.length) throw new BadRequestException('Ada jenis kelas unggulan yang tidak aktif');
    }
    if (packageIds.length) {
      const packages = await client.query('SELECT id FROM package_options WHERE id=ANY($1::uuid[]) AND active=true', [packageIds]);
      if (packages.rowCount !== packageIds.length) throw new BadRequestException('Ada paket unggulan yang tidak aktif');
    }
  }

  async publish(expectedVersion: number, adminId: string) {
    await this.ensure();
    await this.db.transaction(async client => {
      const row = (await client.query<SiteRow>('SELECT * FROM site_content WHERE studio_id=1 FOR UPDATE')).rows[0];
      if (row.draft_version !== expectedVersion) throw new ConflictException('Draf telah berubah. Muat ulang sebelum menerbitkan.');
      if (row.published_version === row.draft_version) return;
      const document = parseSiteDocument(row.draft);
      validatePublishedDocument(document);
      await this.validateFeatured(client, document);
      await this.syncMedia(client, 'published', document);
      const profile = document.profile;
      const hero = document.pages.home.find(section => section.type === 'hero')!;
      await client.query('UPDATE studio SET name=$1,description=$2,address=$3,hero_title=$4,hero_subtitle=$5,logo_media_id=$6,hero_media_id=$7,updated_at=now() WHERE id=1', [profile.name,profile.description,profile.address,hero.title,hero.body,profile.logoMediaId,profile.heroMediaId]);
      await client.query('DELETE FROM studio_gallery WHERE studio_id=1');
      for (let position=0; position<profile.galleryMediaIds.length; position++) await client.query('INSERT INTO studio_gallery (studio_id,media_id,position) VALUES (1,$1,$2)', [profile.galleryMediaIds[position],position]);
      await client.query('UPDATE site_content SET published=$1,published_version=draft_version,published_at=now() WHERE studio_id=1', [document]);
      await client.query('INSERT INTO site_publications (studio_id,version,document,published_by) VALUES (1,$1,$2,$3)', [row.draft_version,document,adminId]);
    });
    return this.draft();
  }
}
