function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

export interface HistoryI<Container> {
  index: number;
  a: Array<Container>;
}

export const history_constructor = <Container>(): HistoryI<Container> => {
  return {
    index: 0,
    a: [],
  };
};

export const history_push = <Container>(
  history: HistoryI<Container>,
  data: Container
) => {
  if (history.index < history.a.length - 1) {
    history_fork(history);
  }
  history.index = history.a.length;
  history.a = history.a.slice(0, history.index);
  history.a.push(structuredClone(data));

  if (history.a.length > 20) {
    history.a.shift();
  }
};

const history_fork = <Container>(history: HistoryI<Container>) => {
  history.a = history.a.slice(0, history.index + 1);
};

export const history_prev = <Container>(history: HistoryI<Container>) => {
  history.index = clamp(history.index - 1, 0, history.a.length - 1);
  return structuredClone(history.a[history.index]);
};

export const history_next = <Container>(history: HistoryI<Container>) => {
  history.index = clamp(history.index + 1, 0, history.a.length - 1);
  return structuredClone(history.a[history.index]);
};

export const history_can_prev = <Container>(history: HistoryI<Container>) => {
  const next_index = clamp(history.index - 1, 0, history.a.length - 1);
  return next_index !== history.index;
};

export const history_can_next = <Container>(history: HistoryI<Container>) => {
  const next_index = clamp(history.index + 1, 0, history.a.length - 1);
  return next_index !== history.index;
};
