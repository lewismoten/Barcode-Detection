import unwarpClipAsURL from './unwarpClipAsURL.js';
import * as stateManager from './stateManager.js';
import {
  dataUrlToBlob,
  blobToDataUrl
} from './blobby.js';
import './BarcodeDetectorPolyfill.js';

let barcodes = [];
let detector;
let readyToDetect = true;
let scanStart = performance.now();
let selectedId;
let id = 0;
const formatMap = {
  qr_code: 'QR Code',
  aztec: "Aztec",
  code_128: 'Code-128',
  code_39: 'Code-39',
  data_matrix: 'Data Matrix',
  ean_13: 'EAN-13',
  ean_8: 'EAN-8',
  itf: 'Code 2 of 5',
  pdf417: 'PDF417',
  upc_e: 'UPC-E'
};

const handleWindowLoad = () => {
  stateManager.nextId().then(nextId => id = nextId);

  BarcodeDetector.getSupportedFormats().then(supportedFormats => {
    detector = new BarcodeDetector({ formats: supportedFormats })
  });

  document.getElementById('chooseImage').addEventListener('click', () => {
    document.getElementById('file').click();
  });

  document.getElementById('file').addEventListener('change', ({ target: { files: [file]}}) => {
    handleImageChange(file);
  });

  document.getElementById('barcode-info-back').addEventListener('click', () => {
    document.getElementById('detected').classList.add('is-visible');
    document.getElementById('barcode-info').classList.remove('is-visible');
    selectedId = undefined;
    showDetected();
  });
  document.getElementById('barcode-info-copy').addEventListener('click', () => {
    stateManager.selectOne(selectedId).then(barcode => {
      navigator.clipboard.writeText(barcode.rawValue);
    });
  });
  document.getElementById('barcode-info-delete').addEventListener('click', () => {
    stateManager.deleteOne(selectedId).then(() => {
      document.getElementById('barcode-info-back').click();
    });
  });

  navigator.mediaDevices.getUserMedia({ 
    video: {
      width: { ideal: 320 },
      height: { ideal: 200 },
      frameRate: { ideal: 15 }
    } 
  }).then((stream) => {
    const video = document.getElementById('video');
    video.srcObject = stream;
    video.play();
    window.requestAnimationFrame(drawVideo);
    window.setInterval(scanVideo, 1000 / 60);
  });

  showDetected();

}

const displayBarcode = id => {
  stateManager.selectOne(id).then(({imageBlob, format, rawValue}) => {
    selectedId = id;
    document.getElementById('detected').classList.remove('is-visible')
    const container = document.getElementById('barcode-info');
    container.classList.add('is-visible');
    const image = document.getElementById('barcode-info-image');
    image.alt = format;  
    if(imageBlob) {
      blobToDataUrl(imageBlob).then(url => {
        image.src = url;
        URL.revokeObjectURL(url);
      });
    } else {
      delete image.src;
    }
    document.getElementById('barcode-info-format').innerText = formatMap[format] ?? format;
    document.getElementById('raw-data').innerText = rawValue;
  });
}
const scanImage = (source) => {
  detector.detect(source).then(codes => {
    barcodes = codes;
    barcodes.forEach(({ format, cornerPoints, rawValue, boundingBox }) => {
      stateManager.hasValue('rawValue', rawValue).then(hasValue => {
        if(hasValue) return;
        const item = {
          id: ++id,
          format,
          rawValue,
        };
        stateManager.insertOne(item).then(() => {
          unwarpClipAsURL(source, cornerPoints, {width: 64, height: 200}).then(imageSrc => {
            const imageBlob = dataUrlToBlob(imageSrc);
            stateManager.updateOne(id, {imageBlob}).then(showDetected);
          });
        });
      })
    });
  }).catch(err => {
    console.log(err);
  }).finally(() => {
    readyToDetect = true;
  });
}
const scanVideo = () => {
  const video = document.getElementById('video');
  if(readyToDetect && video && !video.paused && video.srcObject) {
    readyToDetect = false;
    scanImage(video);
  }
}
const showDetected = () => {
  const container = document.getElementById('detected');
  container.innerHTML = '';
  stateManager.selectAll().then(detected => {
    detected.forEach(({id, imageBlob, rawValue, format}, i) => {
      const div = document.createElement('div');
      div.className = 'list-item'
      div.addEventListener('click', () => displayBarcode(id));
      container.appendChild(div);
      const imageContainer = document.createElement('span');
      imageContainer.className = 'barcode';
      div.append(imageContainer);
      if(imageBlob) {
        const image = new Image();
        image.alt = format;  
        imageContainer.append(image);
        blobToDataUrl(imageBlob).then(url => {
          image.src = url;
          URL.revokeObjectURL(url);
        });
      }
      const span = document.createElement('span');
      span.className = 'long-text';
      span.innerText = rawValue;
  
      div.append(span);
    })
  });

}
const drawVideo = () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('scanned-video');
  canvas.width = video.width;
  canvas.height = video.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if(barcodes.length === 0) {
    const duration = 5000;
    const progress = ((performance.now() - scanStart) % duration) / duration;
    const scanLine = progress * canvas.height;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(0, scanLine);
    ctx.lineTo(canvas.width, scanLine);
    ctx.stroke();
  } else {
    barcodes.forEach(({cornerPoints}) => {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'Yellow';
      ctx.beginPath();
      cornerPoints.forEach((point, i) => {
        if(i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.stroke();
    });
  }
  window.requestAnimationFrame(drawVideo);
}

const handleImageChange = file => {
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ({target: { result }}) => {
    const image = new Image();
    image.src = result;
    image.onload = () => {
      scanImage(image);
    }
  }
  reader.readAsDataURL(file);
}
window.onload = handleWindowLoad;