import { useState, useRef } from 'preact/hooks';

export function Card({
    discipline,
    employee_short,
    study_time,
    study_time_begin,
    study_time_end,
    cabinet,
    study_type,
    subgroup,
    onDelete,
    apiUrl,
}) {
    const [dragX, setDragX] = useState(0);
    const [dragging, setDragging] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const direction = useRef(null);
    const requestSent = useRef(false);

    const handleTouchStart = (e) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        direction.current = null;
        setDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!dragging) return;

        const deltaX = e.touches[0].clientX - startX.current;
        const deltaY = e.touches[0].clientY - startY.current;

        // Визначаємо напрямок лише один раз
        if (!direction.current) {
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
                direction.current = 'horizontal'; // тільки справа наліво
            } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
                direction.current = 'vertical';
            } else {
                return; // невизначений, нічого не робимо
            }
        }

        if (direction.current === 'horizontal') {
            setDragX(Math.min(0, deltaX));
            e.preventDefault();
        }

        if (direction.current === 'vertical') {
            setDragX(0);
        }
    };

    const handleTouchEnd = async () => {
        if (direction.current === 'horizontal' && dragX <= -150 && !requestSent.current) {
            requestSent.current = true;
            try {
                const initData = window.Telegram?.WebApp?.initData;
                const res = await fetch(`${apiUrl}/hide_subject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${initData}`,
                    },
                    body: JSON.stringify({
                        name: discipline,
                        teacher: employee_short || '',
                        study_type,
                        subgroup: subgroup || null,
                    }),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                onDelete && onDelete();
            } catch (err) {
                console.error('Failed to hide subject:', err);
                alert('Не вдалося приховати предмет');
            }
        }

        setDragX(0);
        setDragging(false);
        direction.current = null;
        requestSent.current = false;
    };

    return (
        <div class="relative w-full">
            <div class="absolute inset-0 flex items-center justify-end pr-10 bg-red-500 rounded-xl z-0">
                <span class="text-white font-bold text-xl">🗑️</span>
            </div>

            <div
                class="relative rounded-xl p-5 flex flex-col gap-1 shadow bg-section z-10"
                style={{
                    transform: `translateX(${dragX}px)`,
                    transition: dragging ? 'none' : 'transform 0.3s ease',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <h2 class="text-base font-medium text-title">{discipline}</h2>
                <p class="text-sm text-subtitle">{employee_short || 'Викладач невідомий'}</p>
                <p class="text-sm text-subtitle">
                    🕑 {study_time} ({study_time_begin} – {study_time_end})
                </p>
                <p class="text-sm text-subtitle">📍 {cabinet || 'TBA'}</p>
                <p class="text-sm text-subtitle">📘 {study_type}</p>
            </div>
        </div>
    );
}
