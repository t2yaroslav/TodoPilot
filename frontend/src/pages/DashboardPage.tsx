import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Box, Text, Paper, SimpleGrid, Group, Badge, Loader, Center, Stack } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

interface Project {
  id: string;
  title: string;
  color: string;
}

interface DashboardData {
  user_name: string | null;
  projects: Project[];
  by_project_per_day: Record<string, number | string>[];
  by_priority_per_day: Record<string, number | string>[];
  weekly_by_project: { id: string; title: string; color: string; count: number }[];
  by_weekday: { day: string; count: number }[];
  days: number;
}

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  p4: { label: 'P1 Срочно', color: '#ef4444' },
  p3: { label: 'P2 Высокий', color: '#f97316' },
  p2: { label: 'P3 Средний', color: '#eab308' },
  p1: { label: 'P4 Низкий', color: '#22c55e' },
  p0: { label: 'Без приоритета', color: '#64748b' },
};

const REFRESH_INTERVAL = 60; // seconds

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper
      p="md"
      radius="md"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        height: '100%',
      }}
    >
      <Text size="sm" fw={600} c="dimmed" mb="sm" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
        {title}
      </Text>
      {children}
    </Paper>
  );
}

export function DashboardPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`/api/stats/dashboard/${token}`, { params: { days: 30 } });
      setData(res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchData();
          return REFRESH_INTERVAL;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchData]);

  if (loading) {
    return (
      <Center h="100vh" style={{ backgroundColor: '#0f172a' }}>
        <Loader color="indigo" size="lg" />
      </Center>
    );
  }

  if (error || !data) {
    return (
      <Center h="100vh" style={{ backgroundColor: '#0f172a' }}>
        <Stack align="center" gap="xs">
          <Text size="xl" c="red" fw={600}>Дашборд не найден</Text>
          <Text c="dimmed">{error}</Text>
        </Stack>
      </Center>
    );
  }

  const projectIds = data.projects.map((p) => p.id);
  const projById: Record<string, Project> = {};
  data.projects.forEach((p) => { projById[p.id] = p; });

  // Detect which project keys appear in the data (filter empty ones)
  const activeProjectIds = projectIds.filter((pid) =>
    data.by_project_per_day.some((d) => (d[pid] as number) > 0)
  );
  const hasInbox = data.by_project_per_day.some((d) => (d['inbox'] as number) > 0);

  const axisStyle = { fill: '#94a3b8', fontSize: 11 };
  const gridStyle = { stroke: 'rgba(255,255,255,0.06)' };

  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#f1f5f9',
        padding: '16px 20px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <Group justify="space-between" mb="md" align="center">
        <Group gap="sm">
          <Text size="lg" fw={700} c="indigo.4">TodoPilot</Text>
          <Text size="sm" c="dimmed">·</Text>
          <Text size="sm" fw={500}>{data.user_name}</Text>
          <Badge variant="light" color="indigo" size="sm">Дашборд</Badge>
        </Group>
        <Group gap="xs">
          <IconRefresh size={14} style={{ color: '#475569' }} />
          <Text size="xs" c="dimmed">
            Обновлено: {lastUpdated?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            {' · '}через {countdown}с
          </Text>
        </Group>
      </Group>

      <SimpleGrid cols={2} spacing="md" style={{ height: 'calc(100vh - 80px)' }}>

        {/* Chart 1: Stacked Area — completed tasks by project per day */}
        <ChartCard title="Выполненные задачи по проектам (30 дней)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.by_project_per_day} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {activeProjectIds.map((pid) => (
                  <linearGradient key={pid} id={`grad-${pid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={projById[pid]?.color || '#6366f1'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={projById[pid]?.color || '#6366f1'} stopOpacity={0.05} />
                  </linearGradient>
                ))}
                {hasInbox && (
                  <linearGradient id="grad-inbox" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="date" tick={axisStyle} interval={Math.floor(data.by_project_per_day.length / 6)} />
              <YAxis allowDecimals={false} tick={axisStyle} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {activeProjectIds.map((pid) => (
                <Area
                  key={pid}
                  type="monotone"
                  dataKey={pid}
                  stackId="a"
                  stroke={projById[pid]?.color || '#6366f1'}
                  fill={`url(#grad-${pid})`}
                  strokeWidth={2}
                  name={projById[pid]?.title || pid}
                  dot={false}
                />
              ))}
              {hasInbox && (
                <Area
                  type="monotone"
                  dataKey="inbox"
                  stackId="a"
                  stroke="#94a3b8"
                  fill="url(#grad-inbox)"
                  strokeWidth={2}
                  name="Входящие"
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Bar chart — completed tasks by priority per day */}
        <ChartCard title="Нагрузка по приоритетам (30 дней)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.by_priority_per_day} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="date" tick={axisStyle} interval={Math.floor(data.by_priority_per_day.length / 6)} />
              <YAxis allowDecimals={false} tick={axisStyle} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {/* Stack bottom→top: no priority → low → medium → high → urgent */}
              {(['p0', 'p1', 'p2', 'p3', 'p4'] as const).map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={PRIORITY_META[key].color}
                  name={PRIORITY_META[key].label}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 3: Donut — weekly by project */}
        <ChartCard title="Распределение по проектам (7 дней)">
          {data.weekly_by_project.length === 0 ? (
            <Center h={260}>
              <Text c="dimmed" size="sm">Нет данных за неделю</Text>
            </Center>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.weekly_by_project}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  dataKey="count"
                  nameKey="title"
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {data.weekly_by_project.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number, name: string) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 4: Horizontal bar — by day of week */}
        <ChartCard title="Продуктивность по дням недели (30 дней)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.by_weekday}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={axisStyle} />
              <YAxis type="category" dataKey="day" tick={axisStyle} width={28} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(v: number) => [v, 'Задач']}
              />
              <Bar dataKey="count" name="Задач" radius={[0, 4, 4, 0]}>
                {data.by_weekday.map((entry, idx) => {
                  const max = Math.max(...data.by_weekday.map((d) => d.count));
                  const ratio = max > 0 ? entry.count / max : 0;
                  const r = Math.round(99 + ratio * 100);
                  const g = Math.round(102 + ratio * 50);
                  const b = Math.round(241 - ratio * 50);
                  return <Cell key={idx} fill={`rgb(${r},${g},${b})`} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </SimpleGrid>
    </Box>
  );
}
