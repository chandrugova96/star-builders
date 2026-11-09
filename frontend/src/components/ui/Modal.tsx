import {useRef} from 'react';
import type {ReactNode} from 'react';
import {X} from 'lucide-react';
import {Button} from './index';
import {useOverlay} from '../../hooks/useOverlay';
export function Modal({title, onClose, children}: {title: string; onClose: () => void; children: ReactNode}) {
    const dialog = useRef<HTMLDivElement>(null);
    useOverlay(true, dialog, onClose);
    return <div className="modal-backdrop fixed inset-0 bg-slate-950/45 z-50 flex items-center justify-center p-4" onMouseDown={onClose}>
        <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="modal-dialog bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-heading flex items-center justify-between p-5 border-b border-slate-100"><h3 className="font-bold text-lg min-w-0 break-words">{title}</h3><Button onClick={onClose} aria-label="Close dialog" className="modal-close text-slate-400 hover:text-slate-700 shrink-0"><X size={20}/></Button></div>
            <div className="modal-content p-5">{children}</div>
        </div>
    </div>;
}
