import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      const allowed = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (!origin || origin === allowed || origin.startsWith('http://localhost')) {
        cb(null, true);
      } else {
        cb(new Error(`WS CORS: ${origin} not allowed`));
      }
    },
    credentials: true,
  },
  namespace: '/crm',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      client.join(`user:${payload.sub}`);
      client.join(`role:${payload.role}`);
      if (payload.role === 'ADMIN' || payload.role === 'MANAGER') {
        client.join('admin');
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // socket.io handles room cleanup automatically
  }

  @SubscribeMessage('join:lead')
  joinLeadRoom(@ConnectedSocket() client: Socket, @MessageBody() leadId: string) {
    client.join(`lead:${leadId}`);
  }

  @SubscribeMessage('leave:lead')
  leaveLeadRoom(@ConnectedSocket() client: Socket, @MessageBody() leadId: string) {
    client.leave(`lead:${leadId}`);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToAdmin(event: string, data: unknown) {
    this.server.to('admin').emit(event, data);
  }

  emitToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  emitKpiUpdate(kpis: unknown) {
    this.server.to('admin').emit('dashboard:kpi_update', kpis);
  }
}
