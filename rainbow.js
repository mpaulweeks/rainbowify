function Pixel(x, y, pixelData, index){
  var p = {};
  index = index || 0;
  p.x = x;
  p.y = y;
  p.r = pixelData[index + 0];
  p.g = pixelData[index + 1];
  p.b = pixelData[index + 2];
  p.a = pixelData[index + 3];

  function transform(num, diff, delta){
    return ((num + (delta * diff)) + 255) % 255;
    // return ((num + (delta * diff)) - 55) % 150 + 55;
  }

  p.stepRainbow = function(delta){
    return [
      transform(p.r, 4, delta),
      transform(p.g, 6, delta),
      transform(p.b, 8, delta),
      p.a
    ]
  }
  return p;
}

function PixelManager(canvas){
  var pm = {};

  var context = canvas.getContext('2d');
  var height = canvas.height;
  var width = canvas.width;
  var imgData = context.getImageData(0, 0, width, height);
  var oldData = context.getImageData(0, 0, width, height); // might want this?
  pm.delta = 1;

  pm.getPixel = function(x, y){
    if (x < 0 || x >= width || y < 0 || y >= height){
      return null;
    }
    var index = (y * width + x) * 4;
    pixel = Pixel(x,y,imgData.data,index);
    return pixel;
  }

  pm.stepRainbow = function(){
    for (var x = 0; x < width; x++) {
      for (var y = 0; y < height; y++) {
        var newPixel = pm.getPixel(x, y);
        var newColors = newPixel.stepRainbow(pm.delta);
        var index = (y * width + x) * 4;
        for (var i = 0; i < 4; i++){
          imgData.data[index + i] = newColors[i];
        }
      }
    }
    context.putImageData(imgData, 0, 0);
  }

  return pm;
}


function init(){

  var canvas = document.getElementById("canvas");
  var pm = null;
  var ready = true;
  var size = 100;

  function stepRainbow(){
    pm.stepRainbow();
    var url = canvas.toDataURL();
    document.body.style.backgroundImage = "url('" + url + "')";
  }

  function queueRainbow(){
    setInterval(stepRainbow, 30);
  }

  var rawImg = new Image;
  rawImg.onload = function() {
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d").drawImage(
      rawImg,
      0, 0, rawImg.width, rawImg.height,
      0, 0, canvas.width, canvas.height
    );
    pm = PixelManager(canvas);
    $('body').click(function(){
      pm.delta *= -1;
    })
    queueRainbow();
  };
  rawImg.src = "clay.jpg";

};
