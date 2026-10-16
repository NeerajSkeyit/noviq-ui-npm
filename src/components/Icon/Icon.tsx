import React from "react";
import { ICON_NODES, type IconName } from "./icons";

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "ref" | "children"> {
  /** Width and height in px. Default 24. */
  size?: number | string;
  /** Default 2. */
  strokeWidth?: number | string;
}

export type IconComponent = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

/** An icon is decorative unless it says otherwise (a label, a title or a role). */
const hasMeaning = (props: IconProps) =>
  Boolean(props["aria-label"] || props["aria-labelledby"] || props.role || (props as { title?: string }).title);

function createIcon(name: IconName): IconComponent {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, strokeWidth = 2, ...rest },
    ref
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={hasMeaning(rest) ? undefined : true}
        {...rest}
      >
        {ICON_NODES[name].map(([tag, attrs], index) => React.createElement(tag, { key: index, ...attrs }))}
      </svg>
    );
  });
  Icon.displayName = name;
  return Icon;
}

const ICONS = Object.fromEntries(
  (Object.keys(ICON_NODES) as IconName[]).map((name) => [name, createIcon(name)])
) as Record<IconName, IconComponent>;

export const {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Inbox,
  MoreHorizontal,
  Pin,
  PinOff,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} = ICONS;
