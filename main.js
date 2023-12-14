document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");
  const audio = document.getElementById("speechAudio");
  const background = new Image();
  function resizeCanvas() {
    const aspectRatio = 18 / 13;
    canvas.width = window.innerWidth;
    canvas.height = window.innerWidth / aspectRatio;

    // Redraw or reposition elements on canvas if needed
    // For instance, redraw the initial mouth state image
    ctx.drawImage(images[2], 0, 0, canvas.width, canvas.height);
  }

  window.addEventListener("resize", resizeCanvas);

  let mouthUpdateCounter = 0;
  let mouthUpdateFrequency = 7; // Higher value = slower mouth movement
  background.src = "images/bg.png"; // Set path to background image

  background.onload = () => {
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  };

  const imageSources = [
    "images/mouth-open-eyes-open.png",
    "images/mouth-slightly-open-eyes-open.png",
    "images/mouth-closed-eyes-open.png",
    "images/mouth-open-eyes-closed.png",
    "images/mouth-slightly-open-eyes-closed.png",
    "images/mouth-closed-eyes-closed.png",
  ];

  const images = imageSources.map((src) => {
    const img = new Image();
    img.src = src;
    return img;
  });

  let mouthState = 2; // Initial state: mouth closed
  let isBlinking = false;
  let audioContext, analyser, source, dataArray;

  function setupAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
  }
  function randomIntFromInterval(min, max) {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  let lastBlinkTime = 0;
  const blinkFrequency = 4000; // Time in milliseconds (e.g., blink every 4 seconds)
  const blinkDuration = 200; // Duration of a blink in milliseconds

  function animate() {
    requestAnimationFrame(animate);
    analyser.getByteFrequencyData(dataArray);

    // Increment the mouth update counter
    mouthUpdateCounter++;

    if (mouthUpdateCounter >= mouthUpdateFrequency) {
      // Update the mouth state based on audio analysis
      let sum = dataArray.reduce((a, b) => a + b, 0);
      let average = sum / dataArray.length;

      if (average < 5) {
        mouthState = 2; // Mouth closed
      } else if (average < 20) {
        mouthState = randomIntFromInterval(1, 2); // Mouth slightly open
      } else {
        mouthState = randomIntFromInterval(0, 2); // Mouth open
      }

      mouthUpdateCounter = 0; // Reset the counter
    }
    // Blinking logic
    if (!isBlinking && Math.random() < 0.01) {
      // Adjust probability as needed
      isBlinking = true;
      setTimeout(() => {
        isBlinking = false;
      }, 200); // Blink duration
    }

    // Combine mouth state and blink state to get current image index
    let currentImageIndex = mouthState + (isBlinking ? 3 : 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(images[currentImageIndex], 0, 0, canvas.width, canvas.height);
  }

  audio.addEventListener("play", () => {
    if (!audioContext) {
      setupAudioContext();
    }
    animate();
  });

  images.forEach((img, index) => {
    img.onload = () => {
      if (index === 2) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    };
  });

  resizeCanvas();
});
