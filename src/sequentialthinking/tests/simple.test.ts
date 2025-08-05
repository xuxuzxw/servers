// Simple test to verify basic functionality
describe('Basic Functionality', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const str = 'hello world';
    expect(str.length).toBe(11);
    expect(str.toUpperCase()).toBe('HELLO WORLD');
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
  });
});