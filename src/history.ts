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

export const history_clear = <Container>(history: HistoryI<Container>) => {
  history.a = [];
  history.index = 0;
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

export const history_fork = <Container>(history: HistoryI<Container>) => {
  history.a = history.a.slice(0, history.index + 1);
};

export const history_pop = <Container>(history: HistoryI<Container>) => {
  return history.a.pop();
};

export const history_prev = <Container>(history: HistoryI<Container>) => {
  history.index = clamp(history.index - 1, 0, history.a.length - 1);
  return structuredClone(history.a[history.index]);
};

export const history_next = <Container>(history: HistoryI<Container>) => {
  history.index = clamp(history.index + 1, 0, history.a.length - 1);
  return structuredClone(history.a[history.index]);
};

export class History<Container> {
  index: number;
  a: Array<Container>;

  constructor() {
    this.index = 0;
    this.a = [];
  }

  clear() {
    this.a = [];
    this.index = 0;
  }

  push(data: Container) {
    if (this.index < this.a.length - 1) {
      this.fork();
    }
    this.index = this.a.length;
    this.a = this.a.slice(0, this.index);
    this.a.push(structuredClone(data));

    if (this.a.length > 20) {
      this.a.shift();
    }
  }

  fork() {
    this.a = this.a.slice(0, this.index + 1);
  }

  pop() {
    return this.a.pop();
  }

  prev() {
    this.index = clamp(this.index - 1, 0, this.a.length - 1);
    return structuredClone(this.a[this.index]);
  }

  next() {
    this.index = clamp(this.index + 1, 0, this.a.length - 1);
    return structuredClone(this.a[this.index]);
  }
}
