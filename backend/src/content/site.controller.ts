import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsObject, Min } from 'class-validator';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';
import { SiteService } from './site.service';
import { initialSiteDocument } from './site-document';

const siteExample = initialSiteDocument({ name: 'Studio Wellness', description: 'Ruang untuk bergerak', address: 'Denpasar, Bali', logoMediaId: null, heroMediaId: null, galleryMediaIds: [] });

class SaveSiteDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedVersion!: number;
  @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() document!: Record<string, unknown>;
}
class PublishSiteDto { @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedVersion!: number; }

@ApiTags('public') @Controller('public/site')
export class PublicSiteController {
  constructor(private readonly site: SiteService) {}
  @ApiOkResponse({ description: 'Dokumen situs yang sudah terbit; draf admin tidak disertakan.', schema: { example: siteExample } })
  @Get() async read() { return this.site.publicDocument(); }
}

@ApiTags('admin site') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard) @Controller('admin/site')
export class AdminSiteController {
  constructor(private readonly site: SiteService) {}
  @ApiOkResponse({ schema: { example: { document: siteExample, draftVersion: 2, publishedVersion: 1, updatedAt: '2026-09-26T00:00:00.000Z', publishedAt: '2026-09-25T00:00:00.000Z' } } })
  @Get() async read(@Req() req: AuthRequest) { assertRole(req, 'admin'); return this.site.draft(); }
  @ApiOkResponse({ description: 'Hanya draf untuk pratinjau admin.', schema: { example: siteExample } })
  @Get('preview') async preview(@Req() req: AuthRequest) { assertRole(req, 'admin'); return (await this.site.draft()).document; }
  @ApiBody({ schema: { example: { expectedVersion: 1, document: siteExample } } })
  @Put() async save(@Req() req: AuthRequest, @Body() body: SaveSiteDto) { assertRole(req, 'admin'); return this.site.save(body.document, body.expectedVersion); }
  @ApiBody({ schema: { example: { expectedVersion: 2 } } })
  @Post('publish') async publish(@Req() req: AuthRequest, @Body() body: PublishSiteDto) { const admin = assertRole(req, 'admin'); return this.site.publish(body.expectedVersion, admin.id); }
}
