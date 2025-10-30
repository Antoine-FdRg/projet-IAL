import { BoxRepository } from '../src/database/boxRepository';
import pool from '../src/database/connection';

// Mock the database pool
jest.mock('../src/database/connection', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

describe('BoxRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByBoxId', () => {
    it('should return a box when found', async () => {
      const mockBox = {
        box_id: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Test Box 1',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockBox],
      });

      const result = await BoxRepository.findByBoxId('550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual(mockBox);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM boxes WHERE box_id = $1',
        ['550e8400-e29b-41d4-a716-446655440001']
      );
    });

    it('should return null when box not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await BoxRepository.findByBoxId('550e8400-e29b-41d4-a716-446655440099');

      expect(result).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true when box exists', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ box_id: '550e8400-e29b-41d4-a716-446655440001' }],
      });

      const result = await BoxRepository.exists('550e8400-e29b-41d4-a716-446655440001');

      expect(result).toBe(true);
    });

    it('should return false when box does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await BoxRepository.exists('550e8400-e29b-41d4-a716-446655440099');

      expect(result).toBe(false);
    });
  });

  describe('verifyToken', () => {
    it('should return true for valid UUID token', async () => {
      const mockBox = {
        box_id: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Test Box 1',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockBox],
      });

      const result = await BoxRepository.verifyToken('550e8400-e29b-41d4-a716-446655440001');

      expect(result).toBe(true);
    });

    it('should return false for invalid UUID format', async () => {
      const result = await BoxRepository.verifyToken('not-a-valid-uuid');

      expect(result).toBe(false);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return false for valid UUID but nonexistent box', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await BoxRepository.verifyToken('550e8400-e29b-41d4-a716-446655440099');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await BoxRepository.verifyToken('550e8400-e29b-41d4-a716-446655440001');

      expect(result).toBe(false);
    });
  });
});
