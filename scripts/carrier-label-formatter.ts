import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LabelData {
  trackingNumber: string;
  recipient: string;
  address: string;
  weight: number;
  serviceCode: string;
}

export type LabelFormat = 'PDF' | 'ZPL' | 'PNG';

@Injectable()
export class CarrierLabelFormatter {
  constructor(private readonly configService: ConfigService) {}

  format(data: LabelData, format: LabelFormat): string {
    const template = this.configService.get<string>('LABEL_TEMPLATE_VERSION') ?? 'v1';
    return this.buildLabel(data, format, template);
  }

  private buildLabel(data: LabelData, format: LabelFormat, template: string): string {
    const lines = [
      `TRACKING: ${data.trackingNumber}`,
      `TO: ${data.recipient}`,
      `ADDRESS: ${data.address}`,
      `WEIGHT: ${data.weight}kg`,
      `SERVICE: ${data.serviceCode}`,
      `TEMPLATE: ${template}`,
    ];

    if (format === 'ZPL') {
      return `^XA\n${lines.map(l => `^FD${l}^FS`).join('\n')}\n^XZ`;
    }

    return lines.join('\n');
  }
}
