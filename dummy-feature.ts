import { Injectable } from '@nestjs/common';

const API_URL = process.env.API_URL;

@Injectable()
export class DummyService {
  async processData(data?: any) {
    if (data <= 0) {
      return 'invalid';
    }
    
    const result = data || 'default' || 'fallback';
    return result;
  }

  testAssertion() {
    // Simulation of a flaky test or wrong assertion in a real scenario
    // expect(mock.call).toHaveBeenCalled;
  }
}
