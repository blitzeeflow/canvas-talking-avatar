document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");
  const audio = document.getElementById("speechAudio");
  const background = new Image();
  let swayAngle = 0;
  let swayDirection = 1;
  const maxSwayAngle = 0.002; // Maximum sway angle, for subtlety
  const swaySpeed = 0.00005; // Speed of swaying
  function resizeCanvas() {
    const aspectRatio = 1152 / 1826;
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;

    // Determine the limiting dimension
    if (maxWidth / maxHeight > aspectRatio) {
      // Window is wider than the desired aspect ratio
      canvas.height = maxHeight;
      canvas.width = maxHeight * aspectRatio;
    } else {
      // Window is taller than or equal to the desired aspect ratio
      canvas.width = maxWidth;
      canvas.height = maxWidth / aspectRatio;
    }

    if (window.innerWidth > window.innerHeight) {
      canvas.style.transform = "translate(-50%,20%)";
    } else if (window.innerWidth >= 630) {
      canvas.style.transform = "translate(-50%,10%)";
    } else {
      canvas.style.transform = "translate(-50%,0%)";
    }
    // Redraw or reposition elements on canvas if needed
    // For instance, redraw the initial mouth state image
    ctx.drawImage(images[2], 0, 0, canvas.width, canvas.height);
  }

  window.addEventListener("resize", resizeCanvas);
  document.querySelector("#play").addEventListener("click", () => {
    console.log("click", audioContext);
    if (!audioContext) {
      setupAudioContext();
    }
    document.querySelector("#play").classList.add("hide");
    audio.play();
  });

  let mouthUpdateCounter = 0;
  let mouthUpdateFrequency = 7; // Higher value = slower mouth movement
  background.src = "images/bg.png"; // Set path to background image

  background.onload = () => {
    // ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
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
    analyser?.getByteFrequencyData(dataArray);

    // Increment the mouth update counter
    mouthUpdateCounter++;

    if (mouthUpdateCounter >= mouthUpdateFrequency && dataArray) {
      // Update the mouth state based on audio analysis
      let sum = dataArray?.reduce((a, b) => a + b, 0) || 0;
      let average = sum / dataArray?.length;

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

    // Calculate the pivot point (e.g., bottom center of the image)
    const xPivot = canvas.width / 2;
    const yPivot = canvas.height - images[currentImageIndex].height / 2;

    // Update sway angle for subtle and consistent swaying
    swayAngle += swaySpeed * swayDirection;
    if (swayAngle > maxSwayAngle || swayAngle < -maxSwayAngle) {
      swayDirection *= -1; // Change direction when max or min is reached
    }
    ctx.save();
    // Translate to the bottom center of the image
    ctx.translate(xPivot, yPivot);

    ctx.rotate(swayAngle);
    ctx.drawImage(
      images[currentImageIndex],
      -canvas.width / 2,
      0,
      canvas.width,
      canvas.height
    );
    // Restore the canvas state
    ctx.restore();
  }

  audio.addEventListener("play", () => {
    if (!audioContext) {
      setupAudioContext();
    }
  });

  images.forEach((img, index) => {
    img.onload = () => {
      if (index === 2) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    };
  });

  resizeCanvas();
  animate();
});
