import {Children, cloneElement, isValidElement} from 'react';
import type {ReactElement, ReactNode} from 'react';

type Element = ReactElement<{children?: ReactNode; colSpan?: number; 'data-label'?: string}>;
function text(node: ReactNode): string {
    return Children.toArray(node).map(child => typeof child === 'string' || typeof child === 'number' ? String(child) : isValidElement(child) ? text((child as Element).props.children) : '').join('');
}
// One semantic table for all widths. Mobile labels come from the real column headings.
export function Table({children}: {children: ReactNode}) {
    const sections = Children.toArray(children);
    const head = sections.find(child => isValidElement(child) && child.type === 'thead') as Element | undefined;
    const headingRow = Children.toArray(head?.props.children).find(isValidElement) as Element | undefined;
    const headings = Children.toArray(headingRow?.props.children).map(child => isValidElement(child) ? text((child as Element).props.children) : '');
    const content = sections.map(section => {
        if (!isValidElement(section) || section.type !== 'tbody') return section;
        return cloneElement(section as Element, {}, Children.toArray((section as Element).props.children).map(row => {
            if (!isValidElement(row) || row.type !== 'tr') return row;
            return cloneElement(row as Element, {}, Children.toArray((row as Element).props.children).map((cell, index) => {
                if (!isValidElement(cell) || cell.type !== 'td' || ((cell as Element).props.colSpan || 1) > 1) return cell;
                return cloneElement(cell as Element, {'data-label': headings[index] || ''});
            }));
        }));
    });
    return <div className="table-wrap responsive-table"><table>{content}</table></div>;
}
