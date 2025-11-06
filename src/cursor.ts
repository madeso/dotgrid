import { Point, SegmentType } from "./_types";
import { Client } from "./client";

function isEqual(a: Point | undefined, b: Point | undefined) {
  return a?.x === b?.x && a?.y === b?.y;
}
function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}
function step(v: number, s: number) {
  return Math.round(v / s) * s;
}

export interface Operation {
  cast?: SegmentType
}

export class Cursor {
  pos: Point;
  lastPos: Point;
  translation: null | {
    multi: boolean;
    copy: boolean;
    layer: boolean;
    from?: Point;
    to?: Point;
  };
  operation: null | Operation;
  client: Client;

  constructor(client: Client) {
    this.client = client;
    this.pos = { x: 0, y: 0 };
    this.lastPos = { x: 0, y: 0 };
    this.translation = null;
    this.operation = null;
  }

  translate(
    from: Point | null = null,
    to: Point | null = null,
    multi = false,
    copy = false,
    layer = false
  ) {
    if (from || to) {
      if (this.translation === null) {
        this.translation = { multi: multi, copy: copy, layer: layer };
      }

      if (from) {
        this.translation.from = from;
      }
      if (to) {
        this.translation.to = to;
      }
    }
    //else {
    if (!from && !to) {
      console.assert(!from && !to);
      this.translation = null;
    }
  }

  down(e: MouseEvent) {
    this.pos = this.atEvent(e);
    if (this.client.tool.vertexAt(this.pos)) {
      this.translate(
        this.pos,
        this.pos,
        e.shiftKey,
        e.ctrlKey || e.metaKey,
        e.altKey
      );
    }
    this.client.renderer.update();
    this.client.interface.update();
    e.preventDefault();
  }

  move(e: MouseEvent) {
    this.pos = this.atEvent(e);
    if (this.translation) {
      this.translate(null, this.pos);
    }
    if (this.lastPos.x !== this.pos.x || this.lastPos.y !== this.pos.y) {
      this.client.renderer.update();
    }
    this.client.interface.update();
    this.lastPos = this.pos;
    e.preventDefault();
  }

  up(e: MouseEvent) {
    this.pos = this.atEvent(e);
    if (
      this.translation &&
      !isEqual(this.translation.from, this.translation.to)
    ) {
      if(this.translation.from && this.translation.to) {
        if (this.translation.layer === true) {
          this.client.tool.translateLayer(
            this.translation.from,
            this.translation.to
          );
        } else if (this.translation.copy) {
          this.client.tool.translateCopy(
            this.translation.from,
            this.translation.to
          );
        } else if (this.translation.multi) {
          this.client.tool.translateMulti(
            this.translation.from,
            this.translation.to
          );
        } else {
          this.client.tool.translate(this.translation.from, this.translation.to);
        }
      }
    } else if ((e.target as any).id === "guide") {
      // clicked inside the grid and for example not on the toolbar...
      this.client.tool.addVertex({ x: this.pos.x, y: this.pos.y });
      this.client.picker.stop();
    }
    this.translate();
    this.client.interface.update();
    this.client.renderer.update();
    e.preventDefault();
  }

  alt(e: MouseEvent) {
    this.pos = this.atEvent(e);
    this.client.tool.removeSegmentsAt(this.pos);
    e.preventDefault();
    setTimeout(() => {
      this.client.tool.clear();
    }, 150);
  }

  atEvent(e: MouseEvent) {
    return this.snapPos(this.relativePos({ x: e.clientX, y: e.clientY }));
  }

  relativePos(pos: Point) {
    return {
      x: pos.x - this.client.renderer.el.offsetLeft,
      y: pos.y - this.client.renderer.el.offsetTop,
    };
  }

  snapPos(pos: Point) {
    return {
      x: clamp(step(pos.x, 15), 15, this.client.tool.settings.size.width - 15),
      y: clamp(step(pos.y, 15), 15, this.client.tool.settings.size.height - 15),
    };
  }
}
