import { Module } from '@nestjs/common';
import { TsunamiController } from './tsunami.controller';
import { TsunamiService } from './tsunami.service';

@Module({ controllers: [TsunamiController], providers: [TsunamiService], exports: [TsunamiService] })
export class TsunamiModule {}
