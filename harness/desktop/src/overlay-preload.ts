// The preload of the two overlay windows (resources/glow.html, resources/capsule.html):
// state in from the shell, the capsule's answers and its height out, and — on Linux — the
// glow's word that the pointer reached it, which a click-through window never sees (glow.ts).
import { contextBridge, ipcRenderer } from "electron";

type Listener = (state: unknown) => void;

function onState(listener: Listener): () => void {
  const handler = (_e: Electron.IpcRendererEvent, state: unknown) => listener(state);
  ipcRenderer.on("wevvy:overlay:state", handler);
  ipcRenderer.send("wevvy:overlay:ready");
  return () => ipcRenderer.off("wevvy:overlay:state", handler);
}

contextBridge.exposeInMainWorld("wevvyGlow", {
  onState,
  platform: process.platform,
  leak: (x: number, y: number, type: string) => ipcRenderer.send("wevvy:overlay:leak", { x, y, type }),
});
contextBridge.exposeInMainWorld("wevvyCapsule", {
  onState,
  act: (card: string, action: string) => ipcRenderer.send("wevvy:overlay:act", { card, action }),
  resize: (height: number) => ipcRenderer.send("wevvy:overlay:resize", height),
});
