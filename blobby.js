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