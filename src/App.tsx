import React, { createRef, useEffect, useState } from 'react'

import { Canvas } from './Canvas';
import { isColor, isJson, load_color_theme, read_file, read_theme, save_color_theme, theme_browse, type Colors } from './theme';
import { cursor_alt, cursor_down, cursor_init, cursor_move, cursor_up, type Offset, type TranslateKeys } from './cursor';
import { type SegmentType, type Point, type Mirror, type Layers } from './_types';
import { Button, SvgButton } from './SvgButton';
import * as icons from './icons';

import { empty_layers, jsonDump, load_tool, save_tool, tool_addVertex, tool_all_layers, tool_canCast, tool_cast, tool_clear, tool_constructor, tool_export, tool_import, tool_layer, tool_merge, tool_path, tool_redo, tool_removePointAt, tool_removeSegmentAt, tool_replace, tool_reset, tool_select_color, tool_selectLayer, tool_set_linecap, tool_set_linejoin, tool_set_mirror, tool_set_thickness, tool_style, tool_toggle_fill, tool_translate, tool_translateCopy, tool_translateLayer, tool_translateMulti, tool_undo, tool_vertexAt, type ToolI } from './tool';
import { colors } from './colors';
import { color_themes, dark_themes, light_themes, the_apollo_theme, the_default_theme } from './themes';
import { evaluate_theme } from './color-benchmark';
import { history_can_next, history_can_prev, history_constructor, history_next, history_prev, history_push, type HistoryI } from './history';
import { source_open, source_write } from './source';
import { manager_toPNG, manager_toString } from './manager';
import { keymap_onkey, keymap_register, keymap_to_markdown, type Keymap } from './acels';

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

const ColorDialog = (props: {
  select_color: (c: string) => void;
  current_color: string,
}) => {
  const [customColor, setCustomColor] = useState<string>(props.current_color);
  return <Dialog direction='up'>
    {
      Object.values(colors).map((list, list_index) => <div key={list_index} className='color-map'>
        {list.map((color, color_index) => <div key={`${list_index}-${color_index}`} className='color-button'
          onClick={() => {
            setCustomColor(color);
          }}
          style={{ background: color }} />)}
      </div>)
    }
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        className='color-preview'
        style={{
          backgroundColor: isColor(customColor) ? customColor : "#FFF",
        }}
      />
      <input
        className='color-preview'
        type='text'
        value={customColor}
        onChange={(ev) => {
          setCustomColor(ev.target.value);
        }}
        placeholder="#RRGGBB"
        onKeyUp={(ev) => {
          if (ev.key === 'Enter') {
            if (isColor(customColor)) {
              props.select_color(customColor);
            }
          }
        }}
      />
    </div>
    <Button isEnabled={isColor(customColor)} onClick={() => {
      if (isColor(customColor)) {
        props.select_color(customColor);
      }
    }}>OK</Button>
  </Dialog>;
}

const Theme = (props: { theme: Colors, name: string, onClick: () => void, onEnter: () => void, onLeave: () => void }) => {
  const t = props.theme;
  return <div className='theme-icon'>
    <div>
      <p>{props.name}</p>
      <svg onClick={props.onClick} onMouseEnter={props.onEnter} onMouseLeave={props.onLeave} width="96px" height="64px" xmlns="http://www.w3.org/2000/svg" baseProfile="full" version="1.1">
        <rect width='96' height='64' id='background' fill={t.background} />
        <circle cx='24' cy='24' r='8' id='f_high' fill={t.f_high} />
        <circle cx='40' cy='24' r='8' id='f_med' fill={t.f_med} />
        <circle cx='56' cy='24' r='8' id='f_low' fill={t.f_low} />
        <circle cx='72' cy='24' r='8' id='f_inv' fill={t.f_inv} />
        <circle cx='24' cy='40' r='8' id='b_high' fill={t.b_high} />
        <circle cx='40' cy='40' r='8' id='b_med' fill={t.b_med} />
        <circle cx='56' cy='40' r='8' id='b_low' fill={t.b_low} />
        <circle cx='72' cy='40' r='8' id='b_inv' fill={t.b_inv} />
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
    {themes.map(((theme, theme_index) => <Theme key={theme_index}
      onEnter={() => props.setHover(theme.theme)}
      onLeave={() => props.setHover(null)}
      onClick={() => {
        props.selectTheme(theme.theme);
      }}
      theme={theme.theme} name={theme.name} />))}
  </div>);
}

