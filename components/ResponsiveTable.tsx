import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type TableHTMLAttributes,
} from "react";
type Element = ReactElement<{
  children?: ReactNode;
  colSpan?: number;
  "data-label"?: ReactNode;
  "data-full"?: boolean;
}>;
const elements = (children: ReactNode) =>
  Children.toArray(children).filter(isValidElement) as Element[];
export default function ResponsiveTable({
  children,
  className = "",
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  const sections = elements(children),
    head = sections.find((x) => x.type === "thead");
  const labels = head
    ? elements(elements(head.props.children)[0]?.props.children).map(
        (x) => x.props.children,
      )
    : [];
  return (
    <table {...props} role="table" className={`responsive-table ${className}`}>
      {sections.map((section) =>
        section.type !== "tbody"
          ? section
          : cloneElement(
              section,
              {},
              elements(section.props.children).map((row) =>
                cloneElement(
                  row,
                  {},
                  elements(row.props.children).map((cell, i) =>
                    cloneElement(cell, {
                      "data-label":
                        typeof labels[i] === "string" ? labels[i] : undefined,
                      "data-full":
                        (cell.props.colSpan || 1) > 1 ? true : undefined,
                    }),
                  ),
                ),
              ),
            ),
      )}
    </table>
  );
}
