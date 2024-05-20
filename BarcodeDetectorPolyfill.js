import {
  BarcodeFormat,
  DecodeHintType,
  BrowserMultiFormatReader
} from 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.0/+esm'
import { imageToImage, imageToDataURL } from './blobby.js';
// const NATIVE = ("BarcodeDetector" in window);
const NATIVE = false;

if(!NATIVE) {

  const supportedFormats = [
    'aztec',
    'code_128',
    'code_39',
    'data_matrix',
    'ean_13',
    'ean_8',
    'itf',
    'maxicode',
    'pdf417',
    'qr_code',
    // 'rss_14', // keeps detecting everything as a barcode
    // 'rss_expanded', // experimental
    'upc_a',
    'upc_e',
    'upc_ean_extension'
  ];

  const formatReaderMap = {
    aztec: BarcodeFormat.AZTEC,
    code_128: BarcodeFormat.CODE_128,
    code_39: BarcodeFormat.CODE_39,
    data_matrix: BarcodeFormat.DATA_MATRIX,
    ean_13: BarcodeFormat.EAN_13,
    ean_8: BarcodeFormat.EAN_8,
    itf: BarcodeFormat.ITF,
    maxicode: BarcodeFormat.MAXICODE,
    pdf417: BarcodeFormat.PDF_417,
    qr_code: BarcodeFormat.QR_CODE,
    rss_14: BarcodeFormat.RSS_14,
    rss_expanded: BarcodeFormat.RSS_EXPANDED,
    upc_a: BarcodeFormat.UPC_A,
    upc_e: BarcodeFormat.UPC_E,
    upc_ean_extension: BarcodeFormat.UPC_EAN_EXTENSION
  }

  class BarcodeDetectorPolyfill {
    constructor({ formats }) {
      const hints = new Map();
      hints.set(
        DecodeHintType.POSSIBLE_FORMATS,
        formats.map(format => formatReaderMap[format] ?? format)
      );
      this.reader = new BrowserMultiFormatReader(hints);
    }
    static getSupportedFormats = () => Promise.resolve(supportedFormats);

    detect = source => {
      if(!source) return Promise.reject(new Error('Source is undefined'));
      const reader = this.reader;
      return new Promise((resolve, reject) => {
        imageToImage(source).then(image => {
          if(!image) {
            reject('Image is undefined.');
            return;
          }
          return reader.decodeFromImage(image).then(({format, resultPoints, text}) => {
            let codeFormat = format;
            Object.entries(formatReaderMap).forEach(([key, value]) => {
              if(format === value) codeFormat = key;
            });
            const barcode = {
              format: codeFormat,
              cornerPoints: resultPoints,
              rawValue: text,
            };
            resolve([barcode]);
          }).catch(error => {
            if(error.message.includes('No MultiFormat Readers were able to detect the code.')) {
              resolve([]);
            } else {
              reject(error);
            }
          });
        }).catch(error => {
          reject(error);
        });
      });
    }
  }

  window.BarcodeDetector = BarcodeDetectorPolyfill;
}
