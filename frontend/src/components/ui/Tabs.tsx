import {useId, useState} from 'react';
import type {ReactNode} from 'react';
import {Button} from './index';

type Tab = {id: string; label: string; content: ReactNode};
export function Tabs({items, defaultTab, label}: {items: Tab[]; defaultTab: string; label: string}) {
    const [active, setActive] = useState(defaultTab);
    const prefix = useId();
    return <>
        <div role="tablist" aria-label={label} className="flex gap-1 border-b border-slate-200 mb-5">
            {items.map((tab, index) => <Button
                key={tab.id}
                id={`${prefix}-tab-${tab.id}`}
                role="tab"
                aria-selected={active === tab.id}
                aria-controls={`${prefix}-panel-${tab.id}`}
                tabIndex={active === tab.id ? 0 : -1}
                onClick={() => setActive(tab.id)}
                onKeyDown={event => {
                    let target: number;
                    if (event.key === 'ArrowRight') target = (index + 1) % items.length;
                    else if (event.key === 'ArrowLeft') target = (index - 1 + items.length) % items.length;
                    else if (event.key === 'Home') target = 0;
                    else if (event.key === 'End') target = items.length - 1;
                    else return;
                    event.preventDefault();
                    setActive(items[target].id);
                    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                    tabs?.[target]?.focus();
                }}
                className={'px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ' + (active === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')}
            >{tab.label}</Button>)}
        </div>
        {items.map(tab => <div key={tab.id} id={`${prefix}-panel-${tab.id}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${tab.id}`} hidden={active !== tab.id} tabIndex={0}>
            {tab.content}
        </div>)}
    </>;
}
