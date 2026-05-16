import { CarrierLabelFormatter, LabelData } from './carrier-label-formatter';
import { ConfigService } from '@nestjs/config';

const mockConfigService = {
  get: jest.fn().mockReturnValue('v1'),
} as unknown as ConfigService;

const sampleLabel: LabelData = {
  trackingNumber: 'TRACK-001',
  recipient: 'Jane Doe',
  address: '123 Main Street, Amsterdam',
  weight: 2.5,
  serviceCode: 'EXPRESS',
};

describe('CarrierLabelFormatter', () => {
  let formatter: CarrierLabelFormatter;

  beforeEach(() => {
    formatter = new CarrierLabelFormatter(mockConfigService);
  });

  describe('format', () => {
    it('should include tracking number in plain text output', () => {
      const result = formatter.format(sampleLabel, 'PDF');
      expect(result).toContain('TRACK-001');
    });

    it('should wrap ZPL output in ^XA and ^XZ markers', () => {
      const result = formatter.format(sampleLabel, 'ZPL');
      expect(result.startsWith('^XA')).toBe(true);
      expect(result.endsWith('^XZ')).toBe(true);
    });

    it('should include recipient name in output', () => {
      const result = formatter.format(sampleLabel, 'PDF');
      expect(result).toContain('Jane Doe');
    });

    it('should read template version from config', () => {
      formatter.format(sampleLabel, 'PDF');
      expect(mockConfigService.get).toHaveBeenCalledWith('LABEL_TEMPLATE_VERSION');
    });
  });
});
