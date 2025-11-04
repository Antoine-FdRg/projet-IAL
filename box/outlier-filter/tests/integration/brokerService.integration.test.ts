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
    });
});
