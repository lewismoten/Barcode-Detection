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
let errors = [];
let frameId;
let intervalId;

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
  stateManager.nextId()
    .then(nextId => id = nextId)
    .catch(e => addError(`Failed to get next id: ${e}`));

  BarcodeDetector.getSupportedFormats().then(supportedFormats => {
    detector = new BarcodeDetector({ formats: supportedFormats })
  }).catch(e => addError(`Failed to get supported barcode formats: ${e}`));

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
    }).catch(e => addError(`Failed to select record: ${e}`));
  });
  document.getElementById('barcode-info-delete').addEventListener('click', () => {
    stateManager.deleteOne(selectedId).then(() => {
      document.getElementById('barcode-info-back').click();
    }).catch(e => addError(`Failed to delete record: ${e}`));
  });

  const video = document.getElementById('video');
  video.addEventListener('canplay', () => {
    addError(`Video Size ${video.width}x${video.height}`);
    video.play();
    startTimers();
  })
  video.addEventListener('pause', () => {
    stopTimers();
  });
  video.addEventListener('error', e => {
    addError(`Video Error: ${e}`);
  });
  navigator.mediaDevices.getUserMedia({ 
    video: {
      width: { exact: video.width },
      height: { exact: video.height },
      frameRate: { ideal: 15 },
      facingMode: 'environment'
    } 
  }).then((stream) => {
    video.srcObject = stream;
    const settings = stream.getVideoTracks()[0].getSettings();
    addError(`size: ${settings.width}x${settings.height} aspectRatio: ${settings.aspectRatio} frameRate: ${settings.frameRate} resizeMode: ${settings.resizeMode}`)
    stream.getTracks().forEach((track, i) => {
      addError(`Track ${i}: ${track.label} (${track.kind}) ${track.readyState} enabled: ${track.enabled}`);
    })
  }).catch(e => addError(`Unable to getUserMedia: ${e}`));

  showDetected();

}
const startTimers = () => {
  if(frameId === undefined) {
    frameId = window.requestAnimationFrame(drawVideo);
  }
  if(intervalId === undefined) {
    readyToDetect = true;
    intervalId = window.setInterval(scanVideo, 100);
    scanVideo();
  }
}
const stopTimers = () => {
  readyToDetect = false;
  window.cancelAnimationFrame(frameId);
  window.clearInterval(intervalId);
  frameId = undefined;
  intervalId = undefined;
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
      }).catch(e => addError(`Failed to convert blob to data url: ${e}`));
    } else {
      delete image.src;
    }
    document.getElementById('barcode-info-format').innerText = formatMap[format] ?? format;
    document.getElementById('raw-data').innerText = rawValue;
  }).catch(e => addError(`Failed to select record: ${e}`));
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
            stateManager
              .updateOne(id, {imageBlob})
              .then(showDetected)
              .catch(e => addError(`Failed to update image: ${e}`));
          }).catch(e => addError(`Failed to unwarp clip: ${e}`));
        }).catch(e => addError(`Failed to insert: ${e}`));
      }).catch(e => addError(`Failed to check if value exists: ${e}`))
    });
  }).catch(e => addError(`Failed to detect: ${e}`)).finally(() => {
    readyToDetect = true;
  });
}
const addError = err => {
  errors.unshift(err);
  if(errors.length > 20) {
    errors.splice(20);
  }
  const container = document.getElementById('errors');
  container.innerHTML = '';
  errors.forEach((error, i) => {
    const item = document.createElement('div');
    item.innerText = error;
    container.prepend(item);
  });
}
const scanVideo = () => {
  const video = document.getElementById('video');
  if(readyToDetect) {
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
          // URL.revokeObjectURL(url);
        }).catch(e => {
          addError(`Failed to convert blob to data url: ${e}`)
        });
      }
      const span = document.createElement('span');
      span.className = 'long-text';
      span.innerText = rawValue;
  
      div.append(span);
    })
  }).catch(e => addError(`Failed to selectAll: ${e}`));

}
const scalePoints = ({x, y}) => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('scanned-video');
  const ratioX = canvas.width / video.width;
  const ratioY = canvas.height / video.height;
  return {
    x: x * ratioX,
    y: y * ratioY
  };
};

const drawVideo = () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('scanned-video');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, 200, 200);
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
      cornerPoints.map(scalePoints).forEach((point, i) => {
        if(i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.stroke();
    });
  }
  if(frameId) {
    frameId = window.requestAnimationFrame(drawVideo);
  }
}

const handleImageChange = file => {
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ({target: { result }}) => {
    const image = new Image();
    const handleLoad = () => {
      image.removeEventListener('load', handleLoad);
      scanImage(image);
    }
    image.addEventListener('load', handleLoad);
    image.src = result;
  }
  reader.readAsDataURL(file);
}
window.onload = handleWindowLoad;