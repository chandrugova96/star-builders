import {useState} from 'react';
import type {InputHTMLAttributes} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {Button, Input} from './index';

export function PasswordInput({className = '', ...props}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
    const [visible, setVisible] = useState(false);
    return <span className="relative block">
        <Input {...props} type={visible ? 'text' : 'password'} className={`input input-password ${className}`}/>
        <Button aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} aria-controls={props.id} disabled={props.disabled}
            className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 rounded-r-lg"
            onClick={event => {event.preventDefault(); setVisible(value => !value);}}>
            {visible ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}
        </Button>
    </span>;
}
