import type { Colors } from "./theme";

const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const select_color = (theme: Colors, is_selected: boolean, is_enabled: boolean): {fg: string, bg: string} => {
    if(!is_enabled) return {
        fg: theme.f_low,
        bg: theme.b_low
    };

    if(is_selected) return {
        fg: theme.f_inv,
        bg: theme.b_inv
    };

    return {
        fg: theme.f_med,
        bg: theme.b_med
    };
}

export const SvgButton = (props: {
    icon: string;
    name: string;
    isEnabled?: boolean;
    onClick: () => void;
    onEnter?: ()=>void;
    onLeave?: ()=>void;
    theme: Colors;
    is_selected?: boolean;
}) => {
    const {fg,bg} = select_color(props.theme, props.is_selected ?? false, props.isEnabled ?? true);

    // title: capitalize(name),
    return <svg
        className={'icon'}
        viewBox="0 0 300 300"
        onMouseOver={() => {
            if(!props.onEnter) return;
            props.onEnter();
        }}
        onMouseOut={() => {
            if(!props.onLeave) return
            props.onLeave();
        }}
        onMouseUp={(ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            props.onClick();
        }}
        >
            <rect fill={bg} width={300} height={300} rx={15} ry={15}>
                <title>{capitalize(props.name)}</title>
            </rect>
            <path className="icon_path" d={props.icon}
                stroke={fg}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={12}
            />
    </svg>;
}
