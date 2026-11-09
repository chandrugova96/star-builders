import {Card} from '../../components/ui';
import {SectionHead} from '../../components/SectionHead';
export function SupervisorWorkspace({attendance = false}: {attendance?: boolean}) {
    return <><SectionHead title={attendance ? 'Daily Attendance' : 'Site Management'} subtitle="Your assigned sites and attendance."/><Card className="p-6"><p className="text-sm muted">Assigned site records will be available once site access is connected. Contact your administrator for assignments.</p></Card></>;
}
