import type { Point, SingleStyle } from "./_types";
import { Client } from "./client";
import { generate_wrap } from "./generator";

interface Size {
  width: number;
  height: number;
}

const printSize = (size: Size) => {
  return `${size.width}x${size.height}`;
};
const sizeOffset = (a: Size, b: Size): Size => {
  return { width: a.width - b.width, height: a.height - b.height };
};
const clamp = (v: number, min: number, max: number) => {
  return v < min ? min : v > max ? max : v;
};

export class Renderer {
  client: Client;
  el: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  showExtras: boolean;
  scale: number;

  constructor(client: Client) {
    this.client = client;
    this.el = document.createElement("canvas");
    this.el.id = "guide";
    this.el.width = 640;
    this.el.height = 640;
    this.el.style.width = "320px";
    this.el.style.height = "320px";
    this.context = this.el.getContext("2d");
    this.showExtras = true;

    this.scale = 2; // window.devicePixelRatio
  }

  start() {
    this.update();
  }

  update() {
    this.resize();
    this.client.manager.update();
    const render = new Image();
    render.onload = () => {
      this.draw(render);
    };
    render.src = this.client.manager.svg64();
  }

  draw(render: CanvasImageSource) {
    this.clear();
    this.drawMirror();
    this.drawGrid();
    this.drawRulers();
    this.drawRender(render);
    this.drawVertices();
    this.drawHandles();
    this.drawTranslation();
    this.drawCursor();
    this.drawPreview();
  }

  clear() {
    if (this.context === null) return;
    this.context.clearRect(
      0,
      0,
      this.el.width * this.scale,
      this.el.height * this.scale
    );
  }

  toggle() {
    this.showExtras = !this.showExtras;
    this.update();
    this.client.interface.update(true);
  }

  resize() {
    const _target = this.client.getPaddedSize();
    const _current = {
      width: this.el.width / this.scale,
      height: this.el.height / this.scale,
    };
    const offset = sizeOffset(_target, _current);
    if (offset.width === 0 && offset.height === 0) {
      return;
    }
    console.log(
      "Renderer",
      `Require resize: ${printSize(_target)}, from ${printSize(_current)}`
    );
    this.el.width = _target.width * this.scale;
    this.el.height = _target.height * this.scale;
    this.el.style.width = _target.width + "px";
    this.el.style.height = _target.height + "px";
  }

  // Collections

  drawMirror() {
    if (!this.showExtras) {
      return;
    }

    if (this.client.tool.style().mirror_style === 0) {
      return;
    }

    const middle = {
      x: this.client.tool.settings.size.width,
      y: this.client.tool.settings.size.height,
    };

    if (
      this.client.tool.style().mirror_style === 1 ||
      this.client.tool.style().mirror_style === 3
    ) {
      this.drawRule(
        { x: middle.x, y: 15 * this.scale },
        { x: middle.x, y: this.client.tool.settings.size.height * this.scale }
      );
    }
    if (
      this.client.tool.style().mirror_style === 2 ||
      this.client.tool.style().mirror_style === 3
    ) {
      this.drawRule(
        { x: 15 * this.scale, y: middle.y },
        { x: this.client.tool.settings.size.width * this.scale, y: middle.y }
      );
    }
  }

  drawHandles() {
    if (!this.showExtras) {
      return;
    }

    for (const segmentId in this.client.tool.layer()) {
      const segment = this.client.tool.layer()[segmentId];
      for (const vertexId in segment.vertices) {
        const vertex = segment.vertices[vertexId];
        this.drawHandle(vertex);
      }
    }
  }

  drawVertices() {
    for (const id in this.client.tool.vertices) {
      this.drawVertex(this.client.tool.vertices[id]);
    }
  }

  drawGrid() {
    if (this.context === null) return;
    if (!this.showExtras) {
      return;
    }

    const markers = {
      w: this.client.tool.settings.size.width / 15,
      h: this.client.tool.settings.size.height / 15,
    };

    this.context.beginPath();
    this.context.lineWidth = 2;
    this.context.fillStyle = this.client.theme.active.b_med;
    for (let x = markers.w - 1; x >= 0; x--) {
      for (let y = markers.h - 1; y >= 0; y--) {
        const isStep = x % 4 === 0 && y % 4 === 0;
        // Don't draw margins
        if (x === 0 || y === 0) {
          continue;
        }
        const pos = {
          x: x * 15,
          y: y * 15,
        };
        const radius = isStep ? 2.5 : 1.5;
        this.context.moveTo(pos.x * this.scale, pos.y * this.scale);
        this.context.arc(
          pos.x * this.scale,
          pos.y * this.scale,
          radius,
          0,
          2 * Math.PI,
          false
        );
      }
    }
    this.context.fill();
    this.context.closePath();
  }

  drawRulers() {
    if (!this.client.cursor.translation?.to) {
      return;
    }

    const pos = this.client.cursor.translation.to;
    const bottom = this.client.tool.settings.size.height * this.scale;
    const right = this.client.tool.settings.size.width * this.scale;

    this.drawRule(
      { x: pos.x * this.scale, y: 0 },
      { x: pos.x * this.scale, y: bottom }
    );
    this.drawRule(
      { x: 0, y: pos.y * this.scale },
      { x: right, y: pos.y * this.scale }
    );
  }

