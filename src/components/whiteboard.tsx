"use client";

import { LoaderCircle, PenLine, Trash2, Undo2 } from "lucide-react";
import { useState, type PointerEvent } from "react";

import type { WhiteboardAction } from "@/schemas/lesson.schema";

interface WhiteboardProps {
  actions: WhiteboardAction[];
  title: string;
  loading: boolean;
}

const chalkColors = ["#f5f3ed", "#a9b8ff", "#f4a8d7", "#70d6c1"];

function getPoint(event: PointerEvent<SVGSVGElement>) {
  const svg = event.currentTarget;
  const matrix = svg.getScreenCTM();
  if (matrix) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return {
      x: Math.max(0, Math.min(1000, transformed.x)),
      y: Math.max(0, Math.min(600, transformed.y)),
    };
  }

  const bounds = svg.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1000, ((event.clientX - bounds.left) / bounds.width) * 1000)),
    y: Math.max(0, Math.min(600, ((event.clientY - bounds.top) / bounds.height) * 600)),
  };
}

export default function Whiteboard({ actions, title, loading }: WhiteboardProps) {
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState(chalkColors[0]);
  const [strokes, setStrokes] = useState<{ path: string; color: string }[]>([]);
  const [activePath, setActivePath] = useState("");
  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number } | null>(null);

  function startStroke(event: PointerEvent<SVGSVGElement>) {
    if (!drawing) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    setCursorPoint(event.pointerType === "touch" ? null : point);
    setActivePath(`M ${point.x} ${point.y}`);
  }

  function continueStroke(event: PointerEvent<SVGSVGElement>) {
    const point = getPoint(event);
    setCursorPoint(event.pointerType === "touch" ? null : point);
    if (!drawing || !activePath) return;
    setActivePath((path) => `${path} L ${point.x} ${point.y}`);
  }

  function finishStroke() {
    if (activePath) setStrokes((current) => [...current, { path: activePath, color }]);
    setActivePath("");
  }

  return (
    <section className="board-card" aria-label="Interactive lesson whiteboard">
      <div className="board-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <div className="board-status-dot" />
          <div className="min-w-0">
            <p className="board-eyebrow">LESSON WHITEBOARD</p>
            <h2 className="truncate text-sm font-semibold text-white">
              {title || "Your canvas is ready"}
            </h2>
          </div>
        </div>
        <span className="board-page">Canvas 01</span>
      </div>

      <div className={`board-surface ${drawing ? "board-surface-drawing" : ""}`}>
        <div className="board-grid" aria-hidden="true" />
        <svg
          viewBox="0 0 1000 600"
          className={`board-svg ${drawing ? "board-svg-drawing" : ""}`}
          role="img"
          aria-label="Animated diagrams and notes for the current lesson"
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={finishStroke}
          onPointerCancel={() => setActivePath("")}
          onPointerLeave={() => setCursorPoint(null)}
        >
          <defs>
            <marker
              id="chalk-arrowhead"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path
                d="M 0 0 L 8 4 L 0 8"
                className="chalk-arrowhead"
                pathLength="1"
                fill="none"
                stroke="context-stroke"
                strokeWidth="1.5"
              />
            </marker>
          </defs>
          {actions.map((action, index) => {
            const accent = `chalk-accent-${index % 5}`;

            if (action.type === "text") {
              return (
                <text
                  key={action.id}
                  x={action.x}
                  y={action.y}
                  className={`chalk-text ${accent}`}
                  fontSize="25"
                >
                  {action.content}
                </text>
              );
            }

            if (action.type === "rectangle") {
              return (
                <g key={action.id} className={`chalk-shape ${accent}`}>
                  <rect
                    x={action.x}
                    y={action.y}
                    width={action.width}
                    height={action.height}
                    rx="14"
                    pathLength="1"
                  />
                  <text
                    x={action.x + action.width / 2}
                    y={action.y + action.height / 2 + 8}
                    textAnchor="middle"
                    className="chalk-label"
                  >
                    {action.label}
                  </text>
                </g>
              );
            }

            if (action.type === "circle") {
              return (
                <g key={action.id} className={`chalk-shape ${accent}`}>
                  <circle
                    cx={action.x}
                    cy={action.y}
                    r={action.radius}
                    pathLength="1"
                  />
                  <text
                    x={action.x}
                    y={action.y + 6}
                    textAnchor="middle"
                    className="chalk-label"
                  >
                    {action.label}
                  </text>
                </g>
              );
            }

            return (
              <line
                key={action.id}
                x1={action.from.x}
                y1={action.from.y}
                x2={action.to.x}
                y2={action.to.y}
                className={`chalk-arrow ${accent}`}
                pathLength="1"
                markerEnd="url(#chalk-arrowhead)"
              />
            );
          })}
          {strokes.map((stroke, index) => (
            <path
              key={`stroke-${index}`}
              d={stroke.path}
              fill="none"
              stroke={stroke.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {activePath && (
            <path
              d={activePath}
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {drawing && cursorPoint && (
            <g
              className="board-cursor"
              transform={`translate(${cursorPoint.x} ${cursorPoint.y})`}
              aria-hidden="true"
            >
              <circle className="board-cursor-halo" r="15" />
              <circle className="board-cursor-ring" r="8" />
              <circle className="board-cursor-tip" r="2.5" />
              <path className="board-cursor-crosshair" d="M -12 0 H -8 M 8 0 H 12 M 0 -12 V -8 M 0 8 V 12" />
            </g>
          )}
        </svg>

        {loading ? (
          <div className="board-loading" role="status" aria-live="polite">
            <div className="board-loading-icon"><LoaderCircle size={20} className="spin" /></div>
            <p>Getting the chalk ready</p>
            <div className="board-loading-skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : actions.length === 0 && (
          <div className="board-empty">
            <div className="board-empty-icon">
              <PenLine size={22} />
            </div>
            <p className="text-sm font-medium text-slate-200">
              Your ideas take shape here
            </p>
            <p className="mt-1 max-w-56 text-center text-xs leading-5 text-slate-400">
              Ask ChalkAI to teach you something and follow along as the board comes to life.
            </p>
          </div>
        )}

        <div className="board-tools" aria-label="Whiteboard drawing tools">
          <button
            type="button"
            className={`board-tool-button ${drawing ? "board-tool-active" : ""}`}
            onClick={() => {
              setDrawing((enabled) => !enabled);
              if (drawing) setCursorPoint(null);
            }}
            aria-label={drawing ? "Stop drawing" : "Draw on whiteboard"}
            aria-pressed={drawing}
            title={drawing ? "Stop drawing" : "Draw"}
          >
            <PenLine size={16} />
          </button>
          <div className="board-color-list" aria-label="Chalk color">
            {chalkColors.map((chalk) => (
              <button
                key={chalk}
                type="button"
                aria-label={`Use ${chalk} chalk`}
                aria-pressed={color === chalk}
                className={`board-color ${color === chalk ? "board-color-selected" : ""}`}
                style={{ backgroundColor: chalk }}
                onClick={() => setColor(chalk)}
              />
            ))}
          </div>
          <button
            type="button"
            className="board-tool-button"
            onClick={() => setStrokes((current) => current.slice(0, -1))}
            aria-label="Undo your last drawing"
            title="Undo last drawing"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="board-tool-button"
            onClick={() => {
              setStrokes([]);
              setActivePath("");
            }}
            aria-label="Clear all ink"
            title="Clear all ink"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="board-footer">
        <span>
          {loading
            ? "Preparing your visual lesson…"
            : drawing
              ? "Draw mode · move the cursor and drag to sketch"
              : "Your tutor’s drawings appear in sync with the lesson"}
        </span>
        <span>{actions.length} {actions.length === 1 ? "visual" : "visuals"}</span>
      </div>
    </section>
  );
}
