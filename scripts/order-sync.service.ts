import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';

// B1: module-level env read — will be undefined at import time
const API_BASE_URL = process.env.ORDER_API_URL;
const API_KEY = process.env.ORDER_API_KEY;

@Injectable()
export class OrderSyncService {
  private readonly logger = new Logger(OrderSyncService.name);

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private readonly httpService: HttpService,
  ) {}

  // G1: method is too long, handles 4 concerns
  async syncOrders(warehouseId: string): Promise<void> {
    const orders = await this.orderRepo.find({ where: { warehouseId } });

    for (const order of orders) {
      // B19: findOne without null check
      const warehouse = await this.orderRepo.findOne({ where: { id: warehouseId } });
      const warehouseName = warehouse.name;

      // B2: optional field used in comparison — quantity?: number silently false when undefined
      if (order.quantity <= 0) {
        this.logger.warn(`Skipping order ${order.id} with zero quantity`);
        continue;
      }

      let status = '';

      // B2: || chain — 'pending' is always truthy so status is always 'pending'
      status = order.externalStatus || 'pending' || 'unknown';

      const payload = {
        orderId: order.externalId,
        warehouse: warehouseName,
        status,
        items: order.items,
      };

      try {
        await this.httpService.axiosRef.post(
          `${API_BASE_URL}/orders/sync`,
          payload,
          { headers: { 'X-Api-Key': API_KEY } },
        );
        order.syncedAt = new Date();
        await this.orderRepo.save(order);
      } catch (err) {
        this.logger.error(`Failed to sync order ${order.id}`, err);
        // B12: swallows exception — caller never knows it failed
      }
    }
  }

  async getOrderStatus(orderId: string): Promise<string> {
    // B9: path mismatch — signature uses /v1/orders but request uses /orders
    const signaturePath = `/v1/orders/${orderId}`;
    const response = await this.httpService.axiosRef.get(
      `${API_BASE_URL}/orders/${orderId}`,
      { headers: { 'X-Signature': signaturePath } },
    );

    // B11: assumes { data: {} } but API returns { order: {} }
    return response.data.data?.status ?? 'unknown';
  }
}
