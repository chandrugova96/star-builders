import { Plus } from 'lucide-react';
import { Button } from './ui';
export const action = (label: string, onClick: () => void) => <Button className="btn-primary flex items-center gap-2" onClick={onClick}><Plus size={16}/>{label}</Button>;
