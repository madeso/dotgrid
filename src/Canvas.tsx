// was renderer

import type { ReactElement } from "react";
import type { Mirror, Point, RenderingLayer, SegmentType, SingleLayer, SingleStyle, Size } from "./_types";
import { generate } from "./generator";
import type { Colors } from "./theme";
import type { Client } from "./client";


const clamp = (v: number, min: number, max: number) => {
    return v < min ? min : v > max ? max : v;
};

const MirrorEl = (props: { mirror_style: Mirror, size: Size, scale: number, theme: Colors }) => {
    if (props.mirror_style === "zero") {
        return null;
    }

    const middle = {
        x: props.size.width,
        y: props.size.height,
    };

    let first: ReactElement | null = null;
    let second: ReactElement | null = null;

    if (
        props.mirror_style === "one" ||
        props.mirror_style === "three"
    ) {
        first = <Rule
            from={{ x: middle.x, y: 15 * props.scale }}
            to={{ x: middle.x, y: props.size.height * props.scale }}
            theme={props.theme}
        />;
    }

    if (
        props.mirror_style === "two" ||
        props.mirror_style === "three"
    ) {
        second = <Rule
            from={{ x: 15 * props.scale, y: middle.y }}
            to={{ x: props.size.width * props.scale, y: middle.y }}
            theme={props.theme}
        />;
    }
    return <>
        {first}{second}
    </>;
};

const Grid = (props: {size: Size, theme: Colors, scale: number, showExtras: boolean}) => {
    const size = props.size;
    const theme = props.theme;
    const this_scale = props.scale;
    const this_showExtras = props.showExtras;

    if (!this_showExtras) {
        return <></>;
    }

    const markers = {
        w: Math.floor(size.width / 15),
        h: Math.floor(size.height / 15),
    };

    const dots: ReactElement[] = [];
    for (let x = markers.w - 1; x >= 0; x--) {
        for (let y = markers.h - 1; y >= 0; y--) {
            const isStep = x % 4 === 0 && y % 4 === 0;
            // Don't draw margins
            if (x === 0 || y === 0) {
                continue;
            }
            const pos = {
                x: x * 15 * this_scale,
                y: y * 15 * this_scale,
            };
            const radius = isStep ? 2.5 : 1.5;
            dots.push(
                <circle
                    key={`dot-${x}-${y}`}
                    cx={pos.x}
                    cy={pos.y}
                    r={radius}
                    fill={theme.b_med}
                />
            );
        }
    }
    return <g id="grid">{dots}</g>;
};

// pos={this_client.cursor.translation?.to}
const Rulers = (props: {scale: number, size: Size, pos: Point | null | undefined, theme: Colors}) => {
    const this_scale = props.scale;
    const pos = props.pos;
    const size = props.size;

    if (!pos) {
        return <></>;
    }

    const bottom = size.height * this_scale;
    const right = size.width * this_scale;

    return <>
            <Rule
                from={{ x: pos.x * this_scale, y: 0 }}
                to={{ x: pos.x * this_scale, y: bottom }}
                theme={props.theme}
            />
            <Rule
                from={{ x: 0, y: pos.y * this_scale }}
                to={{ x: right, y: pos.y * this_scale }}
                theme={props.theme}
            />
        </>;
};

// vertices = this_client.tool.vertices
const Vertices = (props: {vertices: Point[], radius: number, scale: number, theme: Colors}) => {
    return props.vertices.map((vertex, index) => {
        return <Vertex
                key={index}
                pos={vertex}
                radius={props.radius}
                scale={props.scale}
                theme={props.theme}
            />;
    });
};

const Handles = (props: {layer: SingleLayer, showExtras: boolean, scale: number, theme: Colors}) => {
    if (!props.showExtras) {
        return <></>;
    }

    return props.layer.map((segment, segmentId) => {
        return <g key={segmentId}>{segment.vertices.map((vertex, vertexId) => {
            return <Handle key={vertexId}
            pos={vertex} radius={null} scale={props.scale} theme={props.theme}/>
        })}</g>;
    });
};


