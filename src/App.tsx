import React, { createRef, useState } from 'react'
import viteLogo from '/logo.svg'
import './App.css'

import { Canvas } from './Canvas';
import type { Colors } from './theme';
// import { tool_constructor } from './tool';
import { cursor_down, cursor_init, cursor_move, cursor_up, type Offset, type TranslateKeys } from './cursor';
import { type SegmentType, type Point, type Size, type Mirror, type Layers } from './_types';
import { SvgButton } from './SvgButton';
import { cast_arc_c, cast_arc_r, cast_bezier, cast_close, cast_line, misc_color, source_export, source_grid_no_extra, source_grid_with_extra, source_open, source_layers, source_save, fill_color, fill_transparent, toggle_mirror, linecap_butt, linecap_round, linecap_square, toggle_thickness, linejoin_miter, linejoin_bevel, linejoin_round, cast_arc_c_full, cast_arc_r_full, source_new, source_settings, source_undo, source_redo, icon_size, icon_project, icon_show_grid, icon_show_achor, icon_show_guides, icon_about } from './icons';

import { empty_layers, tool_addVertex, tool_all_layers, tool_canCast, tool_cast, tool_constructor, tool_layer, tool_redo, tool_select_color, tool_set_linecap, tool_set_linejoin, tool_set_mirror, tool_set_thickness, tool_style, tool_toggle, tool_translate, tool_translateCopy, tool_translateLayer, tool_translateMulti, tool_undo, tool_vertexAt, type ToolI } from './tool';
import { mirror_from_style } from './generator';
import { colors } from './colors';
import { color_themes, dark_themes, light_themes, the_apollo_theme, the_default_theme } from './themes';
import { evaluate_theme } from './color-benchmark';
import { history_can_next, history_can_prev, history_constructor, history_next, history_prev, history_push, type HistoryI } from './history';

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
 - layers
 - save/load export
*/

const ColorDialog = (props: {
  select_color: (c: string) => void;
}) => <Dialog direction='up'>
    {
      Object.values(colors).map((list, list_index) => <div className='color-map'>
        {list.map((color, color_index) => <div key={`${list_index}-${color_index}`} className='color-button'
          onClick={() => {
            props.select_color(color);
          }}
          style={{background: color}} />)}
      </div>)
    }
  </Dialog>;

const Theme = (props: {theme: Colors, name: string, onClick: ()=>void, onEnter: ()=>void, onLeave: ()=>void}) => {
  const t = props.theme;
  return <div className='theme-icon'>
    <div>
      <p>{props.name}</p>
      <svg onClick={props.onClick} onMouseEnter={props.onEnter} onMouseLeave={props.onLeave} width="96px" height="64px" xmlns="http://www.w3.org/2000/svg" baseProfile="full" version="1.1">
        <rect width='96' height='64'  id='background' fill={t.background}/>
        <circle cx='24' cy='24' r='8' id='f_high' fill={t.f_high}/>
        <circle cx='40' cy='24' r='8' id='f_med' fill={t.f_med}/>
        <circle cx='56' cy='24' r='8' id='f_low' fill={t.f_low}/>
        <circle cx='72' cy='24' r='8' id='f_inv' fill={t.f_inv}/>
        <circle cx='24' cy='40' r='8' id='b_high' fill={t.b_high}/>
        <circle cx='40' cy='40' r='8' id='b_med' fill={t.b_med}/>
        <circle cx='56' cy='40' r='8' id='b_low' fill={t.b_low}/>
        <circle cx='72' cy='40' r='8' id='b_inv' fill={t.b_inv}/>
      </svg>
    </div>
  </div>;
}

const ThemeList = (props: {
  selectTheme: (theme: Colors) => void,
  setHover: (theme: Colors | null) => void
}) => {
  const all_themes = [
    dark_themes, light_themes, color_themes
  ];

  return all_themes.map((themes, list_index) => <div className="theme-row" key={list_index}>
    {themes.map(((theme, theme_index)=><Theme key={theme_index}
      onEnter={() => props.setHover(theme.theme)}
      onLeave={() => props.setHover(null)}
      onClick={() => {
        props.selectTheme(theme.theme);
      }}
      theme={theme.theme} name={theme.name}/>))}
  </div>);
}

const Relative = (props: {children: React.ReactNode}) => <div className='relative'>{props.children}</div>;

const Dialog = (props: {children: React.ReactNode, direction: "up" | "down"}) =>
  <div className={`dialog ${props.direction}`}>
    {props.direction === 'down' && <div className='point'/>}
    {props.children}
    {props.direction === 'up' && <div className='point'/>}
  </div>

type Dialog = 'color' | 'thickness' | 'settings' | 'about';

