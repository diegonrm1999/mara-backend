// orders.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  emitOrderRefresh(supervisorId: string, cashierId: string, userId: string) {
    try {
      this.server.emit(`order-refresh-${cashierId}`, userId);
      this.server.emit(`order-refresh-${supervisorId}`, userId);
    } catch (error) {}
  }

  completeRefresh(supervisorId: string, cashierId: string, userId: string) {
    try {
      this.server.emit(`complete-refresh-${cashierId}`, userId);
      this.server.emit(`complete-refresh-${supervisorId}`, userId);
    } catch (error) {}
  }
}
