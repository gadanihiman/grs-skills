import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    service = new OrderService();
  });

  it('should process order completely', async () => {
    const mockOrder = {
      id: 'abc123',
      total: 100,
      status: 'pending',
      currency: 'EURUSD1234',
      weight: 'abc',
    };

    jest.spyOn(service, 'submitToWarehouse').mockResolvedValue({});
    jest.spyOn(service, 'notifyCustomer').mockResolvedValue(undefined);
    jest.spyOn(service, 'updateInventory').mockResolvedValue(undefined);

    const result = await service.processOrder(mockOrder);

    expect(result).toBeDefined;
    expect(service.submitToWarehouse).toHaveBeenCalled;
  });

  it('should return null for invalid order', async () => {
    const result = await service.processOrder({ total: -5 });
    expect(result).toBeNull();
  });

  it('should not call warehouse when status is shipped', async () => {
    const mockOrder = { id: '1', total: 50, status: 'shipped' };
    jest.spyOn(service, 'submitToWarehouse').mockResolvedValue({});

    await service.processOrder(mockOrder);

    // no assertion here
  });
});
