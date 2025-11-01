import { EnvService } from '../../src/envService';

describe('EnvService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getMongoHost', () => {
    it('should return MONGO_HOST when environment variable is set', () => {
      process.env.MONGO_HOST = 'test-host';
      expect(EnvService.getMongoHost()).toBe('test-host');
    });

    it('should throw error when MONGO_HOST is not set', () => {
      delete process.env.MONGO_HOST;
      expect(() => EnvService.getMongoHost()).toThrow('Veuillez définir la variable d\'environnement MONGO_HOST');
    });
  });

  describe('getMongoPort', () => {
    it('should return MONGO_PORT when environment variable is set', () => {
      process.env.MONGO_PORT = '27017';
      expect(EnvService.getMongoPort()).toBe('27017');
    });

    it('should throw error when MONGO_PORT is not set', () => {
      delete process.env.MONGO_PORT;
      expect(() => EnvService.getMongoPort()).toThrow('Veuillez définir la variable d\'environnement MONGO_PORT');
    });
  });

  describe('getMongoUsername', () => {
    it('should return MONGO_USERNAME when environment variable is set', () => {
      process.env.MONGO_USERNAME = 'test-user';
      expect(EnvService.getMongoUsername()).toBe('test-user');
    });

    it('should throw error when MONGO_USERNAME is not set', () => {
      delete process.env.MONGO_USERNAME;
      expect(() => EnvService.getMongoUsername()).toThrow('Veuillez définir la variable d\'environnement MONGO_USERNAME');
    });
  });

  describe('getMongoPassword', () => {
    it('should return MONGO_PASSWORD when environment variable is set', () => {
      process.env.MONGO_PASSWORD = 'test-password';
      expect(EnvService.getMongoPassword()).toBe('test-password');
    });

    it('should throw error when MONGO_PASSWORD is not set', () => {
      delete process.env.MONGO_PASSWORD;
      expect(() => EnvService.getMongoPassword()).toThrow('Veuillez définir la variable d\'environnement MONGO_PASSWORD');
    });
  });

  describe('getMongoDatabase', () => {
    it('should return MONGO_DATABASE when environment variable is set', () => {
      process.env.MONGO_DATABASE = 'test-db';
      expect(EnvService.getMongoDatabase()).toBe('test-db');
    });

    it('should throw error when MONGO_DATABASE is not set', () => {
      delete process.env.MONGO_DATABASE;
      expect(() => EnvService.getMongoDatabase()).toThrow('Veuillez définir la variable d\'environnement MONGO_DATABASE');
    });
  });

  describe('getSaveServiceUrl', () => {
    it('should return SAVE_SERVICE_URL when environment variable is set', () => {
      process.env.SAVE_SERVICE_URL = 'http://localhost:3000';
      expect(EnvService.getSaveServiceUrl()).toBe('http://localhost:3000');
    });

    it('should throw error when SAVE_SERVICE_URL is not set', () => {
      delete process.env.SAVE_SERVICE_URL;
      expect(() => EnvService.getSaveServiceUrl()).toThrow('Veuillez définir la variable d\'environnement SAVE_SERVICE_URL');
    });
  });

  describe('getBoxId', () => {
    it('should return BOX_UUID when environment variable is set', () => {
      process.env.BOX_UUID = 'box-1-uuid';

      const boxId = EnvService.getBoxId();
      expect(boxId).toBe('box-1-uuid');
    });

    it('should throw error when BOX_UUID is not set', () => {
      delete process.env.BOX_UUID;

      expect(() => EnvService.getBoxId()).toThrow('Veuillez définir la variable d\'environnement BOX_UUID');
    });
  });
});
