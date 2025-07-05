import zlib from 'zlib';
import { PNG } from './index';

const inflate = (data: Uint8Array) =>
  new Promise((resolve, reject) => {
    zlib.inflate(Buffer.from(data), (error, data) => {
      if (error) reject(error);
      resolve(data);
    });
  });

const equalBytes = (a: Uint8Array, b: number[]) => {
  if (a.length != b.length) return false;
  for (let l = a.length; l--; ) if (a[l] != b[l]) return false;
  return true;
};

const readUInt32 = (buffer: Uint8Array, offset: number) => {
  // Use DataView for proper unsigned 32-bit integer reading
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
  return view.getUint32(0, false); // false for big-endian (network byte order)
};

const readUInt8 = (buffer: Uint8Array, offset: number) => buffer[offset];

const bufferToString = (buffer: Uint8Array) => {
  let str = '';
  for (let i = 0; i < buffer.length; i++) {
    str += String.fromCharCode(buffer[i]);
  }
  return str;
};

export class PNGReader {
  private bytes: Uint8Array;
  private i: number;
  private png: PNG;
  private dataChunks: Uint8Array[];
  public header: Uint8Array;

  // @TODO: fix this any
  constructor(bytes: any) {
    if (typeof bytes == 'string') {
      const bts = bytes;
      bytes = new Array(bts.length);
      for (let i = 0, l = bts.length; i < l; i++) {
        bytes[i] = bts[i].charCodeAt(0);
      }
    } else {
      const type = toString.call(bytes).slice(8, -1);
      if (type == 'ArrayBuffer') bytes = new Uint8Array(bytes);
    }

    // current pointer
    this.i = 0;
    // bytes buffer
    this.bytes = bytes;
    // Output object
    this.png = new PNG();

    this.dataChunks = [];
  }

  readBytes(length: number) {
    const end = this.i + length;
    if (end > this.bytes.length) {
      throw new Error('Unexpectedly reached end of file');
    }
    const bytes = this.bytes.slice(this.i, end);
    this.i = end;
    return bytes;
  }

