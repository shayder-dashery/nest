import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ORDER_EVENTS_QUEUE } from '../queues/queue-names';

type OrderCreatedJob = {
  orderId: number;
  customerId: number;
  restaurantId: number;
  total: number;
};

@Processor(ORDER_EVENTS_QUEUE)
export class OrderEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderEventsProcessor.name);

  async process(job: Job<OrderCreatedJob>): Promise<void> {
    if (job.name === 'order.created') {
      await this.handleOrderCreated(job.data);
      return;
    }

    this.logger.warn(`Job desconhecido recebido: ${job.name}`);
  }

  private async handleOrderCreated(data: OrderCreatedJob): Promise<void> {
    this.logger.log(
      `Pedido ${data.orderId} criado para o restaurante ${data.restaurantId}. Total: ${data.total}`,
    );

    // Bom ponto para evoluir em aula: notificar restaurante, enviar e-mail,
    // disparar webhook ou atualizar metricas sem travar a resposta da API.
  }
}
