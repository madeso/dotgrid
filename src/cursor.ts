import type { Point, SegmentType, Size } from "./_types";
import { Client } from "./client";
import type { Picker } from "./picker";
import type { Renderer } from "./renderer";
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

interface PreventDefault {
  preventDefault: () => void;
}

interface ClientPosition {
  clientX: number;
  clientY: number;
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


const legacy_translate = (tool: Tool, from: Point, to: Point, meta: MetaKeys) => {
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

const legacy_add_vetex = (vertex: Point, tool: Tool, picker: Picker) => {
  tool.addVertex(vertex);
  picker.stop();
}
const legacy_remove_segment = (point: Point, tool: Tool) => {
  tool.removeSegmentsAt(point);
  setTimeout(() => {
    tool.clear();
  }, 150);
}

const legacy_vertex_at = (tool: Tool, p: Point) => {
  return tool.vertexAt(p);
}

const legacy_offset = (renderer: Renderer) => {
  return {
    left: renderer.el.offsetLeft,
    top: renderer.el.offsetTop
  };
}

const legacy_size = (tool: Tool) => {
  return {
    width: tool.tool.settings.size.width,
    height: tool.tool.settings.size.height
  };
}

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

export const cursor_down = (cursor: CursorI, vertex_at: (p: Point) => Point | null, e: MouseEvent, size: Size, offset: Offset, scale: number) => {
  cursor.pos = cursor_atEvent(e, size, offset, scale);
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

export const cursor_move = (cursor: CursorI, e: ClientPosition & PreventDefault, size: Size, offset: Offset, scale: number) => {
  cursor.pos = cursor_atEvent(e, size, offset, scale);
  if (cursor.translation) {
    cursor_translate(cursor, null, cursor.pos);
  }
  cursor.lastPos = cursor.pos;
  e.preventDefault();
}


export const cursor_up = (cursor: CursorI, e: MouseEvent, size: Size, offset: Offset, translation_callback: (from: Point, to: Point, meta: MetaKeys)=>void, add_vertex: (p: Point) => void, scale: number) => {
  cursor.pos = cursor_atEvent(e, size, offset, scale);
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



export const cursor_alt = (cursor: CursorI, e: MouseEvent, size: Size, offset: Offset, remove_segment: (p: Point) => void, scale: number) => {
  cursor.pos = cursor_atEvent(e, size, offset, scale);
  remove_segment(cursor.pos);
  e.preventDefault();
}

const cursor_atEvent = (e: ClientPosition, size: Size, offset: Offset, scale: number) => {
  return cursor_snapPos(size, cursor_relativePos(offset, scale, { x: e.clientX, y: e.clientY }));
}

export interface Offset {
  left: number;
  top: number;
}

const cursor_relativePos = (offset: Offset, scale: number, pos: Point) => {
  return {
    x: (pos.x - offset.left)/scale,
    y: (pos.y - offset.top)/scale,
  };
}

const cursor_snapPos = (size: Size, pos: Point) => {
  return {
    x: clamp(step(pos.x, 15), 15, size.width - 15),
    y: clamp(step(pos.y, 15), 15, size.height - 15),
  };
}

export class Cursor {
  cursor: CursorI;
  client: Client;

  constructor(client: Client) {
    this.client = client;
    this.cursor = cursor_init();
  }

  translate(
    from: Point | null = null,
    to: Point | null = null,
    multi = false,
    copy = false,
    layer = false
  ) {
    cursor_translate(this.cursor, from, to, multi, copy, layer);
  }

  down(e: MouseEvent) {
    cursor_down(this.cursor, vertex => {
        return legacy_vertex_at(this.client.tool, vertex)
    }, e, legacy_size(this.client.tool), legacy_offset(this.client.renderer), 1);
  }

  move(e: MouseEvent) {
    cursor_move(this.cursor, e, legacy_size(this.client.tool), legacy_offset(this.client.renderer), 1);
  }

  up(e: MouseEvent) {
    cursor_up(this.cursor, e, legacy_size(this.client.tool), legacy_offset(this.client.renderer), (from, to, meta) => {
      legacy_translate(this.client.tool, from, to, meta);
    }, point => {
      legacy_add_vetex(point, this.client.tool, this.client.picker);
    }, 1);
  }

  alt(e: MouseEvent) {
    cursor_alt(this.cursor, e, legacy_size(this.client.tool), legacy_offset(this.client.renderer), (p) => {
      legacy_remove_segment(p, this.client.tool);
    }, 1);
  }
}
