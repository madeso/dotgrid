import { createRef, useState } from 'react'
import viteLogo from '/logo.svg'
import './App.css'

import { Canvas } from './Canvas';
import type { Colors } from './theme';
// import { tool_constructor } from './tool';
import { cursor_down, cursor_init, cursor_move, cursor_up, type Offset, type TranslateKeys } from './cursor';
import { type SegmentType, type Point, type Size, type Mirror } from './_types';
import { SvgButton } from './SvgButton';
import { cast_arc_c, cast_arc_r, cast_bezier, cast_close, cast_line, misc_color, source_export, source_grid_no_extra, source_grid_with_extra, source_open, source_layers, source_save, fill_color, fill_transparent, toggle_mirror, linecap_butt, linecap_round, linecap_square, toggle_thickness, linejoin_miter, linejoin_bevel, linejoin_round, cast_arc_c_full, cast_arc_r_full, source_new, source_settings, source_undo, source_redo, icon_size, icon_project, icon_show_grid, icon_show_achor, icon_show_guides, icon_about } from './icons';

import { tool_addVertex, tool_all_layers, tool_canCast, tool_cast, tool_constructor, tool_layer, tool_select_color, tool_set_linecap, tool_set_linejoin, tool_set_mirror, tool_set_thickness, tool_style, tool_toggle, tool_translate, tool_translateCopy, tool_translateLayer, tool_translateMulti, tool_vertexAt, type ToolI } from './tool';
import { mirror_from_style } from './generator';
import { colors } from './colors';
import { color_themes, dark_themes, light_themes, the_apollo_theme, the_default_theme } from './themes';

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

/*
TODO
 - undo/redo
 - layers
 - save/load export
*/

const ColorDialog = (props: {
  select_color: (c: string) => void;
}) => {
  return <div className='dialog up'>
    {
      Object.values(colors).map((list, list_index) => <div className='color-map'>
        {list.map((color, color_index) => <div key={`${list_index}-${color_index}`} className='color-button'
          onClick={() => {
            props.select_color(color);
          }}
          style={{background: color}} />)}
      </div>)
    }
    <div className='point'/>
  </div>
}

const Theme = (props: {theme: Colors, name: string, onClick: ()=>void, onEnter: ()=>void, onLeave: ()=>void}) => {
  const t = props.theme;
  return <svg  onClick={props.onClick} onMouseEnter={props.onEnter} onMouseLeave={props.onLeave} width="96px" height="64px" xmlns="http://www.w3.org/2000/svg" baseProfile="full" version="1.1">
    <rect width='96' height='64'  id='background' fill={t.background}>
      <title>{props.name}</title>
    </rect>
    <circle cx='24' cy='24' r='8' id='f_high' fill={t.f_high}/>
    <circle cx='40' cy='24' r='8' id='f_med' fill={t.f_med}/>
    <circle cx='56' cy='24' r='8' id='f_low' fill={t.f_low}/>
    <circle cx='72' cy='24' r='8' id='f_inv' fill={t.f_inv}/>
    <circle cx='24' cy='40' r='8' id='b_high' fill={t.b_high}/>
    <circle cx='40' cy='40' r='8' id='b_med' fill={t.b_med}/>
    <circle cx='56' cy='40' r='8' id='b_low' fill={t.b_low}/>
    <circle cx='72' cy='40' r='8' id='b_inv' fill={t.b_inv}/>
  </svg>;
}


const ThemeList = (props: {
  selectTheme: (theme: Colors) => void,
  setHover: (theme: Colors | null) => void
}) => {
  const all_themes = [
    dark_themes, light_themes, color_themes
  ];

  return all_themes.map((themes, list_index) => <div key={list_index}>
    {themes.map(((theme, theme_index)=><Theme key={theme_index}
      onEnter={() => props.setHover(theme.theme)}
      onLeave={() => props.setHover(null)}
      onClick={() => {
        props.selectTheme(theme.theme);
      }}
      theme={theme.theme} name={theme.name}/>))}
  </div>);
}

