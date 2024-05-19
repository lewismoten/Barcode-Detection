let selectedFormat = 'qr_code';
let frameId;
let intervalId;
let barcodes = [];
let detector;
let readyToDetect = true;

const handleWindowLoad = () => {
  if (!("BarcodeDetector" in window)) {
    const detected = document.getElementById('detected');
    detected.innerText = 'BarcodeDetector not supported. Are you using SSL?';
    return;
  }

  BarcodeDetector.getSupportedFormats().then(supportedFormats => {
    const select = document.getElementById('format');
    select.addEventListener('change', () => {
      const format = select.options[select.selectedIndex].value;
      detector = new BarcodeDetector({ formats: [format] });
    });
    supportedFormats.forEach((format) => {
      const option = document.createElement('option');
      option.text = format;
      option.value = format;
      if(format === selectedFormat) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.dispatchEvent(new Event('change'));
  });

  document.getElementById('chooseImage').addEventListener('click', () => {
    document.getElementById('file').click();
  });

  document.getElementById('file').addEventListener('change', ({ target: { files: [file]}}) => {
    handleImageChange(file);
  });
  document.getElementById('previewImage').addEventListener('load', () => {
    scan();
  });

  document.getElementById('scan').addEventListener('click', () => {
    scan();
  });
  document.getElementById('scan-camera').addEventListener('change', () => {
    document.getElementById('image-picker').style.display = 'none';
    document.getElementById('video-stream').style.display = '';
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
      intervalId = window.setInterval(scanVideo, 1000 / 15)
    })
  })
  document.getElementById('scan-image').addEventListener('change', ({target: { checked }}) => {
    if(frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = undefined;
    }
    if(intervalId) {
      window.clearInterval(intervalId);
      intervalId = undefined;
    }
    document.getElementById('image-picker').style.display = '';
    document.getElementById('video-stream').style.display = 'none';
    const video = document.getElementById('video');
    const stream = video.srcObject;
    if(stream) {
      stream.getTracks().forEach(track => track.stop());
      delete video.srcObject;
    }
  });
}
const scanVideo = () => {
  const video = document.getElementById('video');
  if(readyToDetect && video && !video.paused && video.srcObject) {
    readyToDetect = false;
    detector.detect(video).then(codes => barcodes = codes).catch(err => {
      console.log(err);
    }).finally(() => readyToDetect = true);
  }
}
const drawVideo = () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('scanned-video');
  canvas.width = video.width;
  canvas.height = video.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if(barcodes.length === 0) {
    document.getElementById('detected').innerText = 'No barcodes detected.';
  } else {
    document.getElementById('detected').innerText = barcodes.reduce((text, barcode, i) => {
      if(i !== 0) text += "\n";
      return text + barcode.rawValue;
    }, "");
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

  // barcodes.forEach(barcode => {
  //   context.moveTo()
  // });
  frameId = window.requestAnimationFrame(drawVideo);
}
const scan = () => {
  const detected = document.getElementById('detected');
  const previewImage = document.getElementById('previewImage');
  if(!previewImage.src) {
    detected.innerText = 'No image selected.';
    return;
  }
  detected.innerText = 'Detecting...';
  detector.detect(previewImage).then(barcodes => {
    if(barcodes.length === 0) {
      detected.innerText = 'No barcodes detected.';
      return;
    }
    detected.innerText = '';
    barcodes.forEach((barcode) => {
      const container = document.createElement('div');
      container.innerText = barcode.rawValue;
      detected.appendChild(container);
    });
  }).catch(err => {
    detected.innerText = `Error: ${err}`;
  });
}
const handleImageChange = file => {
  const detected = document.getElementById('detected');
  if(!file) return;
  detected.innerText = 'Loading image...';
  const reader = new FileReader();
  reader.onload = ({target: { result }}) => {
    document.getElementById('previewImage').src = result;
  }
  reader.readAsDataURL(file);
}
window.onload = handleWindowLoad;