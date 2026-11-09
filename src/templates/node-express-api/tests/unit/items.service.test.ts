import { describe, it, expect, beforeEach } from 'vitest';
import { ItemsService } from '../../src/services/items.service.js';

describe('ItemsService', () => {
  let service: ItemsService;

  beforeEach(() => {
    service = new ItemsService();
  });

  it('should return initial items', () => {
    const items = service.getAll();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.name).toBe('Initial Item');
  });

  it('should find item by id', () => {
    const item = service.getById('1');
    expect(item).toBeDefined();
    expect(item?.id).toBe('1');
  });

  it('should return undefined for non-existent item id', () => {
    const item = service.getById('non-existent');
    expect(item).toBeUndefined();
  });

  it('should create a new item', () => {
    const newItem = service.create({
      name: 'Test Item',
      description: 'Testing creation logic',
    });
    expect(newItem.id).toBeDefined();
    expect(newItem.name).toBe('Test Item');

    const retrieved = service.getById(newItem.id);
    expect(retrieved).toEqual(newItem);
  });
});
