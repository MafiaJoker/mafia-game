// Простой тест для проверки работоспособности
import { describe, it, expect } from 'vitest'

describe('Simple Test', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2)
  })
  
  it('should handle basic operations', () => {
    expect('hello'.toUpperCase()).toBe('HELLO')
  })
})