export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Mirror = "none" | "horizontal" | "vertical" | "diagonal";

export type SegmentType =
  | "arc_c_full"
  | "arc_c"
  | "arc_r_full"
  | "arc_r"
  | "bezier"
  | "close"
  | "line";

export type Vertices = Array<Point>;

export interface Segment {
  vertices: Vertices;
  type: SegmentType;
}
export type SingleLayer = Array<Segment>;
export type Layers = Array<SingleLayer>;

export interface RenderingLayer {
  style: SingleStyle;
  path: string;
}

export interface SingleStyle {
  thickness: number;
  strokeLinecap: CanvasLineCap;
  strokeLinejoin: CanvasLineJoin;
  color: string;
  fill?: string;
  mirror_style: Mirror;
  transform: string;
  strokeLineDash?: Array<number>;
}
