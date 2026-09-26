import { Global, Module } from '@nestjs/common';
import { Db } from './db';
import { SessionGuard } from './security';

@Global()
@Module({ providers: [Db, SessionGuard], exports: [Db, SessionGuard] })
export class SharedModule {}
