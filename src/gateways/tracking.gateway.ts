import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' }, // em produção, restringir origem
  namespace: '/tracking',
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  // Cliente entra na "sala" do pedido para receber atualizações
  @SubscribeMessage('joinOrder')
  handleJoinOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`order:${orderId}`);
    client.emit('joined', {
      orderId,
      message: 'Você está rastreando este pedido',
    });
  }

  // Chamado pelo OrdersService quando o status muda
  notifyOrderStatusChange(orderId: number, status: string) {
    this.server.to(`order:${orderId}`).emit('statusUpdate', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}