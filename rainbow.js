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
    return parseInt(((num + (delta * diff)) + 255) % 255);
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
  pm.context = context;

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
  sm.imageObjs = null;
  sm.gif = null;
  sm.gifb = null;

  function assembleGif(){
    sm.gif = new GIF({
      workers: 2,
      quality: 10
    });
    sm.gifb = new GIF({
      workers: 2,
      quality: 10
    });
    $('#message').html("generating GIF...");
    var length = sm.imageObjs.length;
    for (var i = 0; i < length; i++){
      sm.gif.addFrame(sm.imageObjs[i], {delay: 33});
      sm.gifb.addFrame(sm.imageObjs[length - (i + 1)], {delay: 50});
      $('#percent').html(parseInt(100.0 * i / length));
    }
    $('#message').html("loading GIF...");
    sm.gif.on('finished', function(blob) {
      $('#loading').hide();
      sm.gifUrl = URL.createObjectURL(blob);
      $('#gif-src').attr('href', sm.gifUrl);
      document.body.style.backgroundImage = "url('" + sm.gifUrl + "')";
      sm.gifb.on('finished', function(blob) {
        sm.gifbUrl = URL.createObjectURL(blob);
        $('#gifb-src').attr('href', sm.gifbUrl);
        $('#download').removeClass('hidden');
      });
      sm.gifb.render();
    });
    sm.gif.render();
  }
  function loopGifProduction(index){
    if (index < sm.imgs.length){
      var img = new Image;
      img.onload = function() {
        sm.imageObjs.push(img);
        $('#percent').html(parseInt(100.0 * index / sm.expected));
        loopGifProduction(index + 1);
      };
      img.src = sm.imgs[index];
    } else {
      assembleGif();
    }
  }
  function startGifCreation(){
    $('#message').html("generating images...");
    // console.log(sm);
    loopGifProduction(0);
  }

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
      // startDrawLoop();
      startGifCreation();
    } else {
      $('#percent').html(parseInt(100.0 * sm.imgs.length / sm.expected));
      setTimeout(queueImageCalc, 0);
    }
  }

  function processImage(pm){
    $('#message').html("rainbowifying...");
    $('#loading').show();
    $('#download').addClass('hidden');
    sm.pm = pm;
    sm.imgs = [sm.pm.url()];
    document.body.style.backgroundImage = "url('" + sm.imgs[0] + "')";
    sm.active = false;
    sm.expected = pm.expectedCycleLength();
    sm.direction = 1;
    sm.index = -1;
    sm.imageObjs = [];
    queueImageCalc();
  }

  function loadImage(){
    var size = $('#size').val();
    var canvas = document.getElementById("canvas");
    canvas.width = size;
    canvas.height = parseInt(canvas.width * (sm.img.height / sm.img.width));
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
  $('#container').click(function(){
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
      $("#menu").addClass("hidden");
    } else {
      $("#menu").removeClass("hidden");
    }
  }
  $("body").keypress(function( event ) {
    // console.log(event.which);
    if ( event.which == 109 || event.which == 77 ) {
      // m
      event.preventDefault();
      toggleMenu();
    }
  });
  StateManager();
  // debug
  toggleMenu();
};
