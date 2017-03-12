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

  pm.url = function(){
    return canvas.toDataURL();
  }

  pm.expectedCycleLength = function(){
    var o = Pixel(0, 0, [0, 0, 0, 0]);
    var p = o;
    var count = 0;
    while (count == 0 || !p.isEqual(o)){
      var c = p.stepRainbow(pm.delta);
      p = Pixel(0, 0, c);
      count += 1;
    }
    // console.log(o, p);
    return count;
  }

  return pm;
}

function StateManager(){
  var sm = {};
  sm.img = null;
  sm.imgUrl = null;
  sm.pm = null;
  sm.imgs = null;
  sm.active = null;
  sm.expected = null;
  sm.direction = null;
  sm.index = null;

  function drawLoop(){
    sm.index = (sm.index + sm.direction + sm.imgs.length) % sm.imgs.length;
    document.body.style.backgroundImage = "url('" + sm.imgs[sm.index] + "')";
    if (sm.active){
      setTimeout(drawLoop, 33);
    }
  }
  function startDrawLoop(){
    $('#loading').hide();
    // console.log(sm);
    sm.active = true;
    drawLoop();
  }

  function queueImageCalc(){
    sm.pm.stepRainbow();
    sm.imgs.push(sm.pm.url());
    if (sm.pm.checkLoop()){
      startDrawLoop();
    } else {
      var percent = parseInt(100.0 * sm.imgs.length / sm.expected);
      $('#percent').html(percent);
      setTimeout(queueImageCalc, 0);
    }
  }

  function processImage(pm){
    $('#loading').show();
    sm.pm = pm;
    sm.imgs = [sm.pm.url()];
    document.body.style.backgroundImage = "url('" + sm.imgs[0] + "')";
    sm.active = false;
    sm.expected = pm.expectedCycleLength();
    sm.direction = 1;
    sm.index = -1;
    queueImageCalc();
  }

  function loadImage(){
    var size = $('#size').val();
    var canvas = document.getElementById("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d").drawImage(
      sm.img,
      0, 0, sm.img.width, sm.img.height,
      0, 0, canvas.width, canvas.height
    );
    var pm = PixelManager(canvas);
    processImage(pm);
  }
  function loadImageUrl(imgUrl){
    sm.imgUrl = imgUrl || sm.imgUrl;
    sm.img = new Image;
    sm.img.onload = function() {
      loadImage();
    };
    sm.img.src = imgUrl;
  }
  $('body').click(function(){
    sm.direction *= -1;
  });
  $("#size-update").click(loadImage);
  var imageLoader = document.getElementById('image-loader');
  imageLoader.addEventListener('change', function(e1){
    var reader = new FileReader;
    reader.onload = function(e2){
      var source = e2.target.result;
      loadImageUrl(source);
    };
    reader.readAsDataURL(e1.target.files[0]);
  }, false);

  // init
  loadImageUrl("clay.jpg");
}


function init(){
  var menuHidden = true;
  function toggleMenu(){
    menuHidden = !menuHidden;
    if (menuHidden){
      $("#menu").hide();
    } else {
      $("#menu").show();
    }
  }
  $("body").keypress(function( event ) {
    if ( event.which == 96 ) {
      // `
      event.preventDefault();
      toggleMenu();
    }
  });
  StateManager();
  // debug
  toggleMenu();
};
