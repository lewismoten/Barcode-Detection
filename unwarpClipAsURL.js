// <script src="https://docs.opencv.org/4.5.4/opencv.js" async></script>

const unwarpClipAsURL = async (
  original,
  cornerPoints,
  clamp = {width: original.width, height: original.height}
) => {
  const [
    topLeft,
    topRight,
    bottomRight,
    bottomLeft
  ] = cornerPoints;

  let width = Math.sqrt(
    (bottomRight.x - bottomLeft.x) ** 2 + 
    (bottomRight.y - bottomLeft.y) ** 2
  );
  let height = Math.sqrt(
    (topRight.x - bottomRight.x) ** 2 +
    (topRight.y - bottomRight.y) ** 2
  );

  const scaled = scaleToFit(width, height, clamp);
  width = scaled.width;
  height = scaled.height;

  // copy original image to canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = original.width;
  canvas.height = original.height;
  ctx.drawImage(original, 0, 0, canvas.width, canvas.height);

  // pass canvas to cv
  const sourceImage = await cv.imread(canvas);

  // Convert corners to flat array
  const count = cornerPoints.length;
  const sourcePoints = cornerPoints.reduce(
    (points, point) => [...points, point.x, point.y], 
    []
  );

  // Where the corners should end up
  const destinationPoints = [
    0, 0,
    width, 0,
    width, height,
    0, height
  ];

  const sourceMatrix = cv.matFromArray(
    count, 1, cv.CV_32FC2, sourcePoints
  );
  const destinationMatrix = cv.matFromArray(
    count, 1, cv.CV_32FC2, destinationPoints
  );
  // Warp it
  const matrix = cv.getPerspectiveTransform(
    sourceMatrix,
    destinationMatrix
  );
  const warped = new cv.Mat();
  cv.warpPerspective(
    sourceImage, warped, matrix, sourceImage.size()
  );

  // Cleanup
  sourceMatrix.delete();
  destinationMatrix.delete();
  matrix.delete();

  // Back to image
  const imageData = new ImageData( 
    new Uint8ClampedArray(warped.data),
    warped.cols,
    warped.rows
  );
  canvas.width = width;
  canvas.height = height;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

const scaleToFit = (width, height, target) => {
  const ratio = width / height;

  if(width > target.width) {
    // too wide
    height *= target.width / width;
    width = target.width;
  }

  if(height > target.height) {
    // too tall
    width *= target.height / height;
    height = target.height;
  }

  if(width < target.width && height < target.height) {
    // too small
    const tempHeight = height * (target.width / width);
    if(tempHeight <= target.height) {
      height = tempHeight;
      width = target.width;
    } else {
      width *= target.height / height;
      height = target.height;
    }
  }
  return {width, height};
}

export default unwarpClipAsURL;