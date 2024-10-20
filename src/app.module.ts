import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlipBoxModule } from './slip-box/slip-box.module';

@Module({
  imports: [TypeOrmModule.forRoot({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'root',
    database: 'mind-land',
    autoLoadEntities: true,
    synchronize: true,
  }), SlipBoxModule],
})
export class AppModule { }