const Relative = (props: { children: React.ReactNode }) => <div className='relative'>{props.children}</div>;

const Dialog = (props: { children: React.ReactNode, direction: "up" | "down" }) =>
  <div className={`dialog ${props.direction}`}>
    {props.direction === 'down' && <div className='point' />}
    {props.children}
    {props.direction === 'up' && <div className='point' />}
  </div>

type Dialog = 'color' | 'thickness' | 'settings' | 'about' | 'layers' | 'canvas-size' | 'export';

const LayerIcon = (props: { color: string }) => {
  const size = 16;
  return <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
    <circle fill={props.color} cx={size / 2} cy={size / 2} r={size / 2} />
  </svg>;
}

const Properties = (props: { children: React.ReactNode }) => <div className='properties'>{props.children}</div>;
const Row = (props: { children: React.ReactNode }) => <div className='row'>{props.children}</div>

const create_new_history = (layers?: Layers) => {
  const h = history_constructor<Layers>();
  history_push(h, layers ?? empty_layers());
  return h;
};

const is_json = (text: string) => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};


const pick_default_theme = () => {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? the_apollo_theme : the_default_theme;
}

function toggle_enum<T>(current: T, all: T[]): T {
  if (all.length <= 0) return current;

  const enum_index = all.indexOf(current);
  if (enum_index == -1) return all[0];

  const next_index = (enum_index + 1) % all.length;
  return all[next_index];
}

const step_thickness = (current: number, change: number) => {
  return Math.min(Math.max(current + change, 1), 100);
}

const AboutDialog = (props: {
  keymap: Keymap
}) => {
  const [isDebug, setDebug] = useState(false);
  return <Dialog direction='down'>
    {isDebug === false && <><p>
      Dotgrid is a simple vector drawing app <a href="https://hundredrabbits.itch.io/dotgrid">orignially by 100 rabbits</a>.
    </p>
      <p>
        This is <a href="https://github.com/madeso/dotgrid">a fork</a> with some different features.
      </p>
      <Button onClick={() => {
        setDebug(true);
      }}>Debug</Button></>}
    {isDebug && <>
      <textarea readOnly={true} value={keymap_to_markdown(props.keymap)} />
    </>}
  </Dialog>;
}

