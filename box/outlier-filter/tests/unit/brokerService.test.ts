import { BrokerService } from '../../src/brokerService';
import { EnvService } from '../../src/envService';

jest.mock('../../src/envService');

describe('BrokerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConnectionOptions', () => {
    it('should return connection options with broker URL', () => {
      const mockBrokerURL = 'nats://localhost:4222';
      (EnvService.getBrokerURL as jest.Mock).mockReturnValue(mockBrokerURL);

      const options = BrokerService.getConnectionOptions();

      expect(options).toEqual({
        servers: mockBrokerURL
      });
      expect(EnvService.getBrokerURL).toHaveBeenCalled();
    });

    it('should handle multiple server URLs', () => {
      const mockBrokerURL = 'nats://localhost:4222,nats://localhost:4223';
      (EnvService.getBrokerURL as jest.Mock).mockReturnValue(mockBrokerURL);

      const options = BrokerService.getConnectionOptions();

      expect(options.servers).toBe(mockBrokerURL);
    });

    it('should handle secure NATS connection', () => {
      const mockBrokerURL = 'nats://secure-server:4222';
      (EnvService.getBrokerURL as jest.Mock).mockReturnValue(mockBrokerURL);

      const options = BrokerService.getConnectionOptions();

      expect(options.servers).toBe(mockBrokerURL);
    });
  });
});
