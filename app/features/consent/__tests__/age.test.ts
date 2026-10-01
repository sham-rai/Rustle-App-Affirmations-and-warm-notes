import { ageOn, isAdult, parseDateOfBirth } from '../age';

const today = new Date(2026, 9, 1, 12); // 1 October 2026, local time

describe('parseDateOfBirth', () => {
  it('accepts a real past date', () => {
    expect(parseDateOfBirth({ day: '7', month: '3', year: '1990' }, today)).toEqual({ year: 1990, month: 3, day: 7 });
  });

  it.each([
    [{ day: '31', month: '4', year: '1990' }, 'no 31 April'],
    [{ day: '29', month: '2', year: '2001' }, 'no 29 February in a common year'],
    [{ day: '0', month: '1', year: '1990' }, 'day zero'],
    [{ day: '1', month: '13', year: '1990' }, 'month 13'],
    [{ day: '1', month: '1', year: '90' }, 'a two-digit year'],
    [{ day: '1', month: '1', year: '1850' }, 'before 1900'],
    [{ day: '2', month: '10', year: '2026' }, 'tomorrow'],
    [{ day: '', month: '1', year: '1990' }, 'an empty field'],
    [{ day: '1a', month: '1', year: '1990' }, 'not a number'],
  ])('refuses %j (%s)', (entry) => {
    expect(parseDateOfBirth(entry, today)).toBeNull();
  });

  it('accepts 29 February in a leap year', () => {
    expect(parseDateOfBirth({ day: '29', month: '2', year: '2008' }, today)).not.toBeNull();
  });
});

describe('ageOn and isAdult', () => {
  it('turns 18 on the birthday, not the day before', () => {
    expect(isAdult({ year: 2008, month: 10, day: 1 }, today)).toBe(true);
    expect(isAdult({ year: 2008, month: 10, day: 2 }, today)).toBe(false);
  });

  it('counts a 29 February birthday from 1 March in a common year', () => {
    expect(ageOn({ year: 2008, month: 2, day: 29 }, { year: 2026, month: 2, day: 28 })).toBe(17);
    expect(ageOn({ year: 2008, month: 2, day: 29 }, { year: 2026, month: 3, day: 1 })).toBe(18);
  });
});