const App = () => {
  const canvasElement = createRef<SVGSVGElement>();

  const [hoverTheme, setHoverTheme] = useState<null | Colors>(null);
  const [selectedTheme, setSelectedThemeData] = useState<Colors>(() => {
    const loaded = load_color_theme();
    if (loaded !== null) {
      return loaded;
    }
    return pick_default_theme();
  });

  const setSelectedTheme = (theme: Colors) => {
    setSelectedThemeData(theme);
    save_color_theme(theme);
  }

  const [cursor, setCursor] = useState(cursor_init);
  const [tool, setToolData] = useState<ToolI>(() => {
    const loaded = load_tool();
    if (loaded !== null) return loaded;
    return tool_constructor();
  });
  const [history, setHistory] = useState<HistoryI<Layers>>(() => {
    const h = create_new_history(tool.layers);
    return h;
  });
  const [preview, setPreview] = useState<SegmentType | null>(null);
  const [showExtra, setShowExtra] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showHandles, setShowHandles] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [scale, setScale] = useState(1);
  const [newWidth, setNewWidth] = useState<number>(tool.settings.size.width);
  const [newHeight, setNewHeight] = useState<number>(tool.settings.size.height);
  const [menubarVisible, setMenubarVisible] = useState(true);
  const [toolbarVisible, setToolbarVisible] = useState(true);

  const size = tool.settings.size;

  const setTool = (tool: ToolI) => {
    save_tool(tool);
    setToolData(tool);
  }

  useEffect(() => {
    const t = hoverTheme ?? selectedTheme;
    const style = document.documentElement.style;
    style.setProperty("--background", t.background);
    style.setProperty("--f-high", t.f_high);
    style.setProperty("--f-med", t.f_med);
    style.setProperty("--f-low", t.f_low);
    style.setProperty("--f-inv", t.f_inv);
    style.setProperty("--b-high", t.b_high);
    style.setProperty("--b-med", t.b_med);
    style.setProperty("--b-low", t.b_low);
    style.setProperty("--b-inv", t.b_inv);
  }, [hoverTheme, selectedTheme]);

  const theme = hoverTheme ?? selectedTheme;

  const current_mirror = tool_style(tool).mirror;

  const set_dialog = (new_dialog: Dialog) => {
    if (dialog === null) {
      setDialog(new_dialog);
    }
    else {
      setDialog(null);
    }
  };

  const import_theme = () => {
    theme_browse((new_theme) => {
      setSelectedTheme(new_theme);
    });
  }

  const file_new = () => {
    // todo(Gustav): change size?
    const t = structuredClone(tool);
    tool_reset(t);
    setTool(t);
    setHistory(create_new_history());
  };

  const read_grid_file = (content: string) => {
    const t = structuredClone(tool);
    // todo(Gustav): validate parsed file...
    tool_replace(t, JSON.parse(content), () => { }, () => { });
    setTool(t);
    setHistory(create_new_history(t.layers));
  }

  const file_open = () => {
    source_open("grid", (file, content) => {
      console.log("Opening", file);

      read_grid_file(content);
    });
  };

  const file_save = () => {
    source_write(
      "dotgrid",
      "grid",
      tool_export(tool),
      "text/plain"
    );
  };

  const export_svg = () => {
    source_write("dotgrid", "svg", manager_toString(size, tool), "image/svg+xml");
  }
  const export_png = () => {
    manager_toPNG(size, (dataUrl) => {
      source_write("dotgrid", "png", dataUrl, "image/png");
    }, tool);
  };

  const edit_undo = () => {
    const t = structuredClone(tool);
    const h = structuredClone(history);
    tool_undo(t, () => history_prev(h));
    setTool(t);
    setHistory(h);
  };

  const edit_redo = () => {
    const t = structuredClone(tool);
    const h = structuredClone(history);
    tool_redo(t, () => history_next(h));
    setTool(t);
    setHistory(h);
  };

  const select_layer = (layer_index: number) => {
    const t = structuredClone(tool);
    tool_selectLayer(t, layer_index);
    setTool(t);
  }

  const merge_layers = () => {
    const t = structuredClone(tool);
    const h = structuredClone(history);
    tool_merge(t, (lay) => {
      history_push(h, lay);
    });
    setTool(t);
    setHistory(h);
  }

  const cast_this = (segment: SegmentType) => {
    const t = structuredClone(tool);
    const h = structuredClone(history);
    tool_cast(t, segment, (lay) => {
      history_push(h, lay);
    });
    setTool(t);
    setHistory(h);
  }

  const keymap = keymap_register([
    {
      category: "∷", name: "Toggle Menubar", accelerator: "Tab", action: () => {
        setMenubarVisible(!menubarVisible);
      }
    },
    {
      category: "∷", name: "Open Theme", accelerator: "CmdOrCtrl+Shift+O", action: () => {
        import_theme();
      }
    },
    {
      category: "∷", name: "Reset Theme", accelerator: "CmdOrCtrl+Backspace", action: () => {
        setSelectedTheme(pick_default_theme());
      }
    },
    {
      category: "File", name: "New", accelerator: "CmdOrCtrl+N", action: () => {
        file_new();
      }
    },
    {
      category: "File", name: "Open", accelerator: "CmdOrCtrl+O", action: () => {
        file_open();
      }
    },
    {
      category: "File", name: "Save", accelerator: "CmdOrCtrl+S", action: () => {
        file_save();
      }
    },
    {
      category: "File", name: "Export Vector", accelerator: "CmdOrCtrl+E", action: () => {
        export_svg();
      }
    },
    {
      category: "File", name: "Export Image", accelerator: "CmdOrCtrl+Shift+E", action: () => {
        export_png();
      }
    },
    {
      category: "Edit", name: "Undo", accelerator: "CmdOrCtrl+Z", action: () => {
        edit_undo();
      }
    },
    {
      category: "Edit", name: "Redo", accelerator: "CmdOrCtrl+Shift+Z", action: () => {
        edit_redo();
      }
    },
    {
      category: "View", name: "Color Picker", accelerator: "G", action: () => {
        set_dialog("color"); // todo(Gustav): also start the color picker
      }
    },
    {
      category: "View", name: "Toggle Grid", accelerator: "H", action: () => {
        setShowExtra(!showExtra);
      }
    },
    {
      category: "View", name: "Toggle Tools", accelerator: "CmdOrCtrl+H", action: () => {
        setToolbarVisible(!toolbarVisible);
      }
    },
    {
      category: "Layers", name: "Foreground", accelerator: "CmdOrCtrl+1", action: () => {
        select_layer(0);
      }
    },
    {
      category: "Layers", name: "Middleground", accelerator: "CmdOrCtrl+2", action: () => {
        select_layer(1);
      }
    },
    {
      category: "Layers", name: "Background", accelerator: "CmdOrCtrl+3", action: () => {
        select_layer(2);
      }
    },
    {
      category: "Layers", name: "Merge Layers", accelerator: "CmdOrCtrl+M", action: () => {
        merge_layers();
      }
    },
    {
      category: "Stroke", name: "Line", accelerator: "A", action: () => {
        cast_this("line");
      }
    },
    {
      category: "Stroke", name: "Arc", accelerator: "S", action: () => {
        cast_this("arc_c");
      }
    },
    {
      category: "Stroke", name: "Arc Rev", accelerator: "D", action: () => {
        cast_this("arc_r");
      }
    },
    {
      category: "Stroke", name: "Bezier", accelerator: "F", action: () => {
        cast_this("bezier");
      }
    },
    {
      category: "Stroke", name: "Close", accelerator: "Z", action: () => {
        cast_this("close");
      }
    },
    {
      category: "Stroke", name: "Arc(full)", accelerator: "T", action: () => {
        cast_this("arc_c_full");
      }
    },
    {
      category: "Stroke", name: "Arc Rev(full)", accelerator: "Y", action: () => {
        cast_this("arc_r_full");
      }
    },
    {
      category: "Stroke", name: "Clear Selection", accelerator: "Escape", action: () => {
        const t = structuredClone(tool);
        tool_clear(t);
        setTool(t);
      }
    },
    {
      category: "Stroke", name: "Erase Segment", accelerator: "Backspace", action: () => {
        const t = structuredClone(tool);
        const h = structuredClone(history);
        let changed_history = false;
        tool_removeSegmentAt(t, cursor.pos, (lay) => {
          history_push(h, lay);
          changed_history = true;
        });
        setTool(t);
        if (changed_history) {
          setHistory(h);
        }
      }
    },
    {
      category: "Control", name: "Add Point", accelerator: "Enter", action: () => {
        const t = structuredClone(tool);
        tool_addVertex(t, cursor.pos);
        setTool(t);
      }
    },
    {
      category: "Control", name: "Move Up", accelerator: "Up", action: () => {
        const c = structuredClone(cursor);
        c.pos.y -= 15;
        setCursor(c);
      }
    },
    {
      category: "Control", name: "Move Right", accelerator: "Right", action: () => {
        const c = structuredClone(cursor);
        c.pos.x += 15;
        setCursor(c);
      }
    },
    {
      category: "Control", name: "Move Down", accelerator: "Down", action: () => {
        const c = structuredClone(cursor);
        c.pos.y += 15;
        setCursor(c);
      }
    },
    {
      category: "Control", name: "Move Left", accelerator: "Left", action: () => {
        const c = structuredClone(cursor);
        c.pos.x -= 15;
        setCursor(c);
      }
    },
    {
      category: "Control", name: "Remove Point", accelerator: "X", action: () => {
        const t = structuredClone(tool);
        const h = structuredClone(history);
        tool_removePointAt(t, cursor.pos, (lay) => {
          history_push(h, lay);
        });
        setTool(t);
        setHistory(h);
      }
    },
    {
      category: "Style", name: "Linecap", accelerator: "Q", action: () => {
        const t = structuredClone(tool);
        const lay = tool_style(t);
        lay.strokeLinecap = toggle_enum(lay.strokeLinecap, ["butt", "square", "round"]);
        setTool(t);
      }
    },
    {
      category: "Style", name: "Linejoin", accelerator: "W", action: () => {
        const t = structuredClone(tool);
        const lay = tool_style(t);
        lay.strokeLinejoin = toggle_enum(lay.strokeLinejoin, ["miter", "round", "bevel"]);
        setTool(t);
      }
    },
    {
      category: "Style", name: "Mirror", accelerator: "E", action: () => {
        const t = structuredClone(tool);
        const lay = tool_style(t);
        lay.mirror = toggle_enum(lay.mirror, ["none", "horizontal", "vertical", "diagonal"]);
        setTool(t);
      }
    },
    {
      category: "Style", name: "Fill", accelerator: "R", action: () => {
        const t = structuredClone(tool);
        tool_toggle_fill(t);
        setTool(t);
      }
    },
    {
      category: "Style", name: "Thicker", accelerator: "}", action: () => {
        const t = structuredClone(tool);
        const lay = tool_style(t);
        lay.thickness = step_thickness(lay.thickness, 1);
        setTool(t);
      }
    },
    {
      category: "Style", name: "Thinner", accelerator: "{", action: () => {
        const t = structuredClone(tool);
        const lay = tool_style(t);
        lay.thickness = step_thickness(lay.thickness, -1);
        setTool(t);
      }
    },
    {
      category: "Style", name: "Thicker +5", accelerator: "]", action: () => {
        const t = structuredClone(tool);
        const lay = tool_style(t);
        lay.thickness = step_thickness(lay.thickness, 5);
        setTool(t);
      }
    },
    {
      category: "Style", name: "Thinner -5", accelerator: "[", action: () => {
        const t = structuredClone(tool);
        const lay = tool_style(t);
        lay.thickness = step_thickness(lay.thickness, -5);
        setTool(t);
      }
    }
  ]);

  const events: React.SVGProps<SVGSVGElement> = {
    onPointerMove: (ev) => {
      ev.preventDefault();
      const offset = offset_from_canvas(canvasElement.current);

      const c = structuredClone(cursor);
      cursor_move(c, ev, size, offset, scale);
      setCursor(c);
    },
    onContextMenu: (ev) => {
      const offset = offset_from_canvas(canvasElement.current);
      cursor_alt(cursor, ev, size, offset, (p) => {
        const t = structuredClone(tool);
        const h = structuredClone(history);
        tool_removeSegmentAt(t, p, (lay) => {
          history_push(h, lay);
        });
        tool_clear(t);
        setTool(t);
        setHistory(h);
      }, scale);
    },
    onPointerDown: (ev) => {
      ev.preventDefault();
      const offset = offset_from_canvas(canvasElement.current);

      const c = structuredClone(cursor);
      cursor_down(c, (p) => tool_vertexAt(tool, p), ev, size, offset, scale)
      setCursor(c);
    },
    onPointerUp: (ev) => {
      ev.preventDefault();
      const offset = offset_from_canvas(canvasElement.current);

      const t = structuredClone(tool);
      let tool_changed = false;

      const h = structuredClone(history);
      let history_changed = false;

      const push = (lay: Layers) => {
        history_push(h, lay);
        history_changed = true;
      };

      const add_vertex = (p: Point) => {
        tool_addVertex(t, p);
        tool_changed = true;
      };

      const translate = (from: Point, to: Point, meta: TranslateKeys) => {
        if (meta.layer === true) {
          tool_translateLayer(t, from, to, push);
        } else if (meta.copy) {
          tool_translateCopy(t, from, to, push);
        } else if (meta.multi) {
          tool_translateMulti(t, from, to, push);
        } else {
          tool_translate(t, from, to, push);
        }
        tool_changed = true;
      };

      const c = structuredClone(cursor);
      cursor_up(c, ev, size, offset, translate, add_vertex, scale);
      setCursor(c);

      if (tool_changed) {
        setTool(t);
      }
      if (history_changed) {
        setHistory(h);
      }
    }
  };

  const DialogButton = (props: {
    icon: string;
    dialog: Dialog;
  }) => <SvgButton theme={theme} icon={props.icon} name={props.dialog} is_selected={dialog === props.dialog} onClick={() => {
    set_dialog(props.dialog)
  }} />;

  const CastButton = (props: {
    icon: string;
    name: string;
    segment: SegmentType;
  }) => <SvgButton theme={theme} icon={props.icon} name={props.name} isEnabled={tool_canCast(tool, props.segment)} onEnter={() => setPreview(props.segment)} onLeave={() => setPreview(null)} onClick={() => {
    cast_this(props.segment);
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
    <div
      id="app"
      tabIndex={0}
      onDragOver={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (e.dataTransfer === null) return;
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (e.dataTransfer === null) return;
        if (e.dataTransfer.files.length <= 0) return;

        const file = e.dataTransfer.files[0];
        if (file.name.indexOf(".svg") > -1) {
          read_theme(file, setSelectedTheme);
        }
        else if (file.name.indexOf('.grid') > -1) {
          read_file(file, data => {
            if (typeof data === 'string' && isJson(data)) {
              read_grid_file(data);
            }
            else {
              console.error("Invalid data loaded");
            }
          });
        }
        else {
          console.error('Unhandled extension', file.name);
        }
      }}
      onKeyDown={(ev) => {
        if (dialog === null) {
          keymap_onkey(keymap, ev);
        }
      }}
      onCut={(e) => {
        console.log("cut");
        e.preventDefault();
        if (e.clipboardData === null) {
          console.error("missing clipboard");
          return;
        }
        e.clipboardData.setData("text/source", jsonDump(tool_layer(tool)));
        e.clipboardData.setData("text/plain", tool_path(tool, size));
        const t = structuredClone(tool);
        t.layers[t.layer_index] = [];
        setTool(t);
      }}
      onCopy={(e) => {
        console.log("copied");
        e.preventDefault();
        if (e.clipboardData === null) {
          console.error("missing clipboard");
          return;
        }
        e.clipboardData.setData("text/source", jsonDump(tool_layer(tool)));
        e.clipboardData.setData("text/plain", tool_path(tool, size));
      }}
      onPaste={(e) => {
        console.log("pasted");
        e.preventDefault();
        const data = e.clipboardData?.getData("text/source");
        if (data && is_json(data)) {
          const parsed = JSON.parse(data.trim());
          const t = structuredClone(tool);
          const h = structuredClone(history);
          tool_import(t, parsed, (lay) => {
            history_push(h, lay);
          });
          setTool(t);
          setHistory(h);
        }
      }}
    >
      <div id="canvas-container">
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
          layers={tool_all_layers(tool, scale, size)}
          tool_vertices={tool.vertices}
          theme={theme}
          props={events}
        />
      </div>

      {menubarVisible && (
        <div id='menubar'>
          <div className='border'>
            <SvgButton theme={theme} icon={icons.new_file} name='new' onClick={() => {
              file_new();
            }} />
            <SvgButton theme={theme} icon={icons.open_file} name='open' onClick={() => {
              file_open();
            }} />
            <SvgButton theme={theme} icon={icons.save_file} name='save' onClick={() => {
              file_save();
            }} />
            <Relative>
              <DialogButton icon={icons.export_file} dialog='export' />
              {dialog === 'export' && <Dialog direction='down'>
                <div className='export'>
                  <h3>Export</h3>
                  <Button onClick={() => {
                    export_svg();
                    setDialog(null);
                  }}>SVG</Button>
                  <Button onClick={() => {
                    export_png();
                    setDialog(null);
                  }}>PNG</Button>
                </div>
              </Dialog>}
            </Relative>
            <Relative>
              <DialogButton icon={icons.settings} dialog='settings' />
              {dialog === 'settings' && <Dialog direction='down'>
                <hr />
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
                <Button onClick={() => {
                  import_theme();
                }}>Import theme</Button>
                <div className='keybinds'>
                  {
                    keymap.binds.map((bind, bind_index) => <div key={bind_index}>
                      <b>{bind.name}:</b> {bind.accelerator}
                    </div>)
                  }
                </div>
              </Dialog>}
            </Relative>
            <Relative>
              <DialogButton icon={icons.about} dialog='about' />
              {dialog === 'about' && <AboutDialog keymap={keymap} />}
            </Relative>
          </div>
          <div className='border'>
            <SvgButton theme={theme} icon={icons.undo} isEnabled={history_can_prev(history)} name='undo' onClick={() => {
              edit_undo();
            }} />
            <SvgButton theme={theme} icon={icons.redo} isEnabled={history_can_next(history)} name='redo' onClick={() => {
              edit_redo();
            }} />
          </div>
          <div className='border'>
            <Relative>
              <DialogButton icon={icons.canvas_size} dialog='canvas-size' />
              {dialog == 'canvas-size' && <Dialog direction='down'><div className='canvas-size'>
                <h3>Canvas Size</h3>
                <Properties>
                  <Row>
                    <label>Width</label>
                    <input type='number' value={newWidth} min={1}
                      onChange={(v) => setNewWidth(parseInt(v.target.value))} />
                  </Row>
                  <Row>
                    <label>Height</label>
                    <input type='number' value={newHeight} min={1}
                      onChange={(v) => setNewHeight(parseInt(v.target.value))} />
                  </Row>
                  <Row>
                    <Button isEnabled={newHeight !== size.height || newWidth !== size.width} onClick={() => {
                      const t = structuredClone(tool);
                      t.settings.size = { width: newWidth, height: newHeight };
                      setTool(t);
                      setDialog(null);
                    }}>Change</Button>
                    <Button onClick={() => {
                      setNewWidth(size.width);
                      setNewHeight(size.height);
                      setDialog(null);
                    }} > Cancel </Button>
                  </Row>
                </Properties>
                <Properties>
                  <Row>
                    <label>Scale</label>
                    <input type='number' value={scale} min={1}
                      onChange={(v) => setScale(parseInt(v.target.value))} />
                  </Row>
                </Properties>
              </div>
              </Dialog>}
            </Relative>
            <SvgButton theme={theme} icon={icons.project} name='project' onClick={() => {
              alert("not implemented / coming soon");
            }} />

            <Relative>
              <DialogButton icon={icons.browse_layers} dialog='layers' />

              {dialog === 'layers' && <Dialog direction="down"><ul className='layers'>
                {
                  tool.layers.map((layer, layer_index) => <li key={layer_index}><Button is_selected={layer_index === tool.layer_index} onClick={() => {
                    select_layer(layer_index);
                    setDialog(null);
                  }}>
                    <LayerIcon color={tool.styles[layer_index].color} /> Layer {layer_index} | Shapes: {layer.length}
                  </Button></li>
                  )
                }
              </ul>
                <Button onClick={() => {
                  merge_layers();
                }}>Merge layers</Button>
              </Dialog>}
            </Relative>
          </div>

          <div className='border'>
            <SvgButton theme={theme} icon={showExtra ? icons.grid_with_extra : icons.grid_no_extra} name='widgets' onClick={() => {
              setShowExtra(!showExtra);
            }} />
            <SvgButton theme={theme} isEnabled={showExtra} is_selected={showGrid} icon={icons.show_grid} name='grid' onClick={() => {
              if (!showExtra) return;
              setShowGrid(!showGrid);
            }} />
            <SvgButton theme={theme} isEnabled={showExtra} is_selected={showHandles} icon={icons.show_achor} name='handles' onClick={() => {
              if (!showExtra) return;
              setShowHandles(!showHandles);
            }} />
            <SvgButton theme={theme} isEnabled={showExtra} is_selected={showGuides} icon={icons.show_guides} name='guide' onClick={() => {
              if (!showExtra) return;
              setShowGuides(!showGuides);
            }} />
          </div>
        </div>
      )}

      {toolbarVisible && (
        <div id='toolbar'>
          <div className="border">
            <CastButton icon={icons.cast_line} name='cast line' segment='line' />
            <CastButton icon={icons.cast_arc_c} name='cast arc c' segment='arc_c' />
            <CastButton icon={icons.cast_arc_c_full} name='cast arc c full' segment='arc_c_full' />
            <CastButton icon={icons.cast_arc_r} name='cast arc r' segment='arc_r' />
            <CastButton icon={icons.cast_arc_r_full} name='cast arc r full' segment='arc_r_full' />
            <CastButton icon={icons.cast_bezier} name='cast bezier' segment='bezier' />
            <SvgButton theme={theme} icon={icons.cast_close} name='cast close' isEnabled={tool_canCast(tool, 'close')} onClick={() => {
              const t = structuredClone(tool);
              const h = structuredClone(history);
              tool_cast(t, 'close', (lay) => {
                history_push(h, lay);
              });
              setTool(t);
              setHistory(h);
            }} />
          </div>
          <div className='border'>
            <LineCapButton icon={icons.linecap_butt} name='butt cap' linecap='butt' />
            <LineCapButton icon={icons.linecap_round} name='round cap' linecap='round' />
            <LineCapButton icon={icons.linecap_square} name='square cap' linecap='square' />
          </div>
          <div className='border'>
            <LineJoinButton icon={icons.linejoin_miter} name='miter join' linejoin='miter' />
            <LineJoinButton icon={icons.linejoin_round} name='round join' linejoin='round' />
            <LineJoinButton icon={icons.linejoin_bevel} name='bevel join' linejoin='bevel' />
          </div>
          <div className='border'>
            <SvgButton icon={tool_style(tool).fill ? icons.fill_color : icons.fill_transparent} name='toggle_fill' theme={theme} onClick={() => {
              const t = structuredClone(tool);
              tool_toggle_fill(t);
              setTool(t);
            }} />

            <Relative>
              {dialog === 'color' && <ColorDialog current_color={tool.styles[tool.layer_index].color} select_color={(new_color) => {
                const t = structuredClone(tool);
                tool_select_color(t, new_color);
                setTool(t);
                setDialog(null);
              }} />}
              <DialogButton icon={icons.browse_color} dialog='color' />
            </Relative>
            <Relative>
              <DialogButton icon={icons.toggle_thickness} dialog='thickness' />
              {dialog === 'thickness' &&
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
            <MirrorButton icon={icons.mirror_none} name='toggle_mirror' mirror='none' />
            <MirrorButton icon={icons.mirror_horizontal} name='toggle_mirror' mirror='horizontal' />
            <MirrorButton icon={icons.mirror_vertical} name='toggle_mirror' mirror='vertical' />
            <MirrorButton icon={icons.mirror_diagonal} name='toggle_mirror' mirror='diagonal' />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
