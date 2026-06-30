export enum OrderStatus {
  PENDING = 'pending', // aguardando confirmação do restaurante
  ACCEPTED = 'accepted', // aceito pelo restaurante
  REJECTED = 'rejected', // recusado pelo restaurante
  PREPARING = 'preparing', // em preparo
  OUT_FOR_DELIVERY = 'out_for_delivery', // saiu para entrega
  DELIVERED = 'delivered', // entregue
  CANCELLED = 'cancelled', // cancelado pelo cliente
}