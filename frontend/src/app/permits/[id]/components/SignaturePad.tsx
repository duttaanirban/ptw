"use client";

import { useEffect, useRef, useState } from "react";

type SignaturePadProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SignaturePad({
  value,
  onChange,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "#f8fafc";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
  }, []);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x:
        (event.clientX - rect.left) *
        (canvas.width / rect.width),
      y:
        (event.clientY - rect.top) *
        (canvas.height / rect.height),
    };
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getPoint(event);

    if (!canvas || !context || !point) {
      return;
    }

    drawingRef.current = true;
    setIsDrawing(true);

    canvas.setPointerCapture(event.pointerId);

    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getPoint(event);

    if (!canvas || !context || !point) {
      return;
    }

    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function finishDrawing(
    event?: React.PointerEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;

    if (!drawingRef.current || !canvas) {
      return;
    }

    drawingRef.current = false;
    setIsDrawing(false);

    if (
      event &&
      canvas.hasPointerCapture(event.pointerId)
    ) {
      canvas.releasePointerCapture(event.pointerId);
    }

    onChange(canvas.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.fillStyle = "#020617";
    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.strokeStyle = "#f8fafc";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";

    onChange("");
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-200">
            Digital signature
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Sign inside the box to authorize this permit approval.
          </p>
        </div>

        <button
          type="button"
          onClick={clearSignature}
          disabled={!value || isDrawing}
          className="min-h-10 shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={800}
          height={240}
          className="block h-36 w-full touch-none cursor-crosshair sm:h-40"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          onPointerLeave={() => {
            // Pointer capture keeps an in-progress signature drawing active.
          }}
        />
      </div>

      <div className="mt-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-600">
          Draw with mouse, stylus, or touch.
        </span>

        <span
          className={
            value
              ? "text-emerald-400"
              : "text-amber-400"
          }
        >
          {value
            ? "Signature captured"
            : "Signature required"}
        </span>
      </div>
    </div>
  );
}