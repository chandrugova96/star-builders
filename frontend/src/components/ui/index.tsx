import { cloneElement, useId } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, HTMLAttributes, ReactElement, Ref } from 'react';
// These wrappers retain V1's native elements and CSS classes.
export function Button({ type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {ref?: Ref<HTMLButtonElement>}) { return <button type={type} {...props}/>; }
export function Input({ className = 'input', ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={className} {...props}/>; }
type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'onChange' | 'min' | 'max' | 'step'> & {
    onValueChange: (value: string) => void;
    allowDecimal?: boolean;
    inputMode?: 'decimal' | 'numeric' | 'tel';
};
// Controlled text input: no native spinner, wheel increments or exponent notation.
// Reject invalid edits/pastes rather than silently changing their numeric meaning.
export function NumericInput({onValueChange, allowDecimal = true, inputMode = allowDecimal ? 'decimal' : 'numeric', ...props}: NumericInputProps) {
    return <Input {...props} type="text" inputMode={inputMode} onChange={event => {
        const value = event.target.value;
        const valid = allowDecimal ? /^\d*(?:\.\d*)?$/.test(value) : /^\d*$/.test(value);
        if (valid) onValueChange(value);
    }}/>;
}
export function DatePicker(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) { return <Input {...props} type="date"/>; }
export function Select({ className = '', multiple, size, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    const dropdown = !multiple && (!size || size === 1);
    return <select {...props} multiple={multiple} size={size} className={['input', dropdown ? 'select-control' : '', className].filter(Boolean).join(' ')}/>;
}
export function FormField({ label, children }: {
    label: string;
    children: ReactElement<{
        id?: string;
    }>;
}) {
    const generatedId = useId();
    const id = children.props.id || generatedId;
    return <label htmlFor={id} className="block mb-4"><span className="field-label">{label}</span>{cloneElement(children, { id })}</label>;
}
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={'panel ' + className} {...props}/>; }
export {Table} from './Table';
export { Modal } from './Modal';
export { Badge } from './Badge';

export {Tabs} from './Tabs';

export {PasswordInput} from './PasswordInput';
