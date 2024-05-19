import unwarpClipAsURL from './unwarpClipAsURL.js';

let frameId;
let intervalId;
let barcodes = [];
let detector;
let readyToDetect = true;
let detected = [];
let scanStart = performance.now();
let selectedBarcode;

const formatMap = {
  qr_code: 'QR Code',
  aztec: "Aztec",
  code_128: 'Code-128',
  code_39: 'Code-39',
  data_matric: 'Data Matrix',
  ean_13: 'EAN-13',
  ean_8: 'EAN-8',
  itf: 'Code 2 of 5',
  pdf417: 'PDF417',
  upc_e: 'UPC-E'
};

const addSampleImage = (len = 1) => {
  const image = new Image();
  image.src = 'detected-qr-code-hello.png';
  const words = "these are some words to use in a sentence that is random and can go on and on in a silly sort of way if you want".split(' ');
  const values = [];
  while(values.length < len) values.push(words[Math.floor(Math.random() * words.length)]);
  detected.push({
    format: 'qr_code',
    rawValue: values.join(" "),
    image
  });
}
const handleWindowLoad = () => {
  addSampleImage();
  addSampleImage(500);
  addSampleImage();

  if (!("BarcodeDetector" in window)) {
    const detected = document.getElementById('detected');
    detected.innerText = 'BarcodeDetector not supported. Are you using SSL?';
    return;
  }

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
    selectedBarcode = undefined;
    showDetected();
  });
  document.getElementById('barcode-info-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(detected[selectedBarcode].rawValue);
  });
  document.getElementById('barcode-info-delete').addEventListener('click', () => {
    detected.splice(selectedBarcode, 1);
    document.getElementById('barcode-info-back').click();
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
    frameId = window.requestAnimationFrame(drawVideo);
    // lower numbers cause barcodes to be misaligned with video
    intervalId = window.setInterval(scanVideo, 1000 / 60);
  });

  showDetected();

}
const displayBarcode = index => {
  selectedBarcode = index;
  const barcode = detected[index];
  document.getElementById('detected').classList.remove('is-visible')
  const container = document.getElementById('barcode-info');
  container.classList.add('is-visible');
  document.getElementById('barcode-info-image').src = barcode.image.src;
  document.getElementById('barcode-info-format').innerText = formatMap[barcode.format] ?? barcode.format;
  document.getElementById('raw-data').innerText = barcode.rawValue;

}
const scanImage = (source) => {
  detector.detect(source).then(codes => {
    barcodes = codes;
    barcodes.forEach(({ format, cornerPoints, rawValue, boundingBox }) => {
      if(!detected.find(d => d.rawValue === rawValue)) {
        const image = new Image();
        detected.push({
          format,
          rawValue,
          image
        });
        unwarpClipAsURL(source, cornerPoints, {width: 64, height: 200}).then(src => {
          image.src = src;
          showDetected();
        })
      }
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
  detected.forEach(({image, rawValue, format}, i) => {
    const div = document.createElement('div');
    div.className = 'list-item'
    div.addEventListener('click', () => displayBarcode(i));
    container.appendChild(div);
    const imageContainer = document.createElement('span');
    imageContainer.className = 'barcode';
    imageContainer.append(image);
    div.append(imageContainer);
    image.alt = format;
    const span = document.createElement('span');
    span.className = 'long-text';
    span.innerText = rawValue;

    div.append(span);
  })
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
  frameId = window.requestAnimationFrame(drawVideo);
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