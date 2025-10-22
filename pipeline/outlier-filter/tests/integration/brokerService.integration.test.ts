import { BrokerService } from '../../src/brokerService';
import { EnvService } from '../../src/envService';

jest.mock('../../src/envService');

describe('BrokerService Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getConnectionOptions', () => {
        it('should return dev options for http URLs', () => {
            (EnvService.getBrokerURL as jest.Mock).mockReturnValue('http://localhost:4222');

            const options = BrokerService.getConnectionOptions();

            expect(options).toEqual({
                servers: 'http://localhost:4222'
            });
        });

        it('should return prod options for non-http URLs', () => {
            (EnvService.getBrokerURL as jest.Mock).mockReturnValue('nats://prod-server:4222');
            (EnvService.getNatsSeed as jest.Mock).mockReturnValue('SUABC123...');
            (EnvService.getNatsCAFile as jest.Mock).mockReturnValue('/path/to/ca.crt');

            const options = BrokerService.getConnectionOptions();

            expect(options.servers).toBe('nats://prod-server:4222');
            expect(options.tls).toBeDefined();
            expect(options.authenticator).toBeDefined();
        });
    });
});
