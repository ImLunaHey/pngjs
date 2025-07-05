import { PNGReader } from './reader';
import { Canvas } from 'canvas';
import { readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { describe, expect, test, vi } from 'vitest';
import temporaryPath from 'temporary-path';

const sourceFile = __dirname + '/../html/ubuntu-screenshot.png';

describe('png-reader', async () => {
  test('canvas', async () => {
    const bytes = await readFile(sourceFile);
    const reader = new PNGReader(bytes);
    const png = await reader.parse(true);
    const canvas = new Canvas(png.getWidth(), png.getHeight());
    const ctx = canvas.getContext('2d');
    const stream = canvas.createPNGStream();

    for (var x = 0; x < png.getWidth(); x++) {
      for (var y = 0; y < png.getHeight(); y++) {
        const colors = png.getPixel(x, y);
        const fillStyle = 'rgba(' + colors.slice(0, 3).join(',') + ', ' + colors[3] / 255 + ')';
        ctx.fillStyle = fillStyle;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const tempPath = temporaryPath();
    const outStream = createWriteStream(tempPath);

    stream.on('data', (chunk) => {
      outStream.write(chunk);
    });

    const onEnd = vi.fn();
    stream.on('end', onEnd);

    // wait for the file to be written
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(onEnd).toHaveBeenCalled();
  });
});
