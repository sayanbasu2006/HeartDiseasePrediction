"use client";

import { HeartPulse, Pause, Play } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { mountHeart } from "./heart-scene";

function HeartIllustration() {
  return (
    <svg className="heart-fallback" viewBox="0 0 240 260" aria-hidden="true">
      <defs>
        <radialGradient id="heart-tissue" cx=".32" cy=".28" r=".85">
          <stop stopColor="#dc8e9d" />
          <stop offset=".56" stopColor="#a44763" />
          <stop offset="1" stopColor="#54263f" />
        </radialGradient>
        <linearGradient id="heart-vessel" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#c1a3ce" />
          <stop offset="1" stopColor="#72577f" />
        </linearGradient>
      </defs>
      <path
        d="M112 93C105 63 108 43 129 37C151 30 170 45 170 67"
        fill="none"
        stroke="#b76480"
        strokeWidth="25"
        strokeLinecap="round"
      />
      <path
        d="M119 40L117 22M136 36L139 18M151 40L159 23"
        fill="none"
        stroke="#ba6880"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M81 99C73 80 70 60 76 46"
        fill="none"
        stroke="#85719e"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M69 87C90 68 109 80 124 83C145 87 174 99 187 127C201 159 179 204 154 232C144 243 134 244 124 231C108 210 76 195 61 167C45 138 44 108 69 87Z"
        fill="url(#heart-tissue)"
      />
      <path
        d="M114 94C111 76 100 67 76 68"
        fill="none"
        stroke="url(#heart-vessel)"
        strokeWidth="20"
        strokeLinecap="round"
      />
      <path
        d="M110 104C116 124 129 138 130 157S131 194 147 218M126 143C107 142 87 151 78 165M131 164C146 155 162 153 175 160"
        fill="none"
        stroke="#f0a59f"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".8"
      />
    </svg>
  );
}

export function BeatingHeart() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof mountHeart>>(null);
  const drag = useRef<{ pointer: number; x: number } | null>(null);
  const rotationHelp = useId();
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const syncMotion = () => setPlaying(!motionPreference.matches);
    syncMotion();
    motionPreference.addEventListener("change", syncMotion);

    let active = true;
    import("./heart-scene")
      .then(({ mountHeart }) => {
        if (active && host.current)
          scene.current = mountHeart(host.current, setAvailable);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });

    return () => {
      active = false;
      motionPreference.removeEventListener("change", syncMotion);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.setPlaying(playing);
  }, [available, playing]);

  function startRotation(event: PointerEvent<HTMLDivElement>) {
    if (!available || !event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, x: event.clientX };
  }

  function rotatePointer(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointer !== event.pointerId) return;
    const width = event.currentTarget.clientWidth;
    if (width) {
      scene.current?.rotate(
        ((event.clientX - drag.current.x) / width) * 2 * Math.PI,
      );
    }
    drag.current.x = event.clientX;
  }

  function rotateKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (!available || (event.key !== "ArrowLeft" && event.key !== "ArrowRight"))
      return;
    event.preventDefault();
    scene.current?.rotate(
      event.key === "ArrowLeft" ? -Math.PI / 12 : Math.PI / 12,
    );
  }

  return (
    <figure className="heart-panel">
      <div className="heart-panel-heading">
        <span>
          <HeartPulse size={17} /> Heart in motion
        </span>
        <span>Fig. 01</span>
      </div>
      <div
        className="heart-stage"
        data-interactive={available}
        role={available ? "region" : "img"}
        tabIndex={available ? 0 : undefined}
        aria-describedby={available ? rotationHelp : undefined}
        onPointerDown={startRotation}
        onPointerMove={rotatePointer}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onKeyDown={rotateKeyboard}
        aria-label={
          available
            ? "Three-dimensional illustration of a human heart"
            : "Static illustration of a human heart"
        }
      >
        {!available && <HeartIllustration />}
        <div className="heart-canvas" ref={host} data-ready={available} />
      </div>
      <figcaption>
        <span>
          {available ? "Drag or swipe to rotate" : "Heart illustration"}
        </span>
        {available && (
          <span id={rotationHelp} className="sr-only">
            Use the left and right arrow keys to rotate the heart.
          </span>
        )}
        {available && (
          <button
            type="button"
            className="heart-toggle"
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? (
              <Pause size={15} aria-hidden="true" />
            ) : (
              <Play size={15} aria-hidden="true" />
            )}
            {playing ? "Pause" : "Play"}
          </button>
        )}
      </figcaption>
    </figure>
  );
}
