import {useEffect, useRef} from 'react';
import type {RefObject} from 'react';
const overlays: HTMLElement[] = [];
let previousOverflow = '';

export function useOverlay(active: boolean, root: RefObject<HTMLElement | null>, onClose: () => void) {
    const close = useRef(onClose); close.current = onClose;
    useEffect(() => {
        const element = root.current;
        if (!active || !element) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        if (!overlays.length) {previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';}
        overlays.push(element);
        const focusable = () => Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(item => !item.closest('[hidden]'));
        (focusable()[0] || element).focus();
        function keyboard(event: KeyboardEvent) {
            if (overlays[overlays.length - 1] !== element || event.defaultPrevented) return;
            if (event.key === 'Escape') {
                if ((event.target as HTMLElement)?.closest('[role="menu"]')) return;
                event.preventDefault(); close.current();
            }
            if (event.key === 'Tab') {
                const items = focusable(); const first = items[0], last = items[items.length - 1];
                if (!first) {event.preventDefault(); element!.focus(); return;}
                if (event.shiftKey && (document.activeElement === first || !element!.contains(document.activeElement))) {event.preventDefault(); last.focus();}
                else if (!event.shiftKey && (document.activeElement === last || !element!.contains(document.activeElement))) {event.preventDefault(); first.focus();}
            }
        }
        document.addEventListener('keydown', keyboard);
        return () => {
            document.removeEventListener('keydown', keyboard);
            const index = overlays.lastIndexOf(element); if (index !== -1) overlays.splice(index, 1);
            if (!overlays.length) document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [active, root]);
}
