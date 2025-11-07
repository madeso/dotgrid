// import { useState } from 'react'
import viteLogo from '/logo.svg'
import './App.css'

import { Canvas } from './Canvas';
import type { Colors } from './theme';

const App = () => {

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

  return (
    <>
      <div>
        <img src={viteLogo} className="logo" alt="dotgrid logo" />
      </div>
      <h1>dotgrid test</h1>

      <Canvas
        can_cast={false}
        copy={false}
        cursor_pos={{ x: 10, y: 10 }}
        cursor_radius={5}
        mirror='zero'
        multi={false}
        scale={2}
        size={{ width: 800, height: 800 }}
        showExtras={true}
        operation={'bezier'}
        translation_from={null}
        translation_to={null}
        vertex_radius={4}
        layer={[]}
        tool_vertices={[]}
        theme={theme}
      />
    </>
  )
}

export default App
