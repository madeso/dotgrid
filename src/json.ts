export type PrettyOrCompact = "pretty" | "compact";

export const json_from_unknown = (target: unknown, style: PrettyOrCompact) => {
  return JSON.stringify(
    structuredClone(target),
    null,
    style === "pretty" ? 2 : 0
  );
};
