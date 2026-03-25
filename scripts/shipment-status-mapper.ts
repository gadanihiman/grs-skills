// G3: class name is generic — could be more specific e.g. AcmeShipmentStatusMapper
export class ShipmentStatusMapper {

  // G3: method name 'map' is too vague — 'toInternalStatus' would be clearer
  map(externalStatus: string): string | null {
    switch (externalStatus) {
      case 'DISPATCHED':
      case 'IN_TRANSIT':
        return 'in_transit';
      case 'DELIVERED':
        return 'finalised';
      case 'FAILED_DELIVERY':
      case 'RETURNED':
        return 'failed';
      // G2: magic string 'PENDING_COLLECTION' used inline — could be a named constant
      case 'PENDING_COLLECTION':
        return 'pending';
      default:
        return null;
    }
  }
}
