export class PNG {
  /**
   * The width of the image
   */
  private width = 0;
  /**
   * The height of the image
   */
  private height = 0;
  /**
   * The bit depth of the image
   */
  private bitDepth = 0;
  /**
   * The color type of the image
   */
  private colorType = 0;
  /**
   * The compression method of the image
   */
  private compressionMethod = 0;
  /**
   * The filter method of the image
   */
  private filterMethod = 0;
  /**
   * The interlace method of the image
   */
  private interlaceMethod = 0;
  /**
   * The number of colors in the image
   */
  private colors = 0;
  /**
   * Whether the image has an alpha channel
   */
  private alpha = false;
  /**
   * The palette of the image
   */
  private palette: Uint8Array = new Uint8Array();
  /**
   * The pixels of the image
   */
  private pixels: Uint8Array = new Uint8Array();
  /**
   * The transparency values of the image
   */
  private trns: Uint8Array = new Uint8Array();

  /**
   * The width of the image
   */
  getWidth() {
    return this.width;
  }

  /**
   * Set the width of the image
   * @param width - The width of the image
   */
  setWidth(width: number) {
    this.width = width;
  }

  /**
   * Get the height of the image
   * @returns The height of the image
   */
  getHeight() {
    return this.height;
  }

  /**
   * Set the height of the image
   * @param height - The height of the image
   */
  setHeight(height: number) {
    this.height = height;
  }

  /**
   * Get the bit depth of the image
   * @returns The bit depth of the image
   */
  getBitDepth() {
    return this.bitDepth;
  }

  /**
   * Set the bit depth of the image
   * @param bitDepth - The bit depth of the image
   */
  setBitDepth(bitDepth: number) {
    this.bitDepth = bitDepth;
  }

  /**
   * Get the color type of the image
   * @returns The color type of the image
   */
  getColorType() {
    return this.colorType;
  }

  /**
   * Set the color type of the image
   * @param colorType - The color type of the image
   */
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

  /**
   * Get the compression method of the image
   * @returns The compression method of the image
   */
  getCompressionMethod() {
    return this.compressionMethod;
  }

  /**
   * Set the compression method of the image
   * @param compressionMethod - The compression method of the image
   */
  setCompressionMethod(compressionMethod: number) {
    if (compressionMethod !== 0) {
      throw new Error('invalid compression method ' + compressionMethod);
    }
    this.compressionMethod = compressionMethod;
  }

  /**
   * Get the filter method of the image
   * @returns The filter method of the image
   */
  getFilterMethod() {
    return this.filterMethod;
  }

  /**
   * Set the filter method of the image
   * @param filterMethod - The filter method of the image
   */
  setFilterMethod(filterMethod: number) {
    if (filterMethod !== 0) {
      throw new Error('invalid filter method ' + filterMethod);
    }
    this.filterMethod = filterMethod;
  }

  /**
   * Get the interlace method of the image
   * @returns The interlace method of the image
   */
  getInterlaceMethod() {
    return this.interlaceMethod;
  }

  /**
   * Set the interlace method of the image
   * @param interlaceMethod - The interlace method of the image
   */
  setInterlaceMethod(interlaceMethod: number) {
    if (interlaceMethod !== 0 && interlaceMethod !== 1) {
      throw new Error('invalid interlace method ' + interlaceMethod);
    }
    this.interlaceMethod = interlaceMethod;
  }

  /**
   * Get the number of colors in the image
   * @returns The number of colors in the image
   */
  getColors() {
    return this.colors;
  }

  /**
   * Get the transparency values of the image
   * @returns The transparency values of the image
   */
  getTRNS() {
    return this.trns;
  }

  /**
   * Set the transparency values of the image
   * @param trns - The transparency values of the image
   */
  setTRNS(trns: Uint8Array) {
    this.trns = trns;
  }

  /**
   * Get the alpha channel of the image
   * @returns The alpha channel of the image
   */
  getAlpha() {
    return this.alpha;
  }

  /**
   * Set the alpha channel of the image
   * @param alpha - The alpha channel of the image
   */
  setAlpha(alpha: boolean) {
    this.alpha = alpha;
  }

  /**
   * Get the palette of the image
   * @returns The palette of the image
   */
  getPalette() {
    return this.palette;
  }

  /**
   * Set the palette of the image
   * @param palette - The palette of the image
   */
  setPalette(palette: Uint8Array) {
    if (palette.length % 3 !== 0) {
      throw new Error('incorrect PLTE chunk length');
    }
    if (palette.length > Math.pow(2, this.bitDepth) * 3) {
      throw new Error('palette has more colors than 2^bitdepth');
    }
    this.palette = palette;
  }

  /**
   * Get the pixels of the image
   * @returns The pixels of the image
   */
  getPixels() {
    return this.pixels;
  }

  /**
   * Set the pixels of the image
   * @param pixels - The pixels of the image
   */
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
  getRGBA8Array(): number[] {
    const data = new Array<number>(this.width * this.height * 4);
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