  /**
   * http://www.w3.org/TR/2003/REC-PNG-20031110/#5PNG-file-signature
   */
  decodeHeader() {
    if (this.i !== 0) {
      throw new Error('file pointer should be at 0 to read the header');
    }

    const header = this.readBytes(8);

    if (!equalBytes(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      throw new Error('invalid PNGReader file (bad signature)');
    }

    this.header = header;
  }

  /**
   * http://www.w3.org/TR/2003/REC-PNG-20031110/#5Chunk-layout
   *
   * length =  4      bytes
   * type   =  4      bytes (IHDR, PLTE, IDAT, IEND or others)
   * chunk  =  length bytes
   * crc    =  4      bytes
   */
  decodeChunk() {
    const length = readUInt32(this.readBytes(4), 0);

    if (length < 0) {
      throw new Error('Bad chunk length ' + (0xffffffff & length));
    }

    const type = bufferToString(this.readBytes(4));
    const chunk = this.readBytes(length);

    // Read the CRC bytes
    this.readBytes(4);

    switch (type) {
      case 'IHDR':
        this.decodeIHDR(chunk);
        break;
      case 'PLTE':
        this.decodePLTE(chunk);
        break;
      case 'IDAT':
        this.decodeIDAT(chunk);
        break;
      case 'tRNS':
        this.decodeTRNS(chunk);
        break;
      case 'IEND':
        this.decodeIEND(chunk);
        break;
    }

    return type;
  }

  /**
   * http://www.w3.org/TR/2003/REC-PNG-20031110/#11IHDR
   * http://www.libpng.org/pub/png/spec/1.2/png-1.2-pdg.html#C.IHDR
   *
   * Width               4 bytes
   * Height              4 bytes
   * Bit depth           1 byte
   * Colour type         1 byte
   * Compression method  1 byte
   * Filter method       1 byte
   * Interlace method    1 byte
   */
  decodeIHDR(chunk: Uint8Array) {
    this.png.setWidth(readUInt32(chunk, 0));
    this.png.setHeight(readUInt32(chunk, 4));
    this.png.setBitDepth(readUInt8(chunk, 8));
    this.png.setColorType(readUInt8(chunk, 9));
    this.png.setCompressionMethod(readUInt8(chunk, 10));
    this.png.setFilterMethod(readUInt8(chunk, 11));
    this.png.setInterlaceMethod(readUInt8(chunk, 12));
  }

  /**
   *
   * http://www.w3.org/TR/PNG/#11PLTE
   */
  decodePLTE(chunk: Uint8Array) {
    this.png.setPalette(chunk);
  }

  /**
   * http://www.w3.org/TR/2003/REC-PNG-20031110/#11IDAT
   */
  decodeIDAT(chunk: Uint8Array) {
    // multiple IDAT chunks will concatenated
    this.dataChunks.push(chunk);
  }

  /**
   * https://www.w3.org/TR/PNG/#11tRNS
   */
  decodeTRNS(chunk: Uint8Array) {
    this.png.setTRNS(chunk);
  }

  /**
   * http://www.w3.org/TR/2003/REC-PNG-20031110/#11IEND
   */
  decodeIEND(_chunk: Uint8Array) {}

  /**
   * Uncompress IDAT chunks
   */
  async decodePixels() {
    const png = this.png;
    const reader = this;
    let length = 0;
    for (let l = this.dataChunks.length; l--; ) length += this.dataChunks[l].length;
    const data = Buffer.alloc(length);
    for (let i = 0, k = 0, l = this.dataChunks.length; i < l; i++) {
      const chunk = this.dataChunks[i];
      for (let j = 0; j < chunk.length; j++) data[k++] = chunk[j];
    }
    const inflated = (await inflate(data)) as Uint8Array;
    if (png.getInterlaceMethod() === 0) {
      reader.interlaceNone(inflated);
    } else {
      reader.interlaceAdam7(inflated);
    }
  }

  interlaceNone(data: Uint8Array) {
    // bytes per pixel
    const bpp = Math.max(1, (this.png.getColors() * this.png.getBitDepth()) / 8);

    // color bytes per row
    const cpr = bpp * this.png.getWidth();

    const pixels = Buffer.alloc(bpp * this.png.getWidth() * this.png.getHeight());
    let offset = 0;

    for (let i = 0; i < data.length; i += cpr + 1) {
      const scanline = data.slice(i + 1, i + cpr + 1);

      switch (readUInt8(data, i)) {
        case 0:
          this.unFilterNone(scanline, pixels, bpp, offset, cpr);
          break;
        case 1:
          this.unFilterSub(scanline, pixels, bpp, offset, cpr);
          break;
        case 2:
          this.unFilterUp(scanline, pixels, bpp, offset, cpr);
          break;
        case 3:
          this.unFilterAverage(scanline, pixels, bpp, offset, cpr);
          break;
        case 4:
          this.unFilterPaeth(scanline, pixels, bpp, offset, cpr);
          break;
        default:
          throw new Error('unknown filtered scanline');
      }

      offset += cpr;
    }

    this.png.setPixels(pixels);
  }

  interlaceAdam7(_data: Uint8Array) {
    throw new Error('Adam7 interlacing is not implemented yet');
  }

  /**
   * No filtering, direct copy
   */
  unFilterNone(scanline: Uint8Array, pixels: Uint8Array, _bpp: number, of: number, length: number) {
    for (let i = 0, to = length; i < to; i++) {
      pixels[of + i] = scanline[i];
    }
  }

  /**
   * The Sub() filter transmits the difference between each byte and the value
   * of the corresponding byte of the prior pixel.
   * Sub(x) = Raw(x) + Raw(x - bpp)
   */
  unFilterSub(scanline: Uint8Array, pixels: Uint8Array, bpp: number, of: number, length: number) {
    let i = 0;
    for (; i < bpp; i++) pixels[of + i] = scanline[i];
    for (; i < length; i++) {
      // Raw(x) + Raw(x - bpp)
      pixels[of + i] = (scanline[i] + pixels[of + i - bpp]) & 0xff;
    }
  }

  /**
   * The Up() filter is just like the Sub() filter except that the pixel
   * immediately above the current pixel, rather than just to its left, is used
   * as the predictor.
   * Up(x) = Raw(x) + Prior(x)
   */
  unFilterUp(scanline: Uint8Array, pixels: Uint8Array, _bpp: number, of: number, length: number) {
    let i = 0;
    let byte: number;
    let prev: number;
    // Prior(x) is 0 for all x on the first scanline
    if (of - length < 0) {
      for (; i < length; i++) {
        pixels[of + i] = scanline[i];
      }
    } else {
      for (; i < length; i++) {
        // Raw(x)
        byte = scanline[i];
        // Prior(x)
        prev = pixels[of + i - length];
        pixels[of + i] = (byte + prev) & 0xff;
      }
    }
  }

  /**
   * The Average() filter uses the average of the two neighboring pixels (left
   * and above) to predict the value of a pixel.
   * Average(x) = Raw(x) + floor((Raw(x-bpp)+Prior(x))/2)
   */
  unFilterAverage(scanline: Uint8Array, pixels: Uint8Array, bpp: number, of: number, length: number) {
    let i = 0;
    let byte: number;
    let prev: number;
    let prior: number;
    if (of - length < 0) {
      // Prior(x) == 0 && Raw(x - bpp) == 0
      for (; i < bpp; i++) {
        pixels[of + i] = scanline[i];
      }
      // Prior(x) == 0 && Raw(x - bpp) != 0 (right shift, prevent doubles)
      for (; i < length; i++) {
        pixels[of + i] = (scanline[i] + (pixels[of + i - bpp] >> 1)) & 0xff;
      }
    } else {
      // Prior(x) != 0 && Raw(x - bpp) == 0
      for (; i < bpp; i++) {
        pixels[of + i] = (scanline[i] + (pixels[of - length + i] >> 1)) & 0xff;
      }
      // Prior(x) != 0 && Raw(x - bpp) != 0
      for (; i < length; i++) {
        byte = scanline[i];
        prev = pixels[of + i - bpp];
        prior = pixels[of + i - length];
        pixels[of + i] = (byte + ((prev + prior) >> 1)) & 0xff;
      }
    }
  }

  /**
   * The Paeth() filter computes a simple linear function of the three
   * neighboring pixels (left, above, upper left), then chooses as predictor
   * the neighboring pixel closest to the computed value. This technique is due
   * to Alan W. Paeth.
   * Paeth(x) = Raw(x) +
   *            PaethPredictor(Raw(x-bpp), Prior(x), Prior(x-bpp))
   *  function PaethPredictor (a, b, c)
   *  begin
   *       ; a = left, b = above, c = upper left
   *       p := a + b - c        ; initial estimate
   *       pa := abs(p - a)      ; distances to a, b, c
   *       pb := abs(p - b)
   *       pc := abs(p - c)
   *       ; return nearest of a,b,c,
   *       ; breaking ties in order a,b,c.
   *       if pa <= pb AND pa <= pc then return a
   *       else if pb <= pc then return b
   *       else return c
   *  end
   */
  unFilterPaeth(scanline: Uint8Array, pixels: Uint8Array, bpp: number, of: number, length: number) {
    let i = 0;
    let raw: number;
    let a: number;
    let b: number;
    let c: number;
    let p: number;
    let pa: number;
    let pb: number;
    let pc: number;
    let pr: number;
    if (of - length < 0) {
      // Prior(x) == 0 && Raw(x - bpp) == 0
      for (; i < bpp; i++) {
        pixels[of + i] = scanline[i];
      }
      // Prior(x) == 0 && Raw(x - bpp) != 0
      // paethPredictor(x, 0, 0) is always x
      for (; i < length; i++) {
        pixels[of + i] = (scanline[i] + pixels[of + i - bpp]) & 0xff;
      }
    } else {
      // Prior(x) != 0 && Raw(x - bpp) == 0
      // paethPredictor(x, 0, 0) is always x
      for (; i < bpp; i++) {
        pixels[of + i] = (scanline[i] + pixels[of + i - length]) & 0xff;
      }
      // Prior(x) != 0 && Raw(x - bpp) != 0
      for (; i < length; i++) {
        raw = scanline[i];
        a = pixels[of + i - bpp];
        b = pixels[of + i - length];
        c = pixels[of + i - length - bpp];
        p = a + b - c;
        pa = Math.abs(p - a);
        pb = Math.abs(p - b);
        pc = Math.abs(p - c);
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        else pr = c;
        pixels[of + i] = (raw + pr) & 0xff;
      }
    }
  }

  /**
   * Parse the PNG file
   * @param readData - if true, read the pixel data
   */
  async parse(readData: boolean) {
    this.decodeHeader();

    while (this.i < this.bytes.length) {
      const type = this.decodeChunk();
      // stop after IHDR chunk, or after IEND
      if ((type == 'IHDR' && readData === false) || type == 'IEND') break;
    }

    await this.decodePixels();

    return this.png;
  }
}
