import { BrokerService } from '../../src/brokerService';
import { EnvService } from '../../src/envService';

jest.mock('../../src/envService');

describe('BrokerService Unit Tests', () => {
    const mockEnvService = EnvService as jest.Mocked<typeof EnvService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getConnectionOptions', () => {
        it('should return dev connection options for http URL', () => {
            mockEnvService.getBrokerURL.mockReturnValue('http://localhost:4222');

            const spy = jest.spyOn(BrokerService, 'getDevConnectionOptions');

            BrokerService.getConnectionOptions();

            expect(spy).toHaveBeenCalled();
        });

        it('should return prod connection options for non-http URL', () => {
            mockEnvService.getBrokerURL.mockReturnValue('nats://prod.example.com:4222');

            const spy = jest.spyOn(BrokerService, 'getProdConnectionOptions');

            BrokerService.getConnectionOptions();

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('getDevConnectionOptions', () => {
        it('should return correct dev connection options', () => {
            mockEnvService.getBrokerURL.mockReturnValue('http://localhost:4222');

            const options = BrokerService.getDevConnectionOptions();

            expect(options).toEqual({
                servers: 'http://localhost:4222'
            });
        });
    });

    describe('getProdConnectionOptions', () => {
        it('should return correct prod connection options', () => {
            mockEnvService.getBrokerURL.mockReturnValue('nats://prod.example.com:4222');
            mockEnvService.getNatsSeed.mockReturnValue('test-seed');
            mockEnvService.getNatsCAFile.mockReturnValue('/path/to/ca.crt');

            const options = BrokerService.getProdConnectionOptions();

            expect(options.servers).toBe('nats://prod.example.com:4222');
            expect(options.tls).toEqual({ caFile: '/path/to/ca.crt' });
            expect(options.authenticator).toBeDefined();
        });
    });
});