const App = () => {
  const canvasElement = createRef<SVGSVGElement>();

  const [hoverTheme, setHoverTheme] = useState<null | Colors>(null);
  const [selectedTheme, setSelectedTheme] = useState<Colors>(() => {
    // Detect if user prefers dark mode
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? the_apollo_theme : the_default_theme;
  });

  const [cursor, setCursor] = useState(cursor_init);
  const [tool, setTool] = useState<ToolI>(tool_constructor);
  const [history, setHistory] = useState<HistoryI<Layers>>(() => {
    const h = history_constructor<Layers>();
    history_push(h, empty_layers());
    return h;
  })


  const [preview, setPreview] = useState<SegmentType | null>(null);
  const [showExtra, setShowExtra] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showHandles, setShowHandles] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [dialog, setDialog] = useState<Dialog | null>(null);

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

      const t = structuredClone(tool);
      let tool_changed = false;

      const h = structuredClone(history);
      let history_changed = false;

      const push = (lay:Layers) => {
        history_push(h, lay);
        history_changed = true;
      };

      const add_vertex = (p: Point) => {
        tool_addVertex(t, p, ()=>{})
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
      if(history_changed) {
        setHistory(h);
      }
    }
  };

  const DialogButton = (props: {
    icon: string;
    dialog: Dialog;
  }) => <SvgButton theme={theme} icon={props.icon} name={props.dialog} is_selected={dialog === props.dialog} onClick={() => {
    if(dialog === null) {
      setDialog(props.dialog);
    }
    else {
      setDialog(null);
    }
  }} />;

  const CastButton = (props: {
    icon: string;
    name: string;
    segment: SegmentType;
  }) => <SvgButton theme={theme} icon={props.icon} name={props.name} isEnabled={tool_canCast(tool, props.segment)} onEnter={() => setPreview(props.segment)} onLeave={() => setPreview(null)} onClick={() => {
          const t = structuredClone(tool);
          const h = structuredClone(history);
          tool_cast(t, props.segment, () => {}, (lay) => {
            history_push(h, lay);
          });
          setTool(t);
          setHistory(h);
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

  const theme_eval = hoverTheme ? evaluate_theme(hoverTheme) : null;

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
          <Relative>
            <DialogButton icon={source_settings} dialog='settings'/>
            {dialog ==='settings' && <Dialog direction='down'>
              <hr/>
              <h4>Themes</h4>
               <ThemeList setHover={setHoverTheme} selectTheme={theme => {
                setSelectedTheme(theme);
                setHoverTheme(null);
                setDialog(null);
               }}
              />
              {theme_eval && <div className='theme-eval'><table><tbody>
                <tr><th>Category</th><td>{theme_eval.cat}</td></tr>
                <tr><th>Score</th><td>{theme_eval.score}/{theme_eval.max_score}</td></tr>
                {theme_eval.debug.length > 0 && <tr><th>Log</th><td>{theme_eval.debug}</td></tr>}
                </tbody>
              </table></div>}
            </Dialog>}
          </Relative>
          <Relative>
            <DialogButton icon={icon_about} dialog='about' />
            {dialog === 'about' && <Dialog direction='down'>
              <p>
                Dotgrid is a simple vector drawing app <a href="https://hundredrabbits.itch.io/dotgrid">orignially by 100 rabbits</a>.
              </p>
              <p>
                This is <a href="https://github.com/madeso/dotgrid">a fork</a> with some different features.
              </p>
            </Dialog>}
          </Relative>
        </div>
        <div className='border'>
          <SvgButton theme={theme} icon={source_undo} isEnabled={history_can_prev(history)} name='undo' onClick={() => {
            const t = structuredClone(tool);
            const h = structuredClone(history);
            tool_undo(t, ()=>{}, () => history_prev(h));
            setTool(t);
            setHistory(h);
          }} />
          <SvgButton theme={theme} icon={source_redo} isEnabled={history_can_next(history)} name='redo' onClick={() => {
            const t = structuredClone(tool);
            const h = structuredClone(history);
            tool_redo(t, () => history_next(h), ()=>{});
            setTool(t);
            setHistory(h);
          }} />
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
            const h = structuredClone(history);
            tool_cast(t, 'close', () => {}, (lay) => {
              history_push(h, lay);
            });
            setTool(t);
            setHistory(h);
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

          <Relative>
            {dialog === 'color' && <ColorDialog select_color={(new_color) => {
              const t = structuredClone(tool);
              tool_select_color(t, new_color);
              setTool(t);
              setDialog(null);
            }}/>}
            <DialogButton icon={misc_color} dialog='color'/>
          </Relative>
          <Relative>
            <DialogButton icon={toggle_thickness} dialog='thickness' />
            {dialog ==='thickness' && 
            <input id="thickness-slider" type="range" name="thickness" min={1} max={100} value={tool_style(tool).thickness}
              onChange={(e) => {
                const thickness = parseFloat(e.target.value);
                const t = structuredClone(tool);
                tool_set_thickness(t, thickness);
                setTool(t);
              }}
            />
            }
          </Relative>
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