const App = () => {

  const canvasElement = createRef<SVGSVGElement>();

  const [hoverTheme, setHoverTheme] = useState<null | Colors>(null);
  const [selectedTheme, setSelectedTheme] = useState<Colors>(() => {
    // Detect if user prefers dark mode
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? the_apollo_theme : the_default_theme;
  });

  // const [tool, setTool] = useState(() => tool_constructor());
  const [cursor, setCursor] = useState(() => cursor_init());
  const [tool, setTool] = useState<ToolI>(tool_constructor());
  const [preview, setPreview] = useState<SegmentType | null>(null);
  const [showExtra, setShowExtra] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showHandles, setShowHandles] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [thicknessVisible, setThicknessVisible] = useState(false);
  const [browseColor, setBrowseColor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const theme = hoverTheme ?? selectedTheme;

  const scale = 1;
  const current_mirror = mirror_from_style(tool_style(tool));

  const size: Size = { width: 300, height: 300 };

  const events: React.SVGProps<SVGSVGElement> = {
    onMouseMove: (ev) => {
      const offset = offset_from_canvas(canvasElement.current);
      
      const c = structuredClone(cursor);
      cursor_move(c, ev, size, offset, scale);
      setCursor(c);
    },
    onMouseDown: (ev) => {
      const offset = offset_from_canvas(canvasElement.current);

      const c = structuredClone(cursor);
      cursor_down(c, (p) => tool_vertexAt(tool, p), ev, size, offset, scale)
      setCursor(c);
    },
    onMouseUp: (ev) => {
      const offset = offset_from_canvas(canvasElement.current);

      const push = () => {};

      const t = structuredClone(tool);
      let tool_changed = true;

      const add_vertex = (p: Point) => {
        tool_addVertex(t, p, push)
        tool_changed = true;
      };

      const translate = (from: Point, to: Point, meta: TranslateKeys) => {
        if (meta.layer === true) {
          tool_translateLayer(t, from, to, push, () => {});
        } else if (meta.copy) {
          tool_translateCopy(t, from, to , push, () => {});
        } else if (meta.multi) {
          tool_translateMulti(t, from, to , push, () => {});
        } else {
          tool_translate(t, from, to, push, () => {});
        }
        tool_changed = true;
      };

      const c = structuredClone(cursor);
      cursor_up(c, ev, size, offset, translate, add_vertex, scale);
      setCursor(c);

      if(tool_changed) {
        setTool(t);
      }
    }
  };

  const CastButton = (props: {
    icon: string;
    name: string;
    segment: SegmentType;
  }) => <SvgButton theme={theme} icon={props.icon} name={props.name} isEnabled={tool_canCast(tool, props.segment)} onEnter={() => setPreview(props.segment)} onLeave={() => setPreview(null)} onClick={() => {
          const t = structuredClone(tool);
          tool_cast(t, props.segment, () => {}, () => {});
          setTool(t);
        }} />;
  const MirrorButton = (props: {
    icon: string;
    name: string;
    mirror: Mirror;
  }) => <SvgButton icon={props.icon} name={props.name} theme={theme} is_selected={current_mirror === props.mirror} onClick={() => {
    const t = structuredClone(tool);
    tool_set_mirror(t, props.mirror);
    setTool(t);
  }} />

  const LineCapButton = (props: {
    icon: string;
    name: string;
    linecap: CanvasLineCap
  }) => <SvgButton icon={props.icon} name={props.name} theme={theme} is_selected={tool_style(tool).strokeLinecap === props.linecap} onClick={() => {
    const t = structuredClone(tool);
    tool_set_linecap(t, props.linecap);
    setTool(t);
  }} />

  const LineJoinButton = (props: {
    icon: string;
    name: string;
    linejoin: CanvasLineJoin
  }) => <SvgButton icon={props.icon} name={props.name} theme={theme} is_selected={tool_style(tool).strokeLinejoin == props.linejoin} onClick={() => {
    const t = structuredClone(tool);
    tool_set_linejoin(t, props.linejoin);
    setTool(t);
  }} />

  return (
    <div id="app" style={{
      "--background": theme.background,
      "--f-high": theme.f_high,
      "--f-med": theme.f_med,
      "--f-low": theme.f_low,
      "--f-inv": theme.f_inv,
      "--b-high": theme.b_high,
      "--b-med": theme.b_med,
      "--b-low": theme.b_low,
      "--b-inv": theme.b_inv
    }}>
      <div>
        <img src={viteLogo} className="logo" alt="dotgrid logo" />
      </div>
      <h1>dotgrid</h1>

      <div id='menubar'>
        <div className='border'>
          <SvgButton theme={theme} icon={source_new} name='new' onClick={() => {}} />
          <SvgButton theme={theme} icon={source_open} name='open' onClick={() => {}} />
          <SvgButton theme={theme} icon={source_save} name='save' onClick={() => {}} />
          <SvgButton theme={theme} icon={source_export} name='source_export' onClick={() => {}} />
          <div className='relative'>
            <SvgButton theme={theme} icon={source_settings} is_selected={showSettings} name='settings' onClick={() => {
              setShowSettings(!showSettings);
            }} />
            {showSettings && <div className='dialog down'>
              <div className='point' />
              <hr/>
              <h4>Themes</h4>
               <ThemeList setHover={setHoverTheme} selectTheme={theme => {
                setSelectedTheme(theme);
                setHoverTheme(null);
                setShowSettings(false);
               }}
              />
            </div>}
          </div>
          <SvgButton theme={theme} icon={icon_about} name='about' onClick={() => {}} />
        </div>
        <div className='border'>
          <SvgButton theme={theme} icon={source_undo} name='undo' onClick={() => {}} />
          <SvgButton theme={theme} icon={source_redo} name='redo' onClick={() => {}} />
        </div>
        <div className='border'>
          <SvgButton theme={theme} icon={icon_size} name='size' onClick={() => {}} />
          <SvgButton theme={theme} icon={icon_project} name='project' onClick={() => {}} />
          <SvgButton theme={theme} icon={source_layers} name='layers' onClick={() => {}} />
        </div>

        <div className='border'>
          <SvgButton theme={theme} icon={showExtra ? source_grid_with_extra : source_grid_no_extra} name='widgets' onClick={() => {
            setShowExtra(!showExtra);
          }} />
          <SvgButton theme={theme} isEnabled={showExtra} is_selected={showGrid} icon={icon_show_grid} name='grid' onClick={() => {
            if(!showExtra) return;
            setShowGrid(!showGrid);
          }} />
          <SvgButton theme={theme} isEnabled={showExtra} is_selected={showHandles} icon={icon_show_achor} name='handles' onClick={() => {
            if(!showExtra) return;
            setShowHandles(!showHandles);
          }} />
          <SvgButton theme={theme} isEnabled={showExtra} is_selected={showGuides} icon={icon_show_guides} name='guide' onClick={() => {
            if(!showExtra) return;
            setShowGuides(!showGuides);
          }} />
        </div>
      </div>

      <Canvas
        ref={canvasElement}
        cursor_pos={cursor.pos}
        cursor_radius={5}
        mirror={current_mirror}
        copy={cursor.translation?.copy ?? false}
        multi={cursor.translation?.multi ?? false}
        translation_from={cursor.translation?.from}
        translation_to={cursor.translation?.to}
        scale={scale}
        size={size}
        show_grid={showExtra && showGrid}
        show_handles={showExtra && showHandles}
        show_guides={showExtra && showGuides}
        cast_preview={preview}
        vertex_radius={4}
        active_layer={tool_layer(tool)}
        layers={tool_all_layers(tool, size)}
        tool_vertices={tool.vertices}
        theme={theme}
        props={events}
      />
      <div id='toolbar'>
        <div className="border">
          <CastButton icon={cast_line} name='cast line' segment='line'/>
          <CastButton icon={cast_arc_c} name='cast arc c' segment='arc_c' />
          <CastButton icon={cast_arc_c_full} name='cast arc c full' segment='arc_c_full' />
          <CastButton icon={cast_arc_r} name='cast arc r' segment='arc_r' />
          <CastButton icon={cast_arc_r_full} name='cast arc r full' segment='arc_r_full' />
          <CastButton icon={cast_bezier} name='cast bezier' segment='bezier'/>
          <SvgButton theme={theme} icon={cast_close} name='cast close' isEnabled={tool_canCast(tool, 'close')} onClick={() => {
            const t = structuredClone(tool);
            tool_cast(t, 'close', () => {}, () => {});
            setTool(t);
          }} />
        </div>
        <div className='border'>
          <LineCapButton icon={linecap_butt} name='butt cap' linecap='butt' />
          <LineCapButton icon={linecap_round} name='round cap' linecap='round' />
          <LineCapButton icon={linecap_square} name='square cap' linecap='square' />
        </div>
        <div className='border'>
          <LineJoinButton icon={linejoin_miter} name='miter join' linejoin='miter' />
          <LineJoinButton icon={linejoin_round} name='round join' linejoin='round' />
          <LineJoinButton icon={linejoin_bevel} name='bevel join' linejoin='bevel' />
        </div>
        <div className='border'>
          <SvgButton icon={(tool_style(tool).fill ?? 'none') !== 'none' ? fill_color : fill_transparent} name='toggle_fill' theme={theme} onClick={() => {
            const t = structuredClone(tool);
            tool_toggle(t, 'fill', ()=>{});
            setTool(t);
          }} />

          <div className='relative'>
            {browseColor && <ColorDialog select_color={(new_color) => {
              const t = structuredClone(tool);
              tool_select_color(t, new_color);
              setTool(t);
              setBrowseColor(false);
            }}/>}
            <SvgButton icon={misc_color} name='misc_color' theme={theme} is_selected={browseColor} onClick={() => {
              setBrowseColor(!browseColor);
            }} />
          </div>
          <div className='relative'>
            <SvgButton icon={toggle_thickness} name='toggle_thickness' theme={theme} is_selected={thicknessVisible} onClick={() => {
              setThicknessVisible(!thicknessVisible);
            }} />
            {thicknessVisible && 
            <input id="thickness-slider" type="range" name="thickness" min={1} max={100} value={tool_style(tool).thickness}
              onChange={(e) => {
                const thickness = parseFloat(e.target.value);
                const t = structuredClone(tool);
                tool_set_thickness(t, thickness);
                setTool(t);
              }}
            />
            }
          </div>
        </div>
        <div className='border'>
          <MirrorButton icon={toggle_mirror.zero} name='toggle_mirror' mirror='zero' />
          <MirrorButton icon={toggle_mirror.one} name='toggle_mirror' mirror='one' />
          <MirrorButton icon={toggle_mirror.two} name='toggle_mirror' mirror='two' />
          <MirrorButton icon={toggle_mirror.three} name='toggle_mirror' mirror='three' />
        </div>
      </div>

      <div>
        <img src={viteLogo} className="logo" alt="dotgrid logo" />
      </div>
    </div>
  )
}

export default App
