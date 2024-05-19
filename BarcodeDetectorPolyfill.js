let NATIVE = ("BarcodeDetector" in window);
// NATIVE = false;

if(!NATIVE) {

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2/dist/quagga.min.js';
  document.head.append(script);

  const supportedFormats = [
    'code_128',
    'code_39',
    'ean_13',
    'ean_8',
    'itf',
    'upc_e',
    'code_39_vin',
    'codabar_reader',
    'upc',
    'i2of5',
    'code_93',
    'code_32'
  ];
  const formatReaderMap = {
    qr_code: '',
    aztec: "",
    code_128: 'code_128_reader',
    code_39: 'code_39_reader',
    data_matrix: '',
    ean_13: 'ean_reader',
    ean_8: 'ean_8_reader',
    itf: '2of5_reader',
    pdf417: '',
    upc_e: 'upc_e_reader',
    code_39_vin: 'code_39_vin_reader',
    codabar_reader: 'codabar_reader',
    upc: 'upc_reader',
    i2of5: 'i2of5_reader',
    code_93: 'code_93_reader',
    code_32: 'code_32_reader'
  }

  class BarcodeDetectorPolyfill {
    constructor({ formats }) {
      this.formats = formats;
      this.ready = false;
      if(!window.Quagga) {
        this.initId = window.setInterval(init, 500);
      } else {
        this.init();
      }
    }
    static getSupportedFormats = () => Promise.resolve(supportedFormats);
    init = () => {
      console.log('init');
      if(window.Quagga) {
        console.log('got quagga');
        if(this.initId) {
          window.clearInterval(this.initId);
          delete this.initId;
        }
        // window.Quagga.onDetected(this.handleDetected);
        // window.Quagga.onProcessed(this.handleProcessed);
        this.collector = window.Quagga.ResultCollector.create({
          capture: false,
          capacity: 20,
          filter: result => {
            return true;
          }
        });
        window.Quagga.registerResultCollector(this.collector);

        this.ready = true;
        window.Quagga.init({
          decoder: {
            readers: this.formats.map(format => formatReaderMap[format]).filter(Boolean),
            multiple: true
          }
        }, err => {
          if(err) {
            console.error(err);
          } else {
            window.Quagga.start();
            this.ready = true;
          }
        });
      }
    };
    handleDetected = result => {
      console.log('detected', result);
    }
    handleProcessed = result => {
      if(result === null) return Promise.resolve();
      // result = {barcodes: [], boxes: [...]}
      console.log('Processed', result);
      return Promise.resolve();
    }
    detect = source => {
      if(!this.ready) return Promise.reject(new Error('Not ready.'));
      let src;
      if(source.src) {
        src = source.src;
      } else if(source.toDataURL) {
        src = source.toDataURL();
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        src = canvas.toDataURL();
      }
    
      return new Promise((resolve, reject) => {
        const warn = console.warn;
        console.warn = () => {};
        const config = {
          src,
          decoder: {
            readers: ['code_128_reader']
          },
          debug: false,
          multiple: true,
          locate: true,
          singleChannel: true
        };
        const callback = result => {
          console.warn = warn.bind(console);
          if(result) {
            /*
            result does not have codeResult ?
            result = {
              barcodes: [],
              boxex: [
                [x1, y1],
                [x2, y2],
                [x3, y3],
                [x4, y4],
              ]
            };
            */
           console.log('got a result', result);
            if(result.boxes) {
              const barcodes = [];
              // format, cornerPoints, rawValue, boundingBox
              result.boxes.forEach(box => {
                const cornerPoints = box.map(([x, y]) => ({x, y}));
                barcodes.push({
                  format: 'code_128',
                  cornerPoints,
                  rawValue: "hello"
                });
              });
              resolve(barcodes);
            }
          }
          resolve([]);
        };
        window.Quagga.decodeSingle(config, callback);
      });
    }
  }

  window.BarcodeDetector = BarcodeDetectorPolyfill;
}