  drawPreview() {
    const operation =
      this.client.cursor.operation && this.client.cursor.operation.cast
        ? this.client.cursor.operation.cast
        : null;

    if (!this.client.tool.canCast(operation)) {
      return;
    }
    if (operation === "close") {
      return;
    }

    if(operation) {
      const style: SingleStyle = {
        color: this.client.theme.active.f_med,
        thickness: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeLineDash: [5, 15],
      } as SingleStyle;
      const path = generate_wrap(this.client, [
        { vertices: this.client.tool.vertices, type: operation },
      ], style, { x: 0, y: 0 }, 2);
      this.drawPath(path, style);
    }
  }

  // Elements

  drawVertex(pos: Point, radius = 5) {
    if (this.context === null) return;
    this.context.beginPath();
    this.context.lineWidth = 2;
    this.context.arc(
      pos.x * this.scale,
      pos.y * this.scale,
      radius,
      0,
      2 * Math.PI,
      false
    );
    this.context.fillStyle = this.client.theme.active.f_low;
    this.context.fill();
    this.context.closePath();
  }

  drawRule(from: Point, to: Point) {
    if (this.context === null) return;
    this.context.beginPath();
    this.context.moveTo(from.x, from.y);
    this.context.lineTo(to.x, to.y);
    this.context.lineCap = "round";
    this.context.lineWidth = 3;
    this.context.strokeStyle = this.client.theme.active.b_low;
    this.context.stroke();
    this.context.closePath();
  }

  drawHandle(pos: Point, radius = 6) {
    if (this.context === null) return;
    this.context.beginPath();
    this.context.arc(
      Math.abs(pos.x * -this.scale),
      Math.abs(pos.y * this.scale),
      radius + 3,
      0,
      2 * Math.PI,
      false
    );
    this.context.fillStyle = this.client.theme.active.f_high;
    this.context.fill();
    this.context.closePath();
    this.context.beginPath();
    this.context.arc(
      pos.x * this.scale,
      pos.y * this.scale,
      radius - 3,
      0,
      2 * Math.PI,
      false
    );
    this.context.fillStyle = this.client.theme.active.b_low;
    this.context.fill();
    this.context.closePath();
  }

  drawPath(path: Path2D | string, style: SingleStyle) {
    if (this.context === null) return;
    const p = new Path2D(path);

    this.context.strokeStyle = style.color;
    this.context.lineWidth = style.thickness * this.scale;
    this.context.lineCap = style.strokeLinecap;
    this.context.lineJoin = style.strokeLinejoin;

    if (style.fill && style.fill !== "none") {
      this.context.fillStyle = style.color;
      this.context.fill(p);
    }

    // Dash
    this.context.save();
    if (style.strokeLineDash) {
      this.context.setLineDash(style.strokeLineDash);
    } else {
      this.context.setLineDash([]);
    }
    this.context.stroke(p);
    this.context.restore();
  }

  drawTranslation() {
    if (this.context === null) return;
    if (!this.client.cursor.translation?.to) {
      return;
    }
    if (!this.client.cursor.translation?.from) {
      return;
    }

    this.context.save();

    this.context.beginPath();
    this.context.moveTo(
      this.client.cursor.translation.from.x * this.scale,
      this.client.cursor.translation.from.y * this.scale
    );
    this.context.lineTo(
      this.client.cursor.translation.to.x * this.scale,
      this.client.cursor.translation.to.y * this.scale
    );
    this.context.lineCap = "round";
    this.context.lineWidth = 5;
    this.context.strokeStyle =
      this.client.cursor.translation.multi === true
        ? this.client.theme.active.b_inv
        : this.client.cursor.translation.copy === true
        ? this.client.theme.active.f_med
        : this.client.theme.active.f_low;
    this.context.setLineDash([5, 10]);
    this.context.stroke();
    this.context.closePath();

    this.context.setLineDash([]);
    this.context.restore();
  }

  drawCursor(
    pos = this.client.cursor.pos,
    radius = this.client.tool.style().thickness - 1
  ) {
    if (this.context === null) return;
    this.context.save();

    this.context.beginPath();
    this.context.lineWidth = 3;
    this.context.lineCap = "round";
    this.context.arc(
      Math.abs(pos.x * -this.scale),
      Math.abs(pos.y * this.scale),
      5,
      0,
      2 * Math.PI,
      false
    );
    this.context.strokeStyle = this.client.theme.active.background;
    this.context.stroke();
    this.context.closePath();

    this.context.beginPath();
    this.context.lineWidth = 3;
    this.context.lineCap = "round";
    this.context.arc(
      Math.abs(pos.x * -this.scale),
      Math.abs(pos.y * this.scale),
      clamp(radius, 5, 100),
      0,
      2 * Math.PI,
      false
    );
    this.context.strokeStyle = this.client.theme.active.f_med;
    this.context.stroke();
    this.context.closePath();

    this.context.restore();
  }

  drawRender(render: CanvasImageSource) {
    if (this.context === null) return;
    this.context.drawImage(render, 0, 0, this.el.width, this.el.height);
  }
}
