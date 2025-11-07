import type { Point, SegmentType, Size } from "./_types";
import { Client } from "./client";
import type { Picker } from "./picker";
import type { Tool } from "./tool";

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

export interface MetaKeys {
  multi: boolean;
  copy: boolean;
  layer: boolean;
}

interface CursorI {
  pos: Point;
  lastPos: Point;
  translation: null | MetaKeys & {
    from?: Point;
    to?: Point;
  };
  operation: null | Operation;
};

export const cursor_init = ():CursorI => {
  return {
    pos: { x: 0, y: 0 },
    lastPos: { x: 0, y: 0 },
    translation: null,
    operation: null,
  }
};

export const cursor_translate = (
  cursor: CursorI,
  from: Point | null = null,
  to: Point | null = null,
  multi = false,
  copy = false,
  layer = false
) => {
  if (from || to) {
    if (cursor.translation === null) {
      cursor.translation = { multi: multi, copy: copy, layer: layer };
    }

    if (from) {
      cursor.translation.from = from;
    }
    if (to) {
      cursor.translation.to = to;
    }
  }
  //else {
  if (!from && !to) {
    console.assert(!from && !to);
    cursor.translation = null;
  }
}

export type VertexAtCallback = (p: Point) => Point | null;

export const cursor_down = (cursor: CursorI, vertex_at: VertexAtCallback, e: MouseEvent, size: Size, offset: Offset) => {
  cursor.pos = cursor_atEvent(e, size, offset);
  if (vertex_at(cursor.pos)) {
    cursor_translate(
      cursor,
      cursor.pos,
      cursor.pos,
      e.shiftKey,
      e.ctrlKey || e.metaKey,
      e.altKey
    );
  }
  e.preventDefault();
}

export const cursor_move = (cursor: CursorI, e: MouseEvent, size: Size, offset: Offset) => {
  cursor.pos = cursor_atEvent(e, size, offset);
  if (cursor.translation) {
    cursor_translate(cursor, null, cursor.pos);
  }
  cursor.lastPos = cursor.pos;
  e.preventDefault();
}

export const translate_legacy = (tool: Tool, from: Point, to: Point, meta: MetaKeys) => {
  if (meta.layer === true) {
    tool.translateLayer( from, to );
  } else if (meta.copy) {
    tool.translateCopy( from, to );
  } else if (meta.multi) {
    tool.translateMulti( from, to );
  } else {
    tool.translate(from, to);
  }
}

export const add_vetex_legacy = (vertex: Point, tool: Tool, picker: Picker) => {
  tool.addVertex(vertex);
  picker.stop();
}

export const cursor_up = (cursor: CursorI, e: MouseEvent, size: Size, offset: Offset, translation_callback: (from: Point, to: Point, meta: MetaKeys)=>void, add_vertex: (p: Point) => void) => {
  cursor.pos = cursor_atEvent(e, size, offset);
  if (
    cursor.translation &&
    !isEqual(cursor.translation.from, cursor.translation.to)
  ) {
    if(cursor.translation.from && cursor.translation.to) {
      translation_callback(cursor.translation.from, cursor.translation.to, cursor.translation);
    }
  } else {
    // clicked inside the grid and for example not on the toolbar...
    // todo(Gustav): is this still valid...?
    add_vertex({ x: cursor.pos.x, y: cursor.pos.y });
  }
  cursor_translate(cursor);
  e.preventDefault();
}

export const remove_segment_legacy = (point: Point, tool: Tool) => {
  tool.removeSegmentsAt(point);
  setTimeout(() => {
    tool.clear();
  }, 150);
} 

export const cursor_alt = (cursor: CursorI, e: MouseEvent, size: Size, offset: Offset, remove_segment: (p: Point) => void) => {
  cursor.pos = cursor_atEvent(e, size, offset);
  remove_segment(cursor.pos);
  e.preventDefault();
}

export const cursor_atEvent = (e: MouseEvent, size: Size, offset: Offset) => {
  return cursor_snapPos(size, cursor_relativePos(offset, { x: e.clientX, y: e.clientY }));
}

export interface Offset {
  left: number;
  top: number;
}

export const cursor_relativePos = (offset: Offset, pos: Point) => {
  return {
    x: pos.x - offset.left,
    y: pos.y - offset.top,
  };
}

export const cursor_snapPos = (size: Size, pos: Point) => {
  return {
    x: clamp(step(pos.x, 15), 15, size.width - 15),
    y: clamp(step(pos.y, 15), 15, size.height - 15),
  };
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
