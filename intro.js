const state = {
  volume: "off",
};
function start() {
  document
    .querySelector("#volumeButton")
    .addEventListener("click", onVolumeClicked);
}
function onVolumeClicked() {
  const volumeIconLabel = `volume_${state.volume === "off" ? "up" : "off"}`;
  state.volume = state.volume === "off" ? "on" : "off";
  document.querySelector("#volumeIcon").textContent = volumeIconLabel;
  document.querySelector("video").muted = state.volume === "off" ? true : false;
}
document.addEventListener("DOMContentLoaded", start);
