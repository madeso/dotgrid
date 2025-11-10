import { createRef, useState } from 'react'
import viteLogo from '/logo.svg'
import './App.css'

import { Canvas } from './Canvas';
import type { Colors } from './theme';
// import { tool_constructor } from './tool';
import { cursor_down, cursor_init, cursor_move, cursor_up, type Offset } from './cursor';
import type { Point, Size } from './_types';
import { SvgButton } from './SvgButton';
import { cast_arc_c, cast_arc_r, cast_bezier, cast_close, cast_line, misc_color, source_export, source_grid_no_extra, source_grid_with_extra, source_open, source_render, source_save, toggle_fill, toggle_linecap, toggle_linejoin, toggle_mirror, toggle_thickness } from './icons';

const offset_from_canvas = (canvas: SVGSVGElement | null): Offset => {
  if (!canvas) {
    return { left: 0, top: 0 };
  }

  const rect = canvas.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top
  };
}

const App = () => {

  const canvasElement = createRef<SVGSVGElement>();

  const theme: Colors = {
    background: "#eeeeee",
    f_high: "#0a0a0a",
    f_med: "#4a4a4a",
    f_low: "#6a6a6a",
    f_inv: "#111111",
    b_high: "#a1a1a1",
    b_med: "#c1c1c1",
    b_low: "#ffffff",
    b_inv: "#ffb545",
  };

  // const [tool, setTool] = useState(() => tool_constructor());
  const [cursor, setCursor] = useState(() => cursor_init());

  const [vertices, setVertices] = useState<Point[]>([]);

  const scale = 2;

  const size: Size = { width: 800, height: 800 };

  const events: React.SVGProps<SVGSVGElement> = {
    onMouseMove: (ev) => {
      const offset = offset_from_canvas(canvasElement.current);
      setCursor( (c) => {
        c = structuredClone(cursor);
        cursor_move(c, ev, size, offset, scale);
        return c;
      });
    },
    onMouseDown: (ev) => {
      const offset = offset_from_canvas(canvasElement.current);
      setCursor((c) => {
        const vertex_at = () => null;
        c = structuredClone(cursor);
        cursor_down(c, vertex_at, ev, size, offset, scale)
        return c;
      });
    },
    onMouseUp: (ev) => {
      const offset = offset_from_canvas(canvasElement.current);
      setCursor((c) => {
        const translation = () => {};
        const add_vertex = (p: Point) => {
          setVertices((v) => {
            return [...v, p];
          })
        };

        c = structuredClone(c);
        cursor_up(c, ev, size, offset, translation, add_vertex, scale);
        return c;
      });
    }
  };

  return (
    <>
      <div>
        <img src={viteLogo} className="logo" alt="dotgrid logo" />
      </div>
      <h1>dotgrid test</h1>

      <Canvas
        ref={canvasElement}
        can_cast={false}
        copy={false}
        cursor_pos={cursor.pos}
        cursor_radius={5}
        mirror='zero'
        multi={false}
        scale={scale}
        size={size}
        showExtras={true}
        operation={'bezier'}
        translation_from={null}
        translation_to={null}
        vertex_radius={4}
        layer={[]}
        tool_vertices={vertices}
        theme={theme}
        props={events}
      />
      <div id='toolbar'>
        <SvgButton icon={cast_line} name='cast_line' onClick={() => {}} />
        <SvgButton icon={cast_arc_c} name='cast_arc_c' onClick={() => {}} />
        <SvgButton icon={cast_arc_r} name='cast_arc_r' onClick={() => {}} />
        <SvgButton icon={cast_bezier} name='cast_bezier' onClick={() => {}} />
        <SvgButton icon={cast_close} name='cast_close' onClick={() => {}} />
        <SvgButton icon={toggle_linecap} name='toggle_linecap' onClick={() => {}} />
        <SvgButton icon={toggle_linejoin} name='toggle_linejoin' onClick={() => {}} />
        <SvgButton icon={toggle_thickness} name='toggle_thickness' onClick={() => {}} />
        <SvgButton icon={toggle_mirror.zero} name='toggle_mirror' onClick={() => {}} />
        <SvgButton icon={toggle_mirror.one} name='toggle_mirror' onClick={() => {}} />
        <SvgButton icon={toggle_mirror.two} name='toggle_mirror' onClick={() => {}} />
        <SvgButton icon={toggle_mirror.three} name='toggle_mirror' onClick={() => {}} />
        <SvgButton icon={toggle_mirror.four} name='toggle_mirror' onClick={() => {}} />
        <SvgButton icon={toggle_fill} name='toggle_fill' onClick={() => {}} />
        <SvgButton icon={misc_color} name='misc_color' onClick={() => {}} />
        <SvgButton icon={source_open} name='source_open' onClick={() => {}} />
        <SvgButton icon={source_render} name='source_render' onClick={() => {}} />
        <SvgButton icon={source_export} name='source_export' onClick={() => {}} />
        <SvgButton icon={source_save} name='source_save' onClick={() => {}} />
        <SvgButton icon={source_grid_with_extra} name='source_grid_with_extra' onClick={() => {}} />
        <SvgButton icon={source_grid_no_extra} name='source_grid_no_extra' onClick={() => {}} />
      </div>
    </>
  )
}

export default App
