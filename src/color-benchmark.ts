// from 100 rabbits themes repo

import type { Colors } from "./theme";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const _linear = (v: number) => {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

class Color {
  hex: string;
  rgb: Rgb;
  r: number;
  g: number;
  b: number;
  average: number;
  invert: Rgb;

  constructor(hex = "#000000") {
    this.hex = hex;

    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(this.hex);

    this.rgb = {
      r: match ? parseInt(match[1], 16) : 0,
      g: match ? parseInt(match[2], 16) : 0,
      b: match ? parseInt(match[3], 16) : 0,
    };

    this.r = this.rgb.r;
    this.g = this.rgb.g;
    this.b = this.rgb.b;

    this.average = Math.floor((this.rgb.r + this.rgb.g + this.rgb.b) / 3);
    this.invert = {
      r: 255 - this.rgb.r,
      g: 255 - this.rgb.g,
      b: 255 - this.rgb.b,
    };
  }

  contrast(b: Rgb) {
    const lumA =
      0.2126 * _linear(this.r / 256) +
      0.7152 * _linear(this.g / 256) +
      0.0722 * _linear(this.b / 256);
    const lumB =
      0.2126 * _linear(b.r / 256) +
      0.7152 * _linear(b.g / 256) +
      0.0722 * _linear(b.b / 256);
    return lumA > lumB
      ? (lumA + 0.05) / (lumB + 0.05)
      : (lumB + 0.05) / (lumA + 0.05);
  }

  rgba() {
    return "rgba(" + this.rgb.r + "," + this.rgb.g + "," + this.rgb.b + ",1)";
  }

  floats() {
    return { r: this.rgb.r / 255, g: this.rgb.g / 255, b: this.rgb.b / 255 };
  }

  toString() {
    return this.hex;
  }
}

interface Whatev {
  id: string;
  fc: string;
  bc: string;
}

export interface Distribution {
    high: number;
    med: number;
    low: number;
}

const get_matches = (active_theme: Colors) => {
  const a: Whatev[] = [
    { id: "b_inv_f_inv", fc: active_theme.f_inv, bc: active_theme.b_inv },
  ];
  for (const fid_ in active_theme) {
    const fid = fid_ as keyof Colors;
    if (fid.substr(0, 1) !== "f" || fid.indexOf("_inv") > -1) {
      continue;
    }
    const fc = active_theme[fid];
    for (const bid_ in active_theme) {
      const bid = bid_ as keyof Colors;
      if (bid.substr(0, 1) !== "b" || bid.indexOf("_inv") > -1) {
        continue;
      }
      const bc = active_theme[bid];
      a.push({ id: `${bid}_${fid}`, fc: fc, bc: bc });
    }
  }
  return a;
};

export const evaluate_theme = (active_theme: Colors) => {
  const logs = new Array<string>();
  let score = 0;
  let errors = 0;

  const matches = get_matches(active_theme);

  for (const match of matches) {
    const rating = new Color(match.fc).contrast(new Color(match.bc));
    if (rating === 1) {
      logs.push(`Error: Overlap for ${match.fc}/${match.bc}`);
      errors += 1;
    } else if (rating < 1.25) {
      score += 1;
    } else if (rating < 2) {
      score += 2;
    } else {
      score += 5;
    }
  }

  // Order
  const fhigh = new Color(active_theme.f_high).contrast(
    new Color(active_theme.background)
  );
  const fmed = new Color(active_theme.f_med).contrast(
    new Color(active_theme.background)
  );
  const flow = new Color(active_theme.f_low).contrast(
    new Color(active_theme.background)
  );
  const bhigh = new Color(active_theme.b_high).contrast(
    new Color(active_theme.background)
  );
  const bmed = new Color(active_theme.b_med).contrast(
    new Color(active_theme.background)
  );
  const blow = new Color(active_theme.b_low).contrast(
    new Color(active_theme.background)
  );

  if (fmed < flow) {
    logs.push("flip f_med with f_low");
  }
  if (fhigh < fmed) {
    logs.push("flip f_high with f_med");
  }
  if (bmed < blow) {
    logs.push("flip b_med with b_low");
  }
  if (bhigh < bmed) {
    logs.push("flip b_high with b_med");
  }

  // Distribution
  const fsum = fhigh + fmed + flow;

  const foreground: Distribution = {
    high: fhigh / fsum,
    med: fmed / fsum,
    low: flow / fsum,
  };

  const bsum = bhigh + bmed + blow;
  const background: Distribution = {
    high: bhigh / bsum,
    med: bmed / bsum,
    low: blow / bsum,
  };

  const perc = (score / (matches.length * 5)) * 100;
  const cat =
    errors > 0
      ? "fix errors"
      : perc === 100
      ? "perfect"
      : perc > 80
      ? "good"
      : perc > 75
      ? "average"
      : "bad";

  return {
    cat: cat,
    perc: perc,
    score: score,
    max_score: matches.length * 5,
    debug: logs,
    distribution_foreground: foreground,
    distribution_background: background,
  };
};
