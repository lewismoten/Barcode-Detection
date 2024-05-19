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

  if(width > clamp.width) {
    height *= clamp.width / width;
    width = clamp.width;
  }

  if(height > clamp.height) {
    width *= clamp.height / height;
    height = clamp.height;
  }

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

export default unwarpClipAsURL;