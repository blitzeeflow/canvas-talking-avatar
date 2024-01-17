const loadingModal = new bootstrap.Modal("#loadingModal", {});
loadingModal.show();
// Reference the elements that we will need
const progressBar = document.querySelector(".progress-bar");
const speakerSelect = document.querySelector("#speaker");
const textElement = document.querySelector("#text-element");
const audio = document.querySelector("#audio");
const generateButton = document.querySelector("#generate-button");
const generating = document.querySelector("#generating");
const modelLoadingStats = {};
let currentVoice = "cmu_us_slt_arctic-wav-arctic_a0001";
// Create a new object detection pipeline

const worker = new Worker(new URL("./worker.js", import.meta.url), {
  type: "module",
});
const disableButton = (value) => {
  generateButton.disabled = value;
};
const showGeneratingLoading = (value) => {
  !value
    ? generating.classList.add("hide")
    : generating.classList.remove("hide");
};
const setProgress = (file, value) => {
  modelLoadingStats[file] = value;
  const values = Object.values(modelLoadingStats);
  const progressOverall = values.reduce((a, b) => a + b);
  const max = values.length * 100;
  progressBar.style.width = `${(progressOverall / max) * 100}%`;
};

generateButton.addEventListener("click", () => {
  disableButton(true);
  showGeneratingLoading(true);
  worker.postMessage({
    text: textElement.value,
    speaker_id: currentVoice,
  });
});

speakerSelect.addEventListener("change", (e) => {
  currentVoice = e.target.value;
});
worker.addEventListener("message", (e) => {
  switch (e.data.status) {
    case "initiate":
      modelLoadingStats[e.data.file] = 0;
      // Model file start load: add a new progress item to the list.
      break;

    case "progress":
      setProgress(e.data.file, e.data.progress);
      // Model file progress: update one of the progress items.
      // setProgressItems((prev) =>
      //   prev.map((item) => {
      //     if (item.file === e.data.file) {
      //       return { ...item, progress: e.data.progress };
      //     }
      //     return item;
      //   })
      // );
      break;

    case "done":
      // Model file loaded: remove the progress item from the list.
      // setProgressItems(
      //   prev => prev.filter(item => item.file !== e.data.file)
      // );
      break;

    case "ready":
      // Pipeline ready: the worker is ready to accept messages.
      // setReady(true);
      loadingModal.hide();
      break;

    case "complete":
      // Generation complete: re-enable the "Translate" button
      showGeneratingLoading(false);
      disableButton(false);
      const blobUrl = URL.createObjectURL(e.data.output);
      audio.innerHTML = `  <source src="${blobUrl}" type="audio/wav" />`;

      break;
  }
});
worker.postMessage({});
// const detector = await pipeline("object-detection", "Xenova/detr-resnet-50");
