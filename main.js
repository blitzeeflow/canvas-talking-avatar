document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");
  const canvasStream = canvas.captureStream(30); // 30 FPS
  const audio = document.getElementById("speechAudio");
  const audioInput = document.getElementById("audioInput");
  const imageInput = document.getElementById("imageInput");
  // const ffmpeg = new FFmpegWASM.FFmpeg();
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
  let mouthUpdateCounter = 0;
  let mouthUpdateFrequency = 7; // Higher value = slower mouth movement
  let background = new Image();
  let isPaused = false;
  background.src = "images.bg.png"; // Replace with your background image path

  background.onload = () => {
    drawBackground();
  };

  function resizeCanvas() {
    const maxYouTubeWidth = 1920;
    const maxYouTubeHeight = 1080;
    const maxTikTokWidth = 1080;
    const maxTikTokHeight = 1920;

    const aspectRatio =
      videoType === "youtube" ? youtubeAspectRatio : tiktokAspectRatio;

    let maxWidth = videoType === "youtube" ? maxYouTubeWidth : maxTikTokWidth;
    let maxHeight =
      videoType === "youtube" ? maxYouTubeHeight : maxTikTokHeight;

    const windowWidth = Math.min(canvas.parentElement.clientWidth, maxWidth);
    const windowHeight = Math.min(canvas.parentElement.clientHeight, maxHeight);

    let canvasWidth, canvasHeight;

    if (windowHeight < windowWidth / aspectRatio) {
      canvasHeight = windowHeight;
      canvasWidth = canvasHeight * aspectRatio;
    } else {
      canvasWidth = windowWidth;
      canvasHeight = canvasWidth / aspectRatio;
    }

    canvas.width = Math.min(canvasWidth, maxWidth);
    canvas.height = Math.min(canvasHeight, maxHeight);

    drawImageScaled(images[currentImageIndex]);
  }

  async function drawImageScaled(img) {
    // img = await cropWhitespaceFromImage(img);
    const hRatio = canvas.width / img.width;
    const vRatio = canvas.height / img.height;
    const ratio = Math.min(hRatio, vRatio);

    const centerShift_x = (canvas.width - img.width * ratio) / 2;
    const centerShift_y = (canvas.height - img.height * ratio) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const canvasAspectRatio = canvas.width / canvas.height;
    drawBackground();
    console.log();
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

  background.src = "images/bg.png"; // Set path to background image

  background.onload = () => {
    // ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  };

  let imageSources = [
    "images/avatar-1/mouth-open-eyes-open.png",
    "images/avatar-1/mouth-slightly-open-eyes-open.png",
    "images/avatar-1/mouth-closed-eyes-open.png",
    "images/avatar-1/mouth-open-eyes-closed.png",
    "images/avatar-1/mouth-slightly-open-eyes-closed.png",
    "images/avatar-1/mouth-closed-eyes-closed.png",
  ];

  async function loadImages(imageSources) {
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    const imagePromises = imageSources.map((src) => loadImage(src));
    return Promise.all(imagePromises);
  }

  let images;

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

  function cropWhitespaceFromImage(image) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const index = (y * canvas.width + x) * 4;
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          const alpha = imageData.data[index + 3];

          if (alpha !== 0 && (r < 250 || g < 250 || b < 250)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const width = maxX - minX + 1;
      const height = maxY - minY + 1;

      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = width;
      croppedCanvas.height = height;
      const croppedCtx = croppedCanvas.getContext("2d");
      croppedCtx.putImageData(
        ctx.getImageData(minX, minY, width, height),
        0,
        0
      );

      const croppedImage = new Image();
      croppedImage.onload = () => resolve(croppedImage);
      croppedImage.onerror = reject;
      croppedImage.src = croppedCanvas.toDataURL();
    });
  }

  let timeSinceLastBlink = 0;
  let timeToNextBlink = 4000; // Initial time until the next blink (4 seconds)
  const blinkDuration = 200; // Duration of a blink in milliseconds

  function animate(timestamp) {
    if (isPaused) return;
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

  // images.forEach((img, index) => {
  //   img.onload = () => {
  //     if (index === 2) {
  //       ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  //     }
  //   };
  // });

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
    if (!audioContext) {
      setupAudioContext();
    }
    const combinedStream = new MediaStream([
      ...canvasStream.getTracks(),
      ...audioDestination.stream.getTracks(),
    ]);

    // Record the combined stream
    recorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm",
      videoBitsPerSecond: 2500000, // Adjust the bitrate as needed for quality
    });

    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = async () => {
      audio.pause();
      audio.currentTime = 0;
      document.querySelector(".record-icon").classList.remove("show");
      const blob = new Blob(chunks, { type: "video/webm;codecs=vp8,opus" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.webm";
      a.click();

      // const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd";
      // await ffmpeg.load({
      //   coreURL: await FFmpegUtil.toBlobURL(
      //     `${baseURL}/ffmpeg-core.js`,
      //     "text/javascript"
      //   ),
      //   wasmURL: await FFmpegUtil.toBlobURL(
      //     `${baseURL}/ffmpeg-core.wasm`,
      //     "application/wasm"
      //   ),
      // });
      // ffmpeg.on("log", ({ message }) => {
      //   console.log(message);
      // });
      // await ffmpeg.writeFile("input.webm", await FFmpegUtil.fetchFile(url));
      // await ffmpeg.exec([
      //   "-i",
      //   "input.webm",
      //   "-async",
      //   "1",
      //   "-vf",
      //   "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      //   "output.mp4",
      // ]);
      // const ffdata = await ffmpeg.readFile(`output.mp4`);
      // const ffurl = URL.createObjectURL(
      //   new Blob([ffdata.buffer], { type: "video/mp4" })
      // );
      // // Create a download link
      // const a = document.createElement("a");
      // a.href = ffurl;
      // a.download = `output.mp4`;
      // document.body.appendChild(a);
      // a.click();

      // Cleanup
      // window.URL.revokeObjectURL(ffurl);
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
    document.querySelector(".record-icon").classList.add("show");
    setTimeout(() => {
      audio.play();
    }, 2000);
  });

  console.log("here");
  document.querySelector("#lipSpeed").addEventListener("input", (event) => {
    mouthUpdateFrequency = event.target.value / 10;
  });
  document
    .querySelector("#avatar-selector")
    .addEventListener("change", (event) => {
      isPaused = true;
      const name = event.target.value;
      imageSources = [
        `images/${name}/mouth-open-eyes-open.png`,
        `images/${name}/mouth-slightly-open-eyes-open.png`,
        `images/${name}/mouth-closed-eyes-open.png`,
        `images/${name}/mouth-open-eyes-closed.png`,
        `images/${name}/mouth-slightly-open-eyes-closed.png`,
        `images/${name}/mouth-closed-eyes-closed.png`,
      ];
      loadImages(imageSources).then(async (_images) => {
        console.log(_images);
        images = await Promise.all(
          _images.map(async (img) => await cropWhitespaceFromImage(img))
        );
        isPaused = false;
        animate();
      });
    });

  loadImages(imageSources).then((_images) => {
    console.log(_images);
    images = _images;
    resizeCanvas();
    animate();
    // 'images' is an array of loaded Image objects
    // You can use these images here
  });
});
