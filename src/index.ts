export class PNG {
  private width = 0;
  private height = 0;
  private bitDepth = 0;
  private colorType = 0;
  private compressionMethod = 0;
  private filterMethod = 0;
  private interlaceMethod = 0;
  private colors = 0;
  private alpha = false;
  private palette: Uint8Array = new Uint8Array();
  private pixels: Uint8Array = new Uint8Array();
  private trns: Uint8Array = new Uint8Array();

  getWidth() {
    return this.width;
  }

  setWidth(width: number) {
    this.width = width;
  }

  getHeight() {
    return this.height;
  }

  setHeight(height: number) {
    this.height = height;
  }

  getBitDepth() {
    return this.bitDepth;
  }

  setBitDepth(bitDepth: number) {
    this.bitDepth = bitDepth;
  }

  getColorType() {
    return this.colorType;
  }

  setColorType(colorType: number) {
    //   Color    Allowed    Interpretation
    //   Type    Bit Depths
    //
    //   0       1,2,4,8,16  Each pixel is a grayscale sample.
    //
    //   2       8,16        Each pixel is an R,G,B triple.
    //
    //   3       1,2,4,8     Each pixel is a palette index;
    //                       a PLTE chunk must appear.
    //
    //   4       8,16        Each pixel is a grayscale sample,
    //                       followed by an alpha sample.
    //
    //   6       8,16        Each pixel is an R,G,B triple,
    //                       followed by an alpha sample.

    let colors = 0;
    let alpha = false;

    switch (colorType) {
      case 0:
        colors = 1;
        break;
      case 2:
        colors = 3;
        break;
      case 3:
        colors = 1;
        break;
      case 4:
        colors = 2;
        alpha = true;
        break;
      case 6:
        colors = 4;
        alpha = true;
        break;
      default:
        throw new Error('invalid color type');
    }

    this.colors = colors;
    this.alpha = alpha;
    this.colorType = colorType;
  }

  getCompressionMethod() {
    return this.compressionMethod;
  }

  setCompressionMethod(compressionMethod: number) {
    if (compressionMethod !== 0) {
      throw new Error('invalid compression method ' + compressionMethod);
    }
    this.compressionMethod = compressionMethod;
  }

  getFilterMethod() {
    return this.filterMethod;
  }

  setFilterMethod(filterMethod: number) {
    if (filterMethod !== 0) {
      throw new Error('invalid filter method ' + filterMethod);
    }
    this.filterMethod = filterMethod;
  }

  getInterlaceMethod() {
    return this.interlaceMethod;
  }

  setInterlaceMethod(interlaceMethod: number) {
    if (interlaceMethod !== 0 && interlaceMethod !== 1) {
      throw new Error('invalid interlace method ' + interlaceMethod);
    }
    this.interlaceMethod = interlaceMethod;
  }

  getColors() {
    return this.colors;
  }

  getTRNS() {
    return this.trns;
  }

  setTRNS(trns: Uint8Array) {
    this.trns = trns;
  }

  getAlpha() {
    return this.alpha;
  }

  setAlpha(alpha: boolean) {
    this.alpha = alpha;
  }

  getPalette() {
    return this.palette;
  }

  setPalette(palette: Uint8Array) {
    if (palette.length % 3 !== 0) {
      throw new Error('incorrect PLTE chunk length');
    }
    if (palette.length > Math.pow(2, this.bitDepth) * 3) {
      throw new Error('palette has more colors than 2^bitdepth');
    }
    this.palette = palette;
  }

  getPixels() {
    return this.pixels;
  }

  setPixels(pixels: Uint8Array) {
    this.pixels = pixels;
  }

  /**
   * get the pixel color on a certain location in a normalized way
   * result is an array: [red, green, blue, alpha]
   */
  getPixel(x: number, y: number): [red: number, green: number, blue: number, alpha: number] {
    if (!this.pixels) throw new Error('pixel data is empty');
    if (x >= this.width || y >= this.height) {
      throw new Error('x,y position out of bound');
    }
    const i = ((this.colors * this.bitDepth) / 8) * (y * this.width + x);
    const pixels = this.pixels;

    switch (this.colorType) {
      case 0:
        return [pixels[i], pixels[i], pixels[i], 255];
      case 2:
        return [pixels[i], pixels[i + 1], pixels[i + 2], 255];
      case 3:
        const alpha = this.trns != null && this.trns[pixels[i]] != null ? this.trns[pixels[i]] : 255;
        return [this.palette[pixels[i] * 3 + 0], this.palette[pixels[i] * 3 + 1], this.palette[pixels[i] * 3 + 2], alpha];
      case 4:
        return [pixels[i], pixels[i], pixels[i], pixels[i + 1]];
      case 6:
        return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    }

    throw new Error('invalid color type');
  }
  /**
   * get the pixels of the image as a RGBA array of the form [r1, g1, b1, a1, r2, b2, g2, a2, ...]
   * Matches the api of canvas.getImageData
   */
  getRGBA8Array() {
    const data = new Array(this.width * this.height * 4);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const pixelData = this.getPixel(x, y);
        if (!pixelData) {
          throw new Error('pixel data is empty');
        }

        data[(y * this.width + x) * 4 + 0] = pixelData[0];
        data[(y * this.width + x) * 4 + 1] = pixelData[1];
        data[(y * this.width + x) * 4 + 2] = pixelData[2];
        data[(y * this.width + x) * 4 + 3] = pixelData[3];
      }
    }
    return data;
  }
}
