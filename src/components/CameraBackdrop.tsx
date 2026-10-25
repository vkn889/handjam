"use client";

import { useEffect, useRef } from "react";
import { cameraStream } from "@/lib/engine";

/** The live mirrored camera, plus a "camera on" light whenever it's in use. */
export function CameraBackdrop({ dim = 0, live }: { dim?: number; live: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  // The camera may still be starting when this mounts, so keep checking until the stream exists.
  useEffect(() => {
    const attach = () => {
      const v = ref.current;
      const stream = cameraStream();
      if (!v || !stream) return false;
      if (v.srcObject !== stream) {
        v.srcObject = stream;
        void v.play().catch(() => {});
      }
      return true;
    };
    if (attach()) return;
    const id = window.setInterval(() => attach() && window.clearInterval(id), 250);
    return () => window.clearInterval(id);
  }, []);
  return (
    <>
      <video ref={ref} muted playsInline className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
      {dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />}
      {live && (
        <div className="absolute left-5 top-5 z-40 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium backdrop-blur">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Camera on
        </div>
      )}
    </>
  );
}
