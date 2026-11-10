import { BadRequestException } from '@nestjs/common';

/** "HH:mm", 24h. */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ScheduleBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function assertValidRange(startTime: string, endTime: string): void {
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    throw new BadRequestException(
      `La hora de fin (${endTime}) debe ser posterior a la de inicio (${startTime})`,
    );
  }
}

const DAY_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

/** Every block is a valid range and blocks on the same day do not overlap. */
export function assertValidWeek(blocks: ScheduleBlock[]): void {
  blocks.forEach((b) => assertValidRange(b.startTime, b.endTime));

  for (let day = 0; day <= 6; day++) {
    const sorted = blocks
      .filter((b) => b.dayOfWeek === day)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i].startTime) < toMinutes(sorted[i - 1].endTime)) {
        throw new BadRequestException(
          `Los bloques del ${DAY_NAMES[day]} se superponen (${sorted[i - 1].startTime}-${sorted[i - 1].endTime} y ${sorted[i].startTime}-${sorted[i].endTime})`,
        );
      }
    }
  }
}
