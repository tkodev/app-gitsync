import { forEach, map } from './common';

test('map - no callback', () => {
  expect(map([])).toStrictEqual([]);
});

test('map - zero iterations on empty array', () => {
  let iterations = 0;
  const rslt = map([], () => {
    iterations += 1;
  });
  expect(iterations).toStrictEqual(0);
});