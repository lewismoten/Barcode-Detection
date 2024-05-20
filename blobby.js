export const dataUrlToBlob = (dataUrl) => {
  if(dataUrl === 'data:,') return;
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
export const blobToDataUrl = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ({ target: { result }}) => resolve(result);
    reader.onerror = ({ target: { error }}) => reject(error);
    reader.readAsDataURL(blob);
});
}

export const imageToImageData = image => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export const imageToDataURL = image => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
}

export const imageToImage = image => {
  return new Promise((resolve, reject) => {
    const { width, height} = image;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    const img = new Image(width, height);
    const handleLoad = () => {
      img.removeEventListener('load', handleLoad);
      resolve(img);
    };
    img.addEventListener('load', handleLoad)
    img.src = canvas.toDataURL();
  });
}