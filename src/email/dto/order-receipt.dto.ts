export interface OrderReceiptData {
  orderNumber: string;
  ticketNumber: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  shopName: string;
  shopAddress1: string;
  shopAddress2: string;
  shopAddress3: string;
  shopPhone: string;
  shopRuc: string;
  date: string;
  time: string;
  stylistName: string;
  supervisorName: string;
  cashierName: string;
  treatments: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  totalPrice: number;
  paidAmount: number;
  paymentMethod: string;
  currency: string;
}
