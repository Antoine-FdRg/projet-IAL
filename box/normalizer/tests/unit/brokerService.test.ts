import { BrokerService } from '../../src/brokerService';
import { EnvService } from '../../src/envService';

jest.mock('../../src/envService');

describe('BrokerService Unit Tests', () => {
    const mockEnvService = EnvService as jest.Mocked<typeof EnvService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getConnectionOptions', () => {
        it('should return dev connection options for http URLs', () => {
            mockEnvService.getBrokerURL.mockReturnValue('http://localhost:4222');

            const result = BrokerService.getConnectionOptions();

            expect(result).toEqual({
                servers: 'http://localhost:4222'
            });
        });
    });

    describe('getDevConnectionOptions', () => {
        it('should return simple connection options', () => {
            mockEnvService.getBrokerURL.mockReturnValue('http://localhost:4222');

            const result = BrokerService.getDevConnectionOptions();

            expect(result).toEqual({
                servers: 'http://localhost:4222'
            });
        });
    });
});
