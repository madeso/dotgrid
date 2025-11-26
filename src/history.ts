function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

export interface History<Container> {
  index: number;

  // todo(Gustav): rename to something better?
  a: Array<Container>;
}

export const history_constructor = <Container>(): History<Container> => {
  return {
    index: 0,
    a: [],
  };
};

export const history_push = <Container>(
  history: History<Container>,
  data: Container
) => {
  if (history.index < history.a.length - 1) {
    history.a = history.a.slice(0, history.index + 1);
  }
  history.index = history.a.length;
  history.a = history.a.slice(0, history.index);
  history.a.push(structuredClone(data));

  if (history.a.length > 20) {
    history.a.shift();
  }
};

export const history_undo = <Container>(history: History<Container>) => {
  history.index = clamp(history.index - 1, 0, history.a.length - 1);
  return structuredClone(history.a[history.index]);
};

export const history_redo = <Container>(history: History<Container>) => {
  history.index = clamp(history.index + 1, 0, history.a.length - 1);
  return structuredClone(history.a[history.index]);
};

export const history_can_undo = <Container>(history: History<Container>) => {
  const next_index = clamp(history.index - 1, 0, history.a.length - 1);
  return next_index !== history.index;
};

export const history_can_redo = <Container>(history: History<Container>) => {
  const next_index = clamp(history.index + 1, 0, history.a.length - 1);
  return next_index !== history.index;
};
