// import { useState } from 'react'
import viteLogo from '/logo.svg'
import './App.css'

import { Canvas } from './Canvas';
import type { Colors } from './theme';

const App = () => {

  const theme: Colors = {
    background: '#E0B1CB',
    f_high: '#231942',
    f_med: '#5E548E',
    f_low: '#BE95C4',
    f_inv: '#E0B1CB',
    b_high: '#FFFFFF',
    b_med: '#5E548E',
    b_low: '#BE95C4',
    b_inv: '#9F86C0'
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
