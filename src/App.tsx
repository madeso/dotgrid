import { createRef, useState } from 'react'
import viteLogo from '/logo.svg'
import './App.css'

import { Canvas } from './Canvas';
import type { Colors } from './theme';
// import { tool_constructor } from './tool';
import { cursor_init, cursor_move, type Offset } from './cursor';
import type { Size } from './_types';

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
  const scale = 2;

  const size: Size = { width: 800, height: 800 };

  const events: React.SVGProps<SVGSVGElement> = {
    onMouseMove: (ev) => {
      let offset: Offset = { left: 0, top: 0 };
      if (canvasElement.current) {
        const rect = canvasElement.current.getBoundingClientRect();
        offset = {
          left: rect.left,
          top: rect.top
        };
      }
      setCursor((c) => {
        c = structuredClone(c);
        cursor_move(c, ev, size, offset, scale);
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
        tool_vertices={[]}
        theme={theme}
        props={events}
      />
    </>
  )
}

export default App
