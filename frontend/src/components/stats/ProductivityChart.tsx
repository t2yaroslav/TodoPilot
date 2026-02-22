import { useEffect, useState } from 'react';
import { Paper, SegmentedControl, Text, Stack } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getProductivity, getProjects } from '@/api/client';

export function ProductivityChart() {
  const [data, setData] = useState<any[]>([]);
  const [period, setPeriod] = useState('7');
  const [projects, setProjects] = useState<Record<string, { title: string; color: string }>>({});

  useEffect(() => {
    const load = async () => {
      const [statsRes, projRes] = await Promise.all([getProductivity(parseInt(period)), getProjects()]);
      setData(statsRes.data);
      const projMap: Record<string, { title: string; color: string }> = {};
      projRes.data.forEach((p: any) => {
        projMap[p.id] = { title: p.title, color: p.color };
      });
      setProjects(projMap);
    };
    load();
  }, [period]);

  // Collect all project IDs from breakdown
  const allProjectIds = new Set<string>();
  data.forEach((d) => {
    Object.keys(d.breakdown || {}).forEach((k) => allProjectIds.add(k));
  });

  const chartData = data.map((d) => {
    const entry: Record<string, any> = { date: d.date.slice(5), total: d.count };
    allProjectIds.forEach((pid) => {
      entry[pid] = d.breakdown?.[pid] || 0;
    });
    return entry;
  });

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <SegmentedControl
          value={period}
          onChange={setPeriod}
          data={[
            { label: 'Неделя', value: '7' },
            { label: '2 недели', value: '14' },
            { label: 'Месяц', value: '30' },
            { label: '3 месяца', value: '90' },
          ]}
          size="xs"
        />

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} name="Всего" dot={false} />
            {Array.from(allProjectIds).map((pid) => (
              <Line
                key={pid}
                type="monotone"
                dataKey={pid}
                stroke={projects[pid]?.color || '#888'}
                strokeWidth={1.5}
                name={projects[pid]?.title || 'Входящие'}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Stack>
    </Paper>
  );
}
