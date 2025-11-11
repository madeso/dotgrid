import type { Colors } from "./theme";

const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const SvgButton = (props: {
    icon: string;
    name: string;
    isEnabled?: boolean;
    onClick: () => void;
    onEnter?: ()=>void;
    onLeave?: ()=>void;
    // todo(Gustav): force theme
    theme?: Colors;
    is_selected?: boolean;
}) => {
    const th = props.theme;
    const inv = props.is_selected ?? false;
    const bkg = th ? (inv ? th.b_inv : th.b_low) : 'white';
    const fg = th ? (inv ? th.f_inv : th.f_low) : 'black';

    // title: capitalize(name),
    return <svg
        className={`icon ${props.isEnabled??true?"enabled":"disabled"}`}
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
            <rect fill={bkg} width={300} height={300} rx={15} ry={15}>
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
