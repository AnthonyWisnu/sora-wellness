import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BadRequestException, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Put, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import type { Response } from 'express';
import { Db } from '../shared/db';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';
import { SiteService } from './site.service';

const maxBytes = 5 * 1024 * 1024;
const mediaDirectory = resolve(process.env.MEDIA_STORAGE_DIR ?? 'uploads');
type Upload = { originalname: string; mimetype: string; size: number; buffer: Buffer };

function imageType(file: Upload): { mime: string; extension: string } | null {
  const b = file.buffer;
  if (file.mimetype === 'image/jpeg' && b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[b.length-2] === 0xff && b[b.length-1] === 0xd9) return { mime: 'image/jpeg', extension: 'jpg' };
  if (file.mimetype === 'image/png' && b.length >= 24 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.subarray(12,16).toString() === 'IHDR') return { mime: 'image/png', extension: 'png' };
  if (file.mimetype === 'image/webp' && b.length >= 16 && b.subarray(0,4).toString() === 'RIFF' && b.subarray(8,12).toString() === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
  return null;
}

export class ContentDto {
  @ApiProperty() @IsString() @Length(2, 120) name!: string;
  @ApiProperty() @IsString() @Length(0, 3000) description!: string;
  @ApiProperty() @IsString() @Length(0, 500) address!: string;
  @ApiProperty() @IsString() @Length(0, 160) heroTitle!: string;
  @ApiProperty() @IsString() @Length(0, 300) heroSubtitle!: string;
  @ApiProperty({ nullable: true, format: 'uuid' }) @IsOptional() @IsUUID() logoMediaId!: string | null;
  @ApiProperty({ nullable: true, format: 'uuid' }) @IsOptional() @IsUUID() heroMediaId!: string | null;
  @ApiProperty({ type: [String], format: 'uuid' }) @IsArray() @ArrayMaxSize(12) @IsUUID('4', { each: true }) galleryMediaIds!: string[];
}

@ApiTags('public') @Controller('public/media')
export class PublicMediaController {
  constructor(private readonly db: Db) {}
  @Get(':id')
  async image(@Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    const found = await this.db.query<{ storage_path: string; mime_type: string }>('SELECT storage_path,mime_type FROM media_assets WHERE id=$1', [id]);
    if (!found.rows[0]) throw new NotFoundException('Gambar tidak ditemukan');
    try {
      const bytes = await readFile(resolve(mediaDirectory, found.rows[0].storage_path));
      response.setHeader('Content-Type', found.rows[0].mime_type);
      response.setHeader('Cache-Control', 'no-store');
      response.send(bytes);
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') throw new NotFoundException('Berkas gambar tidak ditemukan');
      throw error;
    }
  }
}

@ApiTags('admin content') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard)
@Controller('admin')
export class AdminContentController {
  constructor(private readonly db: Db, private readonly site: SiteService) {}

  @Get('content')
  async content(@Req() req: AuthRequest) {
    assertRole(req, 'admin');
    const studio = (await this.db.query(`SELECT name,description,address,hero_title AS "heroTitle",hero_subtitle AS "heroSubtitle",logo_media_id AS "logoMediaId",hero_media_id AS "heroMediaId" FROM studio WHERE id=1`)).rows[0];
    const gallery = await this.db.query<{ media_id: string }>('SELECT media_id FROM studio_gallery WHERE studio_id=1 ORDER BY position');
    return { ...studio, galleryMediaIds: gallery.rows.map(row => row.media_id) };
  }

  @Put('content')
  async update(@Req() req: AuthRequest, @Body() body: ContentDto) {
    assertRole(req, 'admin');
    if (new Set(body.galleryMediaIds).size !== body.galleryMediaIds.length) throw new BadRequestException('Foto galeri tidak boleh diulang');
    const current = await this.site.draft();
    const document = current.document;
    document.profile = { name: body.name, description: body.description, address: body.address, logoMediaId: body.logoMediaId, heroMediaId: body.heroMediaId, galleryMediaIds: body.galleryMediaIds };
    const hero = document.pages.home.find(section => section.type === 'hero')!;
    hero.title = body.heroTitle;
    hero.body = body.heroSubtitle;
    const saved = await this.site.save(document, current.draftVersion);
    await this.site.publish(saved.draftVersion, assertRole(req, 'admin').id);
    return this.content(req);
  }

  @Get('media')
  async listMedia(@Req() req: AuthRequest) {
    assertRole(req, 'admin');
    return (await this.db.query(`SELECT a.id,a.filename,a.mime_type AS "mimeType",a.byte_size AS "byteSize",a.created_at AS "createdAt",
      (s.logo_media_id=a.id OR s.hero_media_id=a.id OR EXISTS(SELECT 1 FROM studio_gallery g WHERE g.studio_id=1 AND g.media_id=a.id) OR EXISTS(SELECT 1 FROM site_content_media cm WHERE cm.media_id=a.id)) AS used
      FROM media_assets a CROSS JOIN studio s WHERE s.id=1 ORDER BY a.created_at DESC`)).rows.map(row => ({ ...row, url: `/api/v1/public/media/${row.id}` }));
  }

  @Post('media') @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: maxBytes, files: 1 } }))
  async upload(@Req() req: AuthRequest, @UploadedFile() file?: Upload) {
    const admin = assertRole(req, 'admin');
    if (!file || file.size < 1 || file.size > maxBytes) throw new BadRequestException('Gambar wajib ada dan maksimal 5 MB');
    const detected = imageType(file);
    if (!detected) throw new BadRequestException('Hanya gambar JPG, PNG, atau WebP yang valid');
    const id = randomUUID();
    const storagePath = `${id}.${detected.extension}`;
    const originalName = file.originalname.replace(/[\\/]/g, '_').slice(0,255) || storagePath;
    await mkdir(mediaDirectory, { recursive: true });
    await writeFile(resolve(mediaDirectory, storagePath), file.buffer, { flag: 'wx' });
    try {
      await this.db.query('INSERT INTO media_assets (id,filename,mime_type,byte_size,storage_path,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6)', [id,originalName,detected.mime,file.size,storagePath,admin.id]);
    } catch (error) { await unlink(resolve(mediaDirectory, storagePath)); throw error; }
    return { id, filename: originalName, mimeType: detected.mime, byteSize: file.size, url: `/api/v1/public/media/${id}`, used: false };
  }

  @Delete('media/:id')
  async remove(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    assertRole(req, 'admin');
    let path: string;
    try {
      path = await this.db.transaction(async client => {
        const found = await client.query<{ storage_path: string }>('SELECT storage_path FROM media_assets WHERE id=$1 FOR UPDATE', [id]);
        if (!found.rows[0]) throw new NotFoundException('Gambar tidak ditemukan');
        const used = await client.query('SELECT 1 FROM studio WHERE logo_media_id=$1 OR hero_media_id=$1 UNION ALL SELECT 1 FROM studio_gallery WHERE media_id=$1 UNION ALL SELECT 1 FROM site_content_media WHERE media_id=$1 LIMIT 1', [id]);
        if (used.rowCount) throw new ConflictException('Gambar masih digunakan oleh konten publik');
        await client.query('DELETE FROM media_assets WHERE id=$1', [id]);
        return found.rows[0].storage_path;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23503') throw new ConflictException('Gambar masih digunakan oleh konten publik');
      throw error;
    }
    await unlink(resolve(mediaDirectory, path)).catch(error => { if ((error as { code?: string }).code !== 'ENOENT') throw error; });
    return { deleted: true };
  }
}
