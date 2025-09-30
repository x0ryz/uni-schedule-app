import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Card } from './card.jsx';

export function App() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [showArchiveLink, setShowArchiveLink] = useState(false);
    const apiUrl = import.meta.env.VITE_API_URL;
    const startY = useRef(0);
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
            .then((res) => res.json())
            .then((json) => { setData(json); setLoading(false); })
            .catch(() => setLoading(false));
    }, [authChecked]);

    const handleTouchStart = (e) => {
        startY.current = e.touches[0].clientY;
        scrollTop.current = window.scrollY || window.pageYOffset;
        setShowArchiveLink(false);
    };

    const handleTouchMove = (e) => {
        const deltaY = e.touches[0].clientY - startY.current;

        if (deltaY > 25 && scrollTop.current <= 5 && !isCardDragging.current) {
            setShowArchiveLink(true);
        }
    };

    if (loading)
        return (
            <div class="fixed inset-0 flex items-center justify-center z-50">
                <img class="animate-pulse w-[85px]" src="./logo.svg" alt="Logo" />
            </div>
        );

    if (!data || data.length === 0) return <p>No data</p>;

    const grouped = data.reduce((acc, item) => {
        const dateKey = item.full_date.slice(0, -5);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
    }, {});

    return (
        <div
            class="flex flex-col gap-3"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            {showArchiveLink && (
                <div class="px-3 py-3 text-center">
                    <a href="#" class="text-blue-500 font-medium">
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
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

render(<App />, document.getElementById('app'));
