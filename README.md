# PNG.js

PNG.js is a PNG decoder fully written in Typescript. It should work in both the backend and frontend.
Make sure to use a modern bundler as the files are ESM.

## Usage

```ts
import PNGReader from 'png.js';

const reader = new PNGReader(bytes);
const png = await reader.parse();
console.info(png);
```

Currently the only option is:

- `data` (_boolean_) - should it read the pixel data, or only the image information.

### PNG object

The PNG object is passed in the callback. It contains all the data extracted
from the image.

```js
// most importantly
png.getWidth();
png.getHeight();
png.getPixel(x, y); // [red, blue, green, alpha]
png.getRGBA8Array(); // [r1, g1, b1, a1, r2, b2, g2, a2, ... ] - Same as canvas.getImageData
// but also
png.getBitDepth();
png.getColorType();
png.getCompressionMethod();
png.getFilterMethod();
png.getInterlaceMethod();
png.getPalette();
```

## Using PNGReader in Node.js

PNGReader accepts an `Buffer` object, returned by `fs.readFile`, for example:

```js
const buffer = await readFile('test.png');
const reader = new PNGReader(buffer);
const png = await reader.parse();
console.info(png);
```

## Using PNGReader in the Browser

PNGReader accepts a byte string, array of bytes or an ArrayBuffer.

For example using FileReader with file input fields:

```js
const reader = new FileReader();

reader.onload = async (event) => {
  const reader = new PNGReader(event.target.result);
  const png = await reader.parse();
  console.info(png);
};

fileInputElement.onchange = () => {
  reader.readAsArrayBuffer(fileInputElement.files[0]);
  // or, but less optimal
  reader.readAsBinaryString(fileInputElement.files[0]);
};
```

Or instead of using input elements, XHR can also be used:

```ts
const xhr = new XMLHttpRequest();
xhr.open('GET', 'image.png', true);
xhr.responseType = 'arraybuffer';

xhr.onload = () => {
  if (this.status == 200) {
    const reader = new PNGReader(this.response);
    const png = await reader.parse();
    console.info(png);
  }
};

xhr.send();
```
