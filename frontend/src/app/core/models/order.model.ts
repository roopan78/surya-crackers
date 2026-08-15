import { PaymentProviderType, PaymentStatus } from './payment.model';

export type OrderStatus = 'PENDING' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED';
export type CustomerType = 'GUEST' | 'REGISTERED';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  boxQuantity: string;
  boxes: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerType: CustomerType;
  customerId: string | null;
  customerName: string | null;
  customerMobile: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
  notes: string | null;
  items: OrderItem[];
  estimatedTotal: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** Null until staff record how the order was paid — checkout decides nothing. */
  paymentProvider: PaymentProviderType | null;
  paymentReference: string | null;
  /** Only ever set on historical orders from the withdrawn UPI flow. */
  utrNumber: string | null;
  createdAt: string;
  updatedAt: string;
}
