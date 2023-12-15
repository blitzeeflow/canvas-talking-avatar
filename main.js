document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");
  const canvasStream = canvas.captureStream(30); // 30 FPS
  const audio = document.getElementById("speechAudio");
  const audioInput = document.getElementById("audioInput");
  const imageInput = document.getElementById("imageInput");
  let recorder;
  // Aspect ratios for YouTube (16:9) and TikTok (9:16)
  const youtubeAspectRatio = 16 / 9;
  const tiktokAspectRatio = 9 / 16;
  let currentImageIndex = 2;
  // Variable to store current video type ("youtube" or "tiktok")
  let videoType = "youtube"; // Change as needed
  let lastTimestamp = 0;
  let swayAngle = 0;
  let swayDirection = 1;
  const maxSwayAngle = 0.002; // Maximum sway angle, for subtlety
  const swaySpeed = 0.00005; // Speed of swaying
  let background = new Image();
  background.src = "images.bg.png"; // Replace with your background image path
  background.onload = () => {
    drawBackground();
  };

  function resizeCanvas() {
    const aspectRatio =
      videoType === "youtube" ? youtubeAspectRatio : tiktokAspectRatio;

    const windowWidth = canvas.parentElement.clientWidth;
    const windowHeight = canvas.parentElement.clientHeight;

    // Calculate the canvas size
    let canvasWidth, canvasHeight;

    if (windowHeight < windowWidth / aspectRatio) {
      canvasHeight = windowHeight;
      canvasWidth = canvasHeight * aspectRatio;
    } else {
      canvasWidth = windowWidth;
      canvasHeight = canvasWidth / aspectRatio;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Redraw the image
    drawImageScaled(images[currentImageIndex]);
  }

  function drawImageScaled(img) {
    const hRatio = canvas.width / img.width;
    const vRatio = canvas.height / img.height;
    const ratio = Math.min(hRatio, vRatio);

    const centerShift_x = (canvas.width - img.width * ratio) / 2;
    const centerShift_y = (canvas.height - img.height * ratio) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const canvasAspectRatio = canvas.width / canvas.height;
    drawBackground();
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      centerShift_x,
      centerShift_y + canvas.height * 0.2,
      img.width * ratio,
      img.height * ratio
    );
  }

  window.addEventListener("resize", resizeCanvas);

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
  let audioDestination;
  function setupAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaElementSource(audio);
    audioDestination = audioContext.createMediaStreamDestination();
    source.connect(audioDestination);
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

  let timeSinceLastBlink = 0;
  let timeToNextBlink = 4000; // Initial time until the next blink (4 seconds)
  const blinkDuration = 200; // Duration of a blink in milliseconds

  function animate(timestamp) {
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
    // Update the time since last blink
    if (timeSinceLastBlink < timeToNextBlink) {
      timeSinceLastBlink += timestamp ? timestamp - lastTimestamp : 16; // Approximate time passed since last frame (16ms for 60fps)
    } else {
      // Trigger a blink
      isBlinking = true;
      setTimeout(() => {
        isBlinking = false;
      }, blinkDuration);

      // Reset the timer and set the time for the next blink (4-7 seconds randomly)
      timeSinceLastBlink = 0;
      timeToNextBlink = 4000 + Math.random() * 3000;
    }

    lastTimestamp = timestamp;

    // Combine mouth state and blink state to get current image index
    currentImageIndex = mouthState + (isBlinking ? 3 : 0);

    drawImageScaled(images[currentImageIndex]);
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

  function drawBackground() {
    const ctx = canvas.getContext("2d");
    const canvasAspectRatio = canvas.width / canvas.height;
    const imgAspectRatio = background.width / background.height;

    let drawWidth, drawHeight, offsetX, offsetY;

    // Scaling logic based on aspect ratios
    if (canvasAspectRatio > imgAspectRatio) {
      // Canvas is wider than the image (relative to their aspect ratios)
      drawWidth = canvas.width;
      drawHeight = drawWidth / imgAspectRatio;
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2; // Center vertically
    } else {
      // Canvas is taller than or equal to the image (relative to their aspect ratios)
      drawHeight = canvas.height;
      drawWidth = drawHeight * imgAspectRatio;
      offsetX = (canvas.width - drawWidth) / 2; // Center horizontally
      offsetY = 0;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the scaled image
    ctx.drawImage(background, offsetX, offsetY, drawWidth, drawHeight);
  }

  function onSizeChange(event) {
    videoType = event.target.value;
    resizeCanvas();
  }
  imageInput.addEventListener("change", function (event) {
    const files = event.target.files;
    if (files.length > 0) {
      const imageUrl = URL.createObjectURL(files[0]);
      background = new Image();
      background.onload = () => {
        console.log("imageUrl", imageUrl);
        drawBackground();
      };
      background.src = imageUrl;
    }
  });
  audioInput.addEventListener("change", function (event) {
    const files = event.target.files;
    if (files.length > 0) {
      const audioUrl = URL.createObjectURL(files[0]);
      speechAudio.src = audioUrl;
    }
  });

  document
    .querySelector("#playButton")
    .addEventListener("click", function (event) {
      if (!audioContext) {
        setupAudioContext();
      }
      audio.play();
    });
  document
    .querySelector("#stopButton")
    .addEventListener("click", function (event) {
      if (!audioContext) {
        setupAudioContext();
      }
      audio.pause();
      audio.currentTime = 0;
    });

  document.querySelector("#youtube").addEventListener("change", onSizeChange);

  document.querySelector("#tiktok").addEventListener("change", onSizeChange);
  document.querySelector("#recordButton").addEventListener("click", () => {
    const combinedStream = new MediaStream([
      ...canvasStream.getTracks(),
      ...audioDestination.stream.getTracks(),
    ]);

    // Record the combined stream
    recorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm",
    });

    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm;codecs=vp8,opus" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.webm";
      a.click();
    };

    document
      .querySelector("#stopRecordingButton")
      .addEventListener("click", () => {
        recorder?.stop();
      });

    audio.onended = () => {
      console.log("stopped audio");
      recorder?.stop();
    };

    // Start recording
    recorder.start();
  });

  resizeCanvas();
  animate();
});
