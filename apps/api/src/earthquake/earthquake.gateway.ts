import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/hazards', cors: { origin: '*' } })
export class EarthquakeGateway implements OnGatewayInit {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(EarthquakeGateway.name);

  constructor(private readonly redis: RedisService) {}

  afterInit() {
    setTimeout(() => {
      void this.redis.subscribe('earthquake:new', (message) => {
        const earthquake = JSON.parse(message) as unknown;
        this.server.emit('earthquake:new', earthquake);
        this.logger.debug('Broadcast new earthquake');
      });
    }, 3000);
  }
}
