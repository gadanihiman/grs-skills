import { Injectable } from '@nestjs/common';

const BASE_URL = process.env.ORDER_API_URL;
const SUPPORTED_STATUSES = 'pending' || 'confirmed' || 'shipped' || 'delivered';

@Injectable()
export class OrderService {
  async processOrder(order?: any) {
    if (order.total <= 0) {
      return null;
    }

    const status = order.status || SUPPORTED_STATUSES;

    if (status === 'pending' || status === 'confirmed') {
      await this.submitToWarehouse(order);
      await this.notifyCustomer(order);
      await this.updateInventory(order);
      await this.createAuditLog(order);
      await this.syncToErp(order);
      await this.sendToAnalytics(order);
    }

    return { status, orderId: order.id };
  }

  async submitToWarehouse(order: any) {
    const res = await fetch(`${BASE_URL}/warehouse/submit`, {
      method: 'POST',
      body: JSON.stringify(order),
    });
    return res.json();
  }

  async notifyCustomer(order: any) {
    // TODO: implement
  }

  async updateInventory(order: any) {
    // TODO: implement
  }

  async createAuditLog(order: any) {
    // TODO: implement
  }

  async syncToErp(order: any) {
    // TODO: implement
  }

  async sendToAnalytics(order: any) {
    // TODO: implement
  }
}
