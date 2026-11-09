import { useApplication } from './hooks/useApplication';
import { Sidebar, Header } from './components/layout/AppLayout';
import { FeatureDialogs } from './components/FeatureDialogs';
import {Button} from './components/ui';
import {X} from 'lucide-react';
import {ScrollToTop} from './routes/ScrollToTop';
import {AppRoutes} from './routes/AppRoutes';
import {Route, Routes} from 'react-router-dom';
import {useAuth} from './features/auth/AuthProvider';
import {AuthGate} from './features/auth/AuthGate';
import {Login} from './features/auth/Login';
export default function App() {
    const auth = useAuth();
    return <><ScrollToTop/><Routes><Route path="/login" element={<Login/>}/><Route path="*" element={<AuthGate><Workspace key={auth.user?.id}/></AuthGate>}/></Routes></>;
}
function Workspace() {
    const model = useApplication();
    const { notice, setNotice } = model;
    return <div className="min-h-screen flex"><Sidebar model={model}/><div className="lg:ml-[246px] min-w-0 flex-1"><Header model={model}/>
    <main className="px-5 pb-5 pt-3 lg:px-9 lg:pb-9 lg:pt-4 max-w-[1560px] mx-auto">{notice && <div className="mb-5 bg-blue-50 text-blue-700 border border-blue-100 p-3 rounded-lg flex justify-between text-sm">{notice}<Button onClick={() => setNotice('')}><X size={16}/></Button></div>}
    {model.dataLoading&&<p role="status" className="text-sm muted mb-4">Loading records…</p>}{model.dataError&&<div role="alert" className="text-sm text-red-700 mb-4">{model.dataError} <Button className="text-blue-600 font-semibold" onClick={model.refreshData}>Retry records</Button></div>}<AppRoutes model={model}/>
    </main></div>
    <FeatureDialogs model={model}/></div>;
}
