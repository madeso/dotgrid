import type { Point, SegmentType, Size } from "./_types";

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

export interface TranslateKeys {
  multi: boolean;
  copy: boolean;
  layer: boolean;
}

// MouseEvent that support both react and vanilla
interface MouseState {
  clientX: number;
  clientY: number;

  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;

  preventDefault: () => void;
}

interface CursorI {
  pos: Point;
  lastPos: Point;
  translation: null | TranslateKeys & {
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


export const cursor_down = (cursor: CursorI, vertex_at: (p: Point) => Point | null, e: MouseState, size: Size, offset: Offset, scale: number) => {
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

export const cursor_move = (cursor: CursorI, e: MouseState, size: Size, offset: Offset, scale: number) => {
  cursor.pos = cursor_atEvent(e, size, offset, scale);
  if (cursor.translation) {
    cursor_translate(cursor, null, cursor.pos);
  }
  cursor.lastPos = cursor.pos;
  e.preventDefault();
}


export const cursor_up = (cursor: CursorI, e: MouseState, size: Size, offset: Offset, translation_callback: (from: Point, to: Point, meta: TranslateKeys)=>void, add_vertex: (p: Point) => void, scale: number) => {
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



export const cursor_alt = (cursor: CursorI, e: MouseState, size: Size, offset: Offset, remove_segment: (p: Point) => void, scale: number) => {
  cursor.pos = cursor_atEvent(e, size, offset, scale);
  remove_segment(cursor.pos);
  e.preventDefault();
}

const cursor_atEvent = (e: MouseState, size: Size, offset: Offset, scale: number) => {
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
