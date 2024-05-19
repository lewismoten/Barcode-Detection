let selectedFormat = 'qr_code';

const handleWindowLoad = () => {
  if (!("BarcodeDetector" in window)) {
    const detected = document.getElementById('detected');
    detected.innerText = 'BarcodeDetector not supported. Are you using SSL?';
    return;
  }

  BarcodeDetector.getSupportedFormats().then(supportedFormats => {
    const select = document.getElementById('format');
    supportedFormats.forEach((format) => {
      const option = document.createElement('option');
      option.text = format;
      option.value = format;
      if(format === selectedFormat) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  });

  document.getElementById('chooseImage').addEventListener('click', () => {
    document.getElementById('file').click();
  });

  document.getElementById('file').addEventListener('change', ({ target: { files: [file]}}) => {
    handleImageChange(file);
  });

  document.getElementById('scan').addEventListener('click', () => {
    const detected = document.getElementById('detected');
    const previewImage = document.getElementById('previewImage');
    if(!previewImage.src) {
      detected.innerText = 'No image selected.';
      return;
    }
    const select = document.getElementById('format');
    const format = select.options[select.selectedIndex].value;
    const detector = new BarcodeDetector({ formats: [format] });

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
  })

}
const handleImageChange = file => {
  const detected = document.getElementById('detected');
  if(!file) return;
  detected.innerText = 'Loading image...';
  const reader = new FileReader();
  reader.onload = ({target: { result }}) => {
    document.getElementById('previewImage').src = result;
    detected.innerText = 'Loaded Image.';
  }
  reader.readAsDataURL(file);
}
window.onload = handleWindowLoad;