// from: this_client.cursor.translation.from
// to: this_client.cursor.translation.to
// multi: this_client.cursor.translation.multi
// copy: this_client.cursor.translation.copy
const Translation = (props: {
    from: Point | null | undefined,
    to: Point | null | undefined,
    multi: boolean,
    copy: boolean,
    scale: number,
    theme: Colors
}) => {
    const this_scale = props.scale;
    const theme = props.theme;
    if (!props.to) {
        return <></>;
    }
    if (!props.from) {
        return <></>;
    }
    
    return (
        <line
            x1={props.from.x * this_scale}
            y1={props.from.y * this_scale}
            x2={props.to.x * this_scale}
            y2={props.to.y * this_scale}
            stroke={
                props.multi === true
                    ? theme.b_inv
                    : props.copy === true
                        ? theme.f_med
                        : theme.f_low
            }
            strokeWidth={5}
            strokeDasharray="5,10"
            strokeLinecap="round"
        />
    );
};

// pos = this_client.cursor.pos,
// radius = this_client.tool.style().thickness - 1
const Cursor = (
    props: {pos: Point,
    radius: number,
    scale: number,
    theme: Colors}
) => {
    const pos = props.pos;
    const radius = props.radius;
    const this_scale = props.scale;
    const theme = props.theme;
    
    return (
        <>
            <circle
                cx={Math.abs(pos.x * this_scale)}
                cy={Math.abs(pos.y * this_scale)}
                r={5}
                stroke={theme.background}
                strokeWidth={3}
                fill="none"
            />
            <circle
                cx={Math.abs(pos.x * this_scale)}
                cy={Math.abs(pos.y * this_scale)}
                r={clamp(radius, 5, 100)}
                stroke={theme.f_med}
                strokeWidth={3}
                fill="none"
            />
        </>
    );
};


/*
const operation = this_client.cursor.operation?.cast ?? null;
if (!this_client.tool.canCast(operation)) {
    return <></>;
}
*/
const Preview = (props: {theme: Colors, size: Size, tool_vertices: Point[], operation: SegmentType | null | undefined, scale: number, can_cast: boolean}) => {
    const theme = props.theme;
    const size = props.size;
    const operation = props.operation;
    const tool_vertices = props.tool_vertices;

    if(!props.can_cast) {
        return <></>;
    }

    if (operation === "close") {
        return <></>;
    }
    if (!operation) {
        return <></>;
    }
    const style: SingleStyle = {
        color: theme.f_med,
        thickness: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeLineDash: [5, 15],
    } as SingleStyle;
    const path = generate([
        { vertices: tool_vertices, type: operation },
    ], "zero", { x: 0, y: 0 }, 2, size);

    return <Path path={path} style={style} scale={props.scale}/>
};


const Vertex = (props: {pos: Point, radius: number|null|undefined, scale: number, theme: Colors}) => {
    const pos = props.pos;
    const this_scale = props.scale;
    const radius = props.radius ?? 5;
    const theme = props.theme;

    return (
        <circle
            cx={pos.x * this_scale}
            cy={pos.y * this_scale}
            r={radius}
            fill={theme.f_low}
            stroke={theme.f_med}
            strokeWidth={2}
        />
    );
};

const Rule = (props: { from: Point, to: Point, theme: Colors }) => {
    return <path
        d={`M${props.from.x},${props.from.y} L${props.to.x},${props.to.y}`}
        stroke={props.theme.b_low}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
    />;
};

const Handle = (props: {pos: Point, radius:number | null | undefined, scale: number, theme: Colors}) => {
    const pos = props.pos;
    const radius = props.radius ?? 6;
    const this_scale = props.scale;
    const theme = props.theme;
    return (
        <>
            <circle
                cx={pos.x * this_scale}
                cy={pos.y * this_scale}
                r={radius + 3}
                fill={theme.f_high}
            />
            <circle
                cx={pos.x * this_scale}
                cy={pos.y * this_scale}
                r={radius - 3}
                fill={theme.b_low}
            />
        </>
    );
}

