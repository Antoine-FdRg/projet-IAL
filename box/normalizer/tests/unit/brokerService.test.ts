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

        it('should return prod connection options for non-http URLs', () => {
            mockEnvService.getBrokerURL.mockReturnValue('nats://prod-server:4222');
            mockEnvService.getNatsSeed.mockReturnValue('test-seed');
            mockEnvService.getNatsCAFile.mockReturnValue('/path/to/ca.crt');

            const result = BrokerService.getConnectionOptions();

            expect(result).toEqual({
                servers: 'nats://prod-server:4222',
                tls: {
                    caFile: '/path/to/ca.crt'
                },
                authenticator: expect.any(Function)
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

    describe('getProdConnectionOptions', () => {
        it('should return secure connection options', () => {
            mockEnvService.getBrokerURL.mockReturnValue('nats://prod-server:4222');
            mockEnvService.getNatsSeed.mockReturnValue('test-seed');
            mockEnvService.getNatsCAFile.mockReturnValue('/path/to/ca.crt');

            const result = BrokerService.getProdConnectionOptions();

            expect(result).toEqual({
                servers: 'nats://prod-server:4222',
                tls: {
                    caFile: '/path/to/ca.crt'
                },
                authenticator: expect.any(Function)
            });
        });
    });
});
