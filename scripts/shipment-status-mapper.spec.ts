import { ShipmentStatusMapper } from './shipment-status-mapper';

describe('ShipmentStatusMapper', () => {
  let mapper: ShipmentStatusMapper;

  beforeEach(() => {
    mapper = new ShipmentStatusMapper();
  });

  it('should map DISPATCHED to in_transit', () => {
    expect(mapper.map('DISPATCHED')).toBe('in_transit');
  });

  it('should map IN_TRANSIT to in_transit', () => {
    expect(mapper.map('IN_TRANSIT')).toBe('in_transit');
  });

  it('should map DELIVERED to finalised', () => {
    expect(mapper.map('DELIVERED')).toBe('finalised');
  });

  it('should map FAILED_DELIVERY to failed', () => {
    expect(mapper.map('FAILED_DELIVERY')).toBe('failed');
  });

  it('should map RETURNED to failed', () => {
    expect(mapper.map('RETURNED')).toBe('failed');
  });

  it('should map PENDING_COLLECTION to pending', () => {
    expect(mapper.map('PENDING_COLLECTION')).toBe('pending');
  });

  // G6: test name is a bit vague — 'unknown status' without specifying what 'unknown' means
  it('should return null for unknown status', () => {
    expect(mapper.map('SOME_OTHER_STATUS')).toBeNull();
  });
});
