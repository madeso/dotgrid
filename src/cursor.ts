import type { Point, SegmentType, Size } from "./_types";

function is_equal(a: Point | undefined, b: Point | undefined) {
  return a?.x === b?.x && a?.y === b?.y;
}
function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}
function step(v: number, s: number) {
  return Math.round(v / s) * s;
}

export interface Operation {
  cast?: SegmentType;
}

export interface TranslateKeys {
  multi: boolean;
  copy: boolean;
  layer: boolean;
}

// MouseEvent that support both react and vanilla
interface GenericMouseEvent {
  clientX: number;
  clientY: number;

  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;

  preventDefault: () => void;
}

interface Cursor {
  pos: Point;
  lastPos: Point;
  translation:
    | null
    | (TranslateKeys & {
        from?: Point;
        to?: Point;
      });
  operation: null | Operation;
}

export const cursor_init = (): Cursor => {
  return {
    pos: { x: 0, y: 0 },
    lastPos: { x: 0, y: 0 },
    translation: null,
    operation: null,
  };
};

const handle_translate_action = (
  cursor: Cursor,
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

  if (!from && !to) {
    console.assert(!from && !to);
    cursor.translation = null;
  }
};

export const cursor_on_mouse_down = (
  cursor: Cursor,
  vertex_at: (p: Point) => Point | null,
  e: GenericMouseEvent,
  size: Size,
  offset: Offset,
  scale: number,
  grid_spacing: number,
) => {
  cursor.pos = cursor_position_from_event(e, size, offset, scale, grid_spacing);
  if (vertex_at(cursor.pos)) {
    handle_translate_action(
      cursor,
      cursor.pos,
      cursor.pos,
      e.shiftKey,
      e.ctrlKey || e.metaKey,
      e.altKey
    );
  }
  e.preventDefault();
};

export const cursor_on_cursor_move = (
  cursor: Cursor,
  e: GenericMouseEvent,
  size: Size,
  offset: Offset,
  scale: number,
  grid_spacing: number
) => {
  cursor.pos = cursor_position_from_event(e, size, offset, scale, grid_spacing);
  if (cursor.translation) {
    handle_translate_action(cursor, null, cursor.pos);
  }
  cursor.lastPos = cursor.pos;
  e.preventDefault();
};

export const cursor_on_mouse_up = (
  cursor: Cursor,
  e: GenericMouseEvent,
  size: Size,
  offset: Offset,
  translation_callback: (from: Point, to: Point, meta: TranslateKeys) => void,
  add_vertex: (p: Point) => void,
  scale: number,
  grid_spacing: number
) => {
  cursor.pos = cursor_position_from_event(e, size, offset, scale, grid_spacing);
  if (
    cursor.translation &&
    !is_equal(cursor.translation.from, cursor.translation.to)
  ) {
    if (cursor.translation.from && cursor.translation.to) {
      translation_callback(
        cursor.translation.from,
        cursor.translation.to,
        cursor.translation
      );
    }
  } else {
    // clicked inside the grid and for example not on the toolbar...
    // todo(Gustav): is this still valid...?
    add_vertex({ x: cursor.pos.x, y: cursor.pos.y });
  }
  handle_translate_action(cursor);
  e.preventDefault();
};

export const cursor_on_context_menu = (
  cursor: Cursor,
  e: GenericMouseEvent,
  size: Size,
  offset: Offset,
  remove_segment: (p: Point) => void,
  scale: number,
  grid_spacing: number
) => {
  cursor.pos = cursor_position_from_event(e, size, offset, scale, grid_spacing);
  remove_segment(cursor.pos);
  e.preventDefault();
};

const cursor_position_from_event = (
  e: GenericMouseEvent,
  size: Size,
  offset: Offset,
  scale: number,
  grid_spacing: number,
) => {
  return snap_position_to_grid(
    size,
    get_relative_position(offset, scale, { x: e.clientX, y: e.clientY }), grid_spacing
  );
};

export interface Offset {
  left: number;
  top: number;
}

const get_relative_position = (offset: Offset, scale: number, pos: Point) => {
  return {
    x: (pos.x - offset.left) / scale,
    y: (pos.y - offset.top) / scale,
  };
};

const snap_position_to_grid = (size: Size, pos: Point, grid_spacing: number) => {
  return {
    x: clamp(step(pos.x, grid_spacing), grid_spacing, size.width - grid_spacing),
    y: clamp(step(pos.y, grid_spacing), grid_spacing, size.height - grid_spacing),
  };
};
