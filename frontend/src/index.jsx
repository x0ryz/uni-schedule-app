import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Card } from './card.jsx';

export function App() {
    const [data, setData] = useState([]);
    const [hiddenData, setHiddenData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [showArchiveLink, setShowArchiveLink] = useState(false);
    const [currentView, setCurrentView] = useState('schedule'); // 'schedule' | 'hidden'
    const apiUrl = import.meta.env.VITE_API_URL;

    const startY = useRef(0);
    const lastY = useRef(0);
    const scrollTop = useRef(0);
    const isCardDragging = useRef(false);

    useEffect(() => {
        if (!window.Telegram?.WebApp) return;
        const initData = window.Telegram.WebApp.initData;
        fetch(`${apiUrl}/auth`, { method: 'POST', headers: { Authorization: `Bearer ${initData}` } })
            .then(() => setAuthChecked(true))
            .catch(() => setAuthChecked(true));
    }, []);

    useEffect(() => {
        if (!authChecked || !window.Telegram?.WebApp) return;
        const initData = window.Telegram.WebApp.initData;
        fetch(`${apiUrl}/schedule`, { headers: { Authorization: `Bearer ${initData}` } })
            .then(res => res.json())
            .then(json => { setData(json); setLoading(false); })
            .catch(() => setLoading(false));
    }, [authChecked]);

    // Керування Back Button
    useEffect(() => {
        if (!window.Telegram?.WebApp) return;

        const backButton = window.Telegram.WebApp.BackButton;

        const handleBackButton = () => {
            setCurrentView('schedule');
            setShowArchiveLink(false);
        };

        // Очищуємо попередні слухачі перед додаванням нового
        backButton.offClick(handleBackButton);

        if (currentView === 'hidden') {
            backButton.onClick(handleBackButton);
            backButton.show();
        } else {
            backButton.hide();
        }

        return () => {
            backButton.offClick(handleBackButton);
        };
    }, [currentView]);

    const loadHiddenSubjects = () => {
        if (!window.Telegram?.WebApp) return;
        const initData = window.Telegram.WebApp.initData;
        setLoading(true);
        fetch(`${apiUrl}/get_hidden_subjects`, { headers: { Authorization: `Bearer ${initData}` } })
            .then(res => res.json())
            .then(json => { 
                setHiddenData(json.hidden_subjects); 
                setLoading(false); 
            })
            .catch(() => setLoading(false));
    };

    const handleDelete = (itemToDelete) => {
        if (currentView === 'schedule') {
            setData(prevData => prevData.filter(item => {
                const disciplineMatch = item.discipline === itemToDelete.discipline;
                const teacherMatch = (item.employee_short || '') === (itemToDelete.employee_short || '');
                const typeMatch = item.study_type === itemToDelete.study_type;
                const subgroupMatch = (item.subgroup || null) === (itemToDelete.subgroup || null);
                
                return !(disciplineMatch && teacherMatch && typeMatch && subgroupMatch);
            }));
        } else {
            setHiddenData(prevData => prevData.filter(item => item.id !== itemToDelete.id));
        }
    };

    const handleTouchStart = (e) => {
        startY.current = e.touches[0].clientY;
        lastY.current = startY.current;
        scrollTop.current = window.scrollY || window.pageYOffset;
    };

    const handleTouchMove = (e) => {
        if (currentView === 'hidden') return; // Не показувати меню архіва на сторінці прихованих
        
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - lastY.current;

        if (deltaY > 5 && scrollTop.current <= 5 && !isCardDragging.current) {
            setShowArchiveLink(true);
        }

        if (deltaY < -5) {
            setShowArchiveLink(false);
        }

        lastY.current = currentY;
    };

    const handleTouchEnd = () => {};

    if (loading) {
        if (currentView === 'hidden') {
            return (
                <div class="flex flex-col gap-3 mt-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} class="h-[120px] bg-section px-3 pt-3 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            );
        }

        return (
            <div class="flex flex-col gap-4">
                {['Понеділок', 'Вівторок'].map((day, index) => (
                    <div key={index} class="flex flex-col gap-3">
                        <div class="mx-3 mt-3 h-5 w-26 bg-section px-3 pt-3 rounded animate-pulse"></div>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} class="h-[185px] bg-section rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    if (currentView === 'hidden') {
        return (
            <div class="flex flex-col gap-3 mt-3">
                {hiddenData.length === 0 ? (
                    <p class="text-center text-subtitle mt-10">Немає прихованих предметів</p>
                ) : (
                    hiddenData.map((item, i) => (
                        <Card 
                            key={i} 
                            {...item} 
                            apiUrl={apiUrl} 
                            isCardDragging={isCardDragging}
                            onDelete={() => handleDelete(item)}
                            isHiddenView={true}
                        />
                    ))
                )}
            </div>
        );
    }

    const grouped = data.reduce((acc, item) => {
        const dateKey = item.full_date.slice(0, -5);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
    }, {});

    return (
        <div
            class="flex flex-col"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {showArchiveLink && (
                <div class="px-3 py-2 text-center">
                    <a 
                        href="#" 
                        class="text-link text-sm font-medium"
                        onClick={(e) => { 
                            e.preventDefault(); 
                            setCurrentView('hidden'); 
                            loadHiddenSubjects(); 
                        }}
                    >
                        Приховані предмети
                    </a>
                </div>
            )}

            {Object.entries(grouped).map(([date, items]) => (
                <div key={date} class="flex flex-col gap-3">
                    <h2 class="px-3 pt-3 text-sm font-medium text-header">
                        {items[0].week_day}, {date}
                    </h2>
                    {items.map((item, i) => (
                        <Card
                            key={i}
                            {...item}
                            apiUrl={apiUrl}
                            isCardDragging={isCardDragging}
                            onDelete={() => handleDelete(item)}
                            isHiddenView={false}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

render(<App />, document.getElementById('app'));