const Path = (props: {path: string, style: SingleStyle, scale: number}) => {
    let body: ReactElement | null = null;

    if (props.style.fill && props.style.fill !== "none") {
        body =
            <path
                d={props.path}
                stroke={props.style.color}
                strokeWidth={props.style.thickness * props.scale}
                strokeLinecap={props.style.strokeLinecap}
                strokeLinejoin={props.style.strokeLinejoin}
                fill={props.style.color}
                strokeDasharray={props.style.strokeLineDash ? props.style.strokeLineDash.join(",") : undefined}
            />;
    }

    // Dash
    const dash =
        <path
            d={props.path}
            stroke={props.style.color}
            strokeWidth={props.style.thickness * props.scale}
            strokeLinecap={props.style.strokeLinecap}
            strokeLinejoin={props.style.strokeLinejoin}
            fill="none"
            strokeDasharray={props.style.strokeLineDash && props.style.strokeLineDash.length > 0 ? props.style.strokeLineDash.join(",") : undefined}
        />;

    return <>{body}{dash}</>;
};

const ClearRect = (props: {size: Size, scale: number, theme: Colors}) => {
    return (
        <rect
            width={props.size.width * props.scale}
            height={props.size.height * props.scale}
            fill={props.theme.background}
        />
    );
}

const SvgLayer = (props: {
    style: SingleStyle,
    path: string
}) => {
    return <path 
        strokeWidth={props.style.thickness.toString()}
        strokeLinecap={props.style.strokeLinecap}
        strokeLinejoin={props.style.strokeLinejoin}
        stroke={props.style.color}
        fill={props.style.fill ?? "none"}
        d={props.path}
        />;
}

export const SvgLayers = (props: {
    layers: RenderingLayer[]
}) => {
    return props.layers.map((layer, index) => {
        return <SvgLayer key={index} path={layer.path} style={layer.style} />
    });
}

// translation_from: this_client.cursor.translation.from
// multi: this_client.cursor.translation.multi
// copy: this_client.cursor.translation.copy
// translation_to={this_client.cursor.translation?.to}
// vertices = this_client.tool.vertices
// cursor_pos = this_client.cursor.pos,
// cursor_radius = this_client.tool.style().thickness - 1
/*
const operation = this_client.cursor.operation?.cast ?? null;
cosnt can_cast = this_client.tool.canCast(operation));
*/
export const Canvas = (props: {
    ref?: React.Ref<SVGSVGElement>,
    showExtras: boolean, size: Size, scale: number
    copy: boolean, multi: boolean
    mirror: Mirror, theme: Colors,
    translation_to: Point | null | undefined,
    translation_from: Point | null | undefined,
    active_layer: SingleLayer,
    layers: RenderingLayer[],
    vertex_radius: number, tool_vertices: Point[]
    cursor_pos: Point, cursor_radius: number,
    can_cast: boolean, operation: SegmentType | null | undefined,
    props?: React.SVGProps<SVGSVGElement>
}) => {
    return <svg id="guide" ref={props.ref}
        width={props.size.width * props.scale}
        height={props.size.height * props.scale}
        {...props.props}
        style={{
            width: props.size.width,
            height: props.size.height
        }}>
            <ClearRect size={props.size} scale={props.scale} theme={props.theme}/>
        <MirrorEl mirror_style={props.mirror} scale={props.scale} size={props.size} theme={props.theme}/>
        <Grid scale={props.scale} size={props.size} theme={props.theme} showExtras={props.showExtras}/>
        <Rulers pos={props.translation_to} scale={props.scale} size={props.size} theme={props.theme}/>
        <SvgLayers layers={props.layers}/>
        <Vertices radius={props.vertex_radius} scale={props.scale} theme={props.theme} vertices={props.tool_vertices} />
        <Handles layer={props.active_layer} scale={props.scale} showExtras={props.showExtras} theme={props.theme}/>
        <Translation from={props.translation_from} to={props.translation_to} scale={props.scale} theme={props.theme} copy={props.copy} multi={props.multi} />
        <Cursor pos={props.cursor_pos} radius={props.cursor_radius} scale={props.scale} theme={props.theme} />
        <Preview can_cast={props.can_cast} operation={props.operation} scale={props.scale} size={props.size} theme={props.theme} tool_vertices={props.tool_vertices} />
    </svg>;
};
