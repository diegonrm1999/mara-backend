import { BadRequestException } from '@nestjs/common';
import {
  TIME_PATTERN,
  assertValidRange,
  assertValidWeek,
} from './schedule-validation';

describe('schedule validation', () => {
  it('accepts HH:mm only', () => {
    expect(TIME_PATTERN.test('09:00')).toBe(true);
    expect(TIME_PATTERN.test('23:59')).toBe(true);
    expect(TIME_PATTERN.test('9:00')).toBe(false);
    expect(TIME_PATTERN.test('24:00')).toBe(false);
  });

  it('rejects ranges that end before they start', () => {
    expect(() => assertValidRange('18:00', '09:00')).toThrow(
      BadRequestException,
    );
    expect(() => assertValidRange('09:00', '09:00')).toThrow(
      BadRequestException,
    );
    expect(() => assertValidRange('09:00', '13:00')).not.toThrow();
  });

  it('allows split shifts but rejects overlaps on the same day', () => {
    expect(() =>
      assertValidWeek([
        { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
        { dayOfWeek: 1, startTime: '14:00', endTime: '19:00' },
        { dayOfWeek: 2, startTime: '10:00', endTime: '12:00' },
      ]),
    ).not.toThrow();
    expect(() =>
      assertValidWeek([
        { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
        { dayOfWeek: 1, startTime: '12:00', endTime: '19:00' },
      ]),
    ).toThrow(BadRequestException);
  });
});
