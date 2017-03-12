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

  p.isEqual = function(o){
    if (!(p.x == o.x && p.y == o.y)){
      throw "invalid pixel compare";
    }
    if (p.a != o.a){
      throw "alpha should be unaffected";
    }
    var acceptableDiff = 5;
    return (
      Math.abs(p.r - o.r) < acceptableDiff &&
      Math.abs(p.g - o.g) < acceptableDiff &&
      Math.abs(p.b - o.b) < acceptableDiff
    )
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

  pm.checkLoop = function(){
    var oldPixel = pm.getPixel(0, 0, oldData);
    var newPixel = pm.getPixel(0, 0, imgData);
    var result = oldPixel.isEqual(newPixel);
    if (result){
      console.log(oldPixel, newPixel);
    }
    return result;
  }

  pm.getPixel = function(x, y, data){
    if (x < 0 || x >= width || y < 0 || y >= height){
      return null;
    }
    data = data || imgData;
    var index = (y * width + x) * 4;
    pixel = Pixel(x,y,data.data,index);
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
  var size = 200;
  var direction = 1;

  function cacheRainbow(){
    var imgs = [];
    while (imgs.length == 0 || !pm.checkLoop()){
      pm.stepRainbow();
      imgs.push(canvas.toDataURL());
    }
    $('#loading').hide();
    var index = 0;
    setInterval(function (){
      document.body.style.backgroundImage = "url('" + imgs[index] + "')";
      index = (index + direction + imgs.length) % imgs.length;
    }, 33);
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
      direction *= -1;
    })
    cacheRainbow();
  };
  rawImg.src = "clay.jpg";

};
