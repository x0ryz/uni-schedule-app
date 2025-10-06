import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Card } from './card.jsx';

export function App() {
    const [data, setData] = useState([]);
    const [hiddenData, setHiddenData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showArchiveLink, setShowArchiveLink] = useState(false);
    const [currentView, setCurrentView] = useState('schedule');
    const [needsGroup, setNeedsGroup] = useState(false);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [isSettingGroup, setIsSettingGroup] = useState(false);
    const apiUrl = import.meta.env.VITE_API_URL;

    const startY = useRef(0);
    const lastY = useRef(0);
    const scrollTop = useRef(0);
    const isCardDragging = useRef(false);

    const fetchGroups = async () => {
        try {
            const res = await fetch(`${apiUrl}/groups`);
            const json = await res.json();
            setGroups(json);
        } catch (err) {
            console.error('Помилка завантаження груп', err);
        }
    };

    const handleSetGroup = async () => {
        if (!selectedGroup) return;
        
        setIsSettingGroup(true);
        const initData = window.Telegram.WebApp.initData;
        
        try {
            const res = await fetch(`${apiUrl}/set-group`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${initData}`
                },
                body: JSON.stringify({ group_id: selectedGroup })
            });

            if (res.ok) {
                setNeedsGroup(false);
                fetchSchedule();
            } else {
                console.error('Помилка встановлення групи');
            }
        } catch (err) {
            console.error('Помилка встановлення групи', err);
        } finally {
            setIsSettingGroup(false);
        }
    };

    const fetchSchedule = async () => {
        if (!window.Telegram?.WebApp) return;
        setLoading(true);
        const initData = window.Telegram.WebApp.initData;
        try {
            const res = await fetch(`${apiUrl}/schedule`, { 
                headers: { Authorization: `Bearer ${initData}` } 
            });
            
            if (res.status === 428) {
                setNeedsGroup(true);
                fetchGroups();
                setLoading(false);
                return;
            }
            
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error('Помилка завантаження розкладу', err);
        } finally {
            setLoading(false);
        }
    };

    const loadHiddenSubjects = async () => {
        if (!window.Telegram?.WebApp) return;
        setLoading(true);
        const initData = window.Telegram.WebApp.initData;
        try {
            const res = await fetch(`${apiUrl}/get_hidden_subjects`, { 
                headers: { Authorization: `Bearer ${initData}` } 
            });
            const json = await res.json();
            setHiddenData(json);
        } catch (err) {
            console.error('Помилка завантаження прихованих предметів', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentView === 'schedule') {
            fetchSchedule();
        }
    }, [currentView]);

    useEffect(() => {
        if (!window.Telegram?.WebApp) return;

        const backButton = window.Telegram.WebApp.BackButton;

        const handleBackButton = () => {
            setCurrentView('schedule');
            setShowArchiveLink(false);
        };

        backButton.offClick();

        if (currentView === 'hidden') {
            backButton.onClick(handleBackButton);
            backButton.show();
        } else {
            backButton.hide();
        }

        return () => backButton.offClick();
    }, [currentView]);

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
        if (currentView === 'hidden') return;

        const currentY = e.touches[0].clientY;
        const deltaY = currentY - lastY.current;

        if (deltaY > 5 && scrollTop.current <= 5 && !isCardDragging.current) {
            setShowArchiveLink(true);
        }
        if (deltaY < -5) setShowArchiveLink(false);

        lastY.current = currentY;
    };

    const handleTouchEnd = () => { };

    if (needsGroup) {
        return (
            <div class="fixed inset-0 bg-bg flex flex-col">
                <div class="flex-1 flex flex-col items-center justify-center px-4 pb-24">
                    <div class="mb-6">
                        <img src="./logo.svg" alt="" />
                    </div>

                    
                    <h1 class="text-2xl font-semibold text-title mb-2 text-center">
                        Виберіть групу
                    </h1>
                    <p class="text-subtitle text-center mb-8 text-sm max-w-xs">
                        Оберіть свою групу, щоб переглядати актуальний розклад занять
                    </p>
                    
                    <div class="w-full max-w-md">
                        <label class="block text-xs font-medium text-header mb-2 px-1">
                            Група
                        </label>
                        <div class="relative">
                            <select
                                class="w-full bg-section text-accent border-0 rounded-xl px-4 py-3.5 pr-10 outline-none appearance-none text-base transition-all focus:bg-section/80"
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                disabled={isSettingGroup}
                            >
                                <option value="" disabled>Оберіть групу зі списку</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.site_id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                            <svg class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="fixed bottom-0 left-0 right-0 p-4 border-t border-header/10">
                    <button
                        class={`w-full py-3.5 rounded-xl font-semibold transition-all text-base ${
                            selectedGroup && !isSettingGroup
                                ? 'bg-button text-white active:scale-[0.98]'
                                : 'bg-section text-subtitle cursor-not-allowed'
                        }`}
                        onClick={handleSetGroup}
                        disabled={!selectedGroup || isSettingGroup}
                    >
                        {isSettingGroup ? (
                            <span class="flex items-center justify-center gap-2">
                                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Збереження...
                            </span>
                        ) : 'Продовжити'}
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return currentView === 'hidden' ? (
            <div class="flex flex-col gap-3 mt-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} class="h-[120px] bg-section px-3 pt-3 rounded-xl animate-pulse"></div>
                ))}
            </div>
        ) : (
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