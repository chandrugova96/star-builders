import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

export function ScrollToTop() {
    const {key} = useLocation();
    useEffect(() => {
        const previous = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        return () => {window.history.scrollRestoration = previous;};
    }, []);
    useEffect(() => {window.scrollTo({top: 0, left: 0, behavior: 'instant'});}, [key]);
    return null;
}
