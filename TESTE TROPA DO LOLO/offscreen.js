// Documento invisível usado só para tocar áudio (o service worker não toca som).
chrome.runtime.onMessage.addListener(function (message) {
  if (!message || message.target !== "offscreen" || message.type !== "play") return;
  try {
    var audio = new Audio(message.url);
    audio.volume = Math.max(0, Math.min(1, message.volume));
    audio.play().catch(function (e) { console.error("[audio] erro ao tocar:", e); });
  } catch (e) {
    console.error("[audio] erro:", e);
  }
});
