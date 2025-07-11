import { bench, test } from 'vitest';
import { PNGReader } from './reader';
import { readFile } from 'fs/promises';
import { join } from 'path';

const file = join(__dirname, '../assets/test-image.png');

test('perf', async () => {
  const bytes = await readFile(file);
  const reader = new PNGReader(bytes);
  const png = await reader.parse(true);

  bench('getPixel', async () => {
    for (let i = 0; i < png.getWidth(); i++) {
      for (let j = 0; j < png.getHeight(); j++) {
        png.getPixel(i, j);
      }
    }
  });
});
