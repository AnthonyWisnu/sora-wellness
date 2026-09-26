import { Module } from '@nestjs/common';
import { AdminContentController, PublicMediaController } from './content';
import { AdminSiteController, PublicSiteController } from './site.controller';
import { SiteService } from './site.service';

@Module({ controllers: [AdminContentController, PublicMediaController, AdminSiteController, PublicSiteController], providers: [SiteService] })
export class ContentModule {}
