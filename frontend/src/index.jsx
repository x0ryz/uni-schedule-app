import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export function App() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState(null);
	const [authChecked, setAuthChecked] = useState(false);

	const apiUrl = import.meta.env.VITE_API_URL;

	useEffect(() => {
		if (window.Telegram && window.Telegram.WebApp) {
			const initData = window.Telegram.WebApp.initData;

			fetch(`${apiUrl}/auth`, {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${initData}` },
			})
				.then((res) => res.json())
				.then((json) => {
					if (json.ok) {
						setUser({ username: json.username });
					} else {
						console.error('Auth error:', json);
					}
					setAuthChecked(true);
				})
				.catch((err) => {
					console.error('Auth request failed:', err);
					setAuthChecked(true);
				});
		}
	}, []);

	useEffect(() => {
		if (!authChecked) return;

		fetch(`${apiUrl}/schedule`)
			.then((res) => res.json())
			.then((json) => {
				setData(json);
				setLoading(false);
			})
			.catch((err) => {
				console.error('Error fetching:', err);
				setLoading(false);
			});
	}, [authChecked]);

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
		<>
			{Object.entries(grouped).map(([date, items]) => (
				<div key={date} class="flex flex-col gap-3">
					<h2 class="px-3 pt-3 text-sm font-medium text-header">
						{items[0].week_day}, {date}
					</h2>
					{items.map((item, i) => (
						<Card key={i} {...item} />
					))}
				</div>
			))}
		</>
	);
}

function Card(props) {
	return (
		<div class="rounded-xl p-5 flex flex-col gap-1 shadow bg-section">
			<h2 class="text-base font-medium text-title">{props.discipline}</h2>
			<p class="text-sm text-subtitle">
				{props.employee_short || 'Викладач невідомий'}
			</p>
			<p class="text-sm text-subtitle">
				🕑 {props.study_time} ({props.study_time_begin} – {props.study_time_end})
			</p>
			<p class="text-sm text-subtitle">📍 {props.cabinet || 'TBA'}</p>
			<p class="text-sm text-subtitle">📘 {props.study_type}</p>
		</div>
	);
}

render(<App />, document.getElementById('app'));
