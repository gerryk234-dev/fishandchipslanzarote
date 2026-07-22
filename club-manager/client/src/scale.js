import { useState, useRef, useCallback, useEffect } from "react";

/* OHAUS Navigator (NV622) via the OHAUS USB Interface kit.
   The kit presents a virtual serial port (9600 8N1). We poll with the
   OHAUS immediate-print command "IP" and also parse anything the scale
   streams on its own (continuous-print mode). Lines look like:
     "    12.34 g"      (stable)
     "    12.34 g ?"    (unstable)
   Requires Chrome/Edge on desktop (Web Serial API) over localhost or HTTPS. */

const LINE_RE = /([-+]?\d+(?:[.,]\d+)?)\s*(mg|g|kg|oz|ct|lb)\b/i;

export function useScale() {
  const supported = typeof navigator !== "undefined" && "serial" in navigator;
  const [connected, setConnected] = useState(false);
  const [reading, setReading] = useState(null); // { value, unit, stable, ts }
  const portRef = useRef(null);
  const writerRef = useRef(null);
  const readerRef = useRef(null);
  const pollRef = useRef(null);
  const closingRef = useRef(false);

  const disconnect = useCallback(async () => {
    closingRef.current = true;
    clearInterval(pollRef.current);
    try { await readerRef.current?.cancel(); } catch { /* already closed */ }
    try { writerRef.current?.releaseLock(); } catch { /* already released */ }
    try { await portRef.current?.close(); } catch { /* already closed */ }
    portRef.current = null; writerRef.current = null; readerRef.current = null;
    setConnected(false); setReading(null);
  }, []);

  useEffect(() => () => { disconnect(); }, [disconnect]);

  const send = useCallback(async (cmd) => {
    try { await writerRef.current?.write(new TextEncoder().encode(cmd + "\r\n")); } catch { /* ignore */ }
  }, []);

  const connect = useCallback(async () => {
    if (!supported || portRef.current) return;
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    portRef.current = port;
    closingRef.current = false;
    writerRef.current = port.writable.getWriter();
    setConnected(true);
    pollRef.current = setInterval(() => send("IP"), 500);

    (async () => {
      const decoder = new TextDecoder();
      let buf = "";
      try {
        while (port.readable && !closingRef.current) {
          const reader = port.readable.getReader();
          readerRef.current = reader;
          try {
            for (;;) {
              const { value, done } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              let i;
              while ((i = buf.search(/[\r\n]/)) >= 0) {
                const line = buf.slice(0, i).trim();
                buf = buf.slice(i + 1);
                if (!line) continue;
                const m = line.match(LINE_RE);
                if (m) {
                  setReading({
                    value: parseFloat(m[1].replace(",", ".")),
                    unit: m[2].toLowerCase(),
                    stable: !line.includes("?"),
                    ts: Date.now(),
                  });
                }
              }
            }
          } finally {
            try { reader.releaseLock(); } catch { /* ignore */ }
          }
        }
      } catch { /* device unplugged mid-read */ }
      if (!closingRef.current) disconnect();
    })();
  }, [supported, send, disconnect]);

  const tare = useCallback(() => send("T"), [send]);
  const zero = useCallback(() => send("Z"), [send]);

  return { supported, connected, reading, connect, disconnect, tare, zero };
}
