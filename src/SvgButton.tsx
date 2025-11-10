const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const SvgButton = (props: {
    icon: string
    name: string
    onClick: () => void;
    onEnter?: ()=>void;
    onLeave?: ()=>void;
}) => {
    // title: capitalize(name),
    return <svg
        className="icon"
        viewBox="0 0 300 300"
        onMouseOver={() => {
            if(!props.onEnter) return;
            props.onEnter();
        }}
        onMouseOut={() => {
            if(!props.onLeave) return
            props.onLeave();
        }}
        onMouseUp={() => {
            props.onClick();
        }}
        >
            <rect fill="white" width={300} height={300} rx={15} ry={15}>
                <title>{capitalize(props.name)}</title>
            </rect>
            <path className="icon_path" d={props.icon}
                stroke="black"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={12}
            />
    </svg>;
}
