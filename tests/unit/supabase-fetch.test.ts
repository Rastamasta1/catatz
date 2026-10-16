import { describe, expect, it, vi } from 'vitest';
import { fetchAllRows } from '@/lib/supabase-fetch';

describe('fetchAllRows', () => {
  it('returns all items when total is less than pageSize', async () => {
    const mockData = [{ id: '1' }, { id: '2' }];
    const rangeMock = vi.fn().mockResolvedValue({ data: mockData, error: null });

    const result = await fetchAllRows<{ id: string }>({ range: rangeMock }, 10);

    expect(result).toEqual(mockData);
    expect(rangeMock).toHaveBeenCalledTimes(1);
    expect(rangeMock).toHaveBeenCalledWith(0, 9);
  });

  it('paginates across multiple pages until exhausted', async () => {
    const page1 = Array.from({ length: 5 }, (_, i) => ({ id: `p1-${i}` }));
    const page2 = Array.from({ length: 5 }, (_, i) => ({ id: `p2-${i}` }));
    const page3 = Array.from({ length: 2 }, (_, i) => ({ id: `p3-${i}` }));

    const rangeMock = vi
      .fn()
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null })
      .mockResolvedValueOnce({ data: page3, error: null });

    const result = await fetchAllRows<{ id: string }>({ range: rangeMock }, 5);

    expect(result.length).toBe(12);
    expect(result).toEqual([...page1, ...page2, ...page3]);
    expect(rangeMock).toHaveBeenCalledTimes(3);
    expect(rangeMock).toHaveBeenNthCalledWith(1, 0, 4);
    expect(rangeMock).toHaveBeenNthCalledWith(2, 5, 9);
    expect(rangeMock).toHaveBeenNthCalledWith(3, 10, 14);
  });

  it('stops when empty array is returned', async () => {
    const page1 = Array.from({ length: 5 }, (_, i) => ({ id: `p1-${i}` }));

    const rangeMock = vi
      .fn()
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const result = await fetchAllRows<{ id: string }>({ range: rangeMock }, 5);

    expect(result.length).toBe(5);
    expect(rangeMock).toHaveBeenCalledTimes(2);
  });

  it('throws an error if range query returns error', async () => {
    const rangeMock = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'Database connection failed' } });

    await expect(fetchAllRows<{ id: string }>({ range: rangeMock }, 10)).rejects.toThrow(
      'Database connection failed',
    );
  });
});
