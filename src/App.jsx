import { useState } from 'react';
import EmailGate from '@/components/EmailGate';
import NeuroROI from '@/components/NeuroROI';

function App() {
    const [isUnlocked, setIsUnlocked] = useState(() => {
        // Check if user has already submitted email
        return !!localStorage.getItem('proforma_user_email');
    });

    const [userEmail, setUserEmail] = useState(() => {
        return localStorage.getItem('proforma_user_email') || '';
    });

    const handleUnlock = (email) => {
        setUserEmail(email);
        setIsUnlocked(true);
    };

    if (!isUnlocked) {
        return <EmailGate onUnlock={handleUnlock} />;
    }

    return <NeuroROI />;
}

export default App;
