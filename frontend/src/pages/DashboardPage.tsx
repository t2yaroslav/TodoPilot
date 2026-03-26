import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Box, Text, Paper, SimpleGrid, Group, Badge, Loader, Center, Stack, Switch } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import dayjs from 'dayjs';

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

/* Priority colors matching TaskItem checkbox circles */
const PRIORITY_META: Record<string, { label: string; color: string }> = {
  p4: { label: 'Важно и срочно', color: '#ff6b6b' },  // red-5
  p3: { label: 'Срочно', color: '#ff922b' },           // orange-5
  p2: { label: 'Важно', color: '#339af0' },             // blue-5
  p1: { label: 'Обычный', color: '#adb5bd' },           // gray-5
  p0: { label: 'Без приоритета', color: '#ced4da' },    // gray-4
};

const REFRESH_INTERVAL = 60; // seconds

const isWeekend = (dateStr: string) => {
  const dow = dayjs(dateStr).day();
  return dow === 0 || dow === 6;
};

const fmtDate = (d: unknown) =>
  typeof d === 'string' && d.length > 5 ? d.slice(5) : String(d);

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper
      p="md"
      radius="md"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
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
  const [workdaysOnly, setWorkdaysOnly] = useState(true);

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

  /* ── Weekday filtering ── */
  const filterDays = useCallback(
    <T extends Record<string, any>>(items: T[]): T[] =>
      workdaysOnly ? items.filter((i) => !isWeekend(i.date as string)) : items,
    [workdaysOnly],
  );

  const projectPerDay = useMemo(
    () => (data ? filterDays(data.by_project_per_day) : []),
    [data, filterDays],
  );

  const priorityPerDay = useMemo(
    () => (data ? filterDays(data.by_priority_per_day) : []),
    [data, filterDays],
  );

  const byWeekday = useMemo(() => {
    if (!data) return [];
    if (!workdaysOnly) return data.by_weekday;
    return data.by_weekday.filter((d) => d.day !== 'Сб' && d.day !== 'Вс');
  }, [data, workdaysOnly]);

  /* Trend: daily total bars + 7-period moving average line */
  const trendData = useMemo(() => {
    if (!data) return [];
    const filtered = filterDays(data.by_project_per_day);
    return filtered.map((day, idx) => {
      const total = Object.entries(day)
        .filter(([k]) => k !== 'date')
        .reduce((s, [, v]) => s + (v as number), 0);

      const winStart = Math.max(0, idx - 6);
      const win = filtered.slice(winStart, idx + 1);
      const avg =
        win.reduce(
          (s, d) =>
            s +
            Object.entries(d)
              .filter(([k]) => k !== 'date')
              .reduce((a, [, v]) => a + (v as number), 0),
          0,
        ) / win.length;

      return {
        date: fmtDate(day.date),
        total,
        avg: Math.round(avg * 10) / 10,
      };
    });
  }, [data, filterDays]);

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
    projectPerDay.some((d) => (d[pid] as number) > 0)
  );
  const hasInbox = projectPerDay.some((d) => (d['inbox'] as number) > 0);
  const hasArchived = projectPerDay.some((d) => (d['archived'] as number) > 0);

  const axisStyle = { fill: '#94a3b8', fontSize: 11 };
  const gridStyle = { stroke: 'rgba(255,255,255,0.06)' };
  const tooltipStyle = {
    contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: '#94a3b8' },
    itemStyle: { color: '#e2e8f0' },
  };

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
          <Switch
            label="Будни"
            checked={workdaysOnly}
            onChange={(e) => setWorkdaysOnly(e.currentTarget.checked)}
            size="sm"
            styles={{
              label: { color: '#94a3b8', paddingLeft: 8 },
            }}
          />
        </Group>
        <Group gap="xs">
          <IconRefresh size={14} style={{ color: '#475569' }} />
          <Text size="xs" c="dimmed">
            Обновлено: {lastUpdated?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            {' · '}через {countdown}с
          </Text>
        </Group>
      </Group>

      <Stack gap="md">
        <SimpleGrid cols={2} spacing="md">

          {/* Chart 1: Stacked Area — completed tasks by project per day */}
          <ChartCard title="Выполненные задачи по проектам (30 дней)">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={projectPerDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                  {hasArchived && (
                    <linearGradient id="grad-archived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#9ca3af" stopOpacity={0.05} />
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
                <XAxis dataKey="date" tick={axisStyle} tickFormatter={fmtDate} interval={Math.floor(projectPerDay.length / 6)} />
                <YAxis allowDecimals={false} tick={axisStyle} />
                <Tooltip {...tooltipStyle} labelFormatter={fmtDate} />
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
                {hasArchived && (
                  <Area
                    type="monotone"
                    dataKey="archived"
                    stackId="a"
                    stroke="#9ca3af"
                    fill="url(#grad-archived)"
                    strokeWidth={2}
                    name="Завершённые"
                    dot={false}
                  />
                )}
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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityPerDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
                <XAxis dataKey="date" tick={axisStyle} tickFormatter={fmtDate} interval={Math.floor(priorityPerDay.length / 6)} />
                <YAxis allowDecimals={false} tick={axisStyle} />
                <Tooltip {...tooltipStyle} labelFormatter={fmtDate} />
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
              <Center h={180}>
                <Text c="dimmed" size="sm">Нет данных за неделю</Text>
              </Center>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.weekly_by_project}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
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
                    {...tooltipStyle}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Chart 4: Horizontal bar — by day of week */}
          <ChartCard title="Продуктивность по дням недели (30 дней)">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={byWeekday}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={axisStyle} />
                <YAxis type="category" dataKey="day" tick={axisStyle} width={28} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [v, 'Задач']}
                />
                <Bar dataKey="count" name="Задач" radius={[0, 4, 4, 0]}>
                  {byWeekday.map((entry, idx) => {
                    const max = Math.max(...byWeekday.map((d) => d.count));
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

        {/* Chart 5: Full-width productivity trend */}
        <ChartCard title="Тренд продуктивности — скользящее среднее за 7 дней">
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="date" tick={axisStyle} interval={Math.floor(trendData.length / 8)} />
              <YAxis allowDecimals={false} tick={axisStyle} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar
                dataKey="total"
                fill="url(#grad-trend)"
                stroke="#6366f1"
                strokeWidth={1}
                name="Выполнено задач"
                radius={[2, 2, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#e64980"
                strokeWidth={2}
                dot={false}
                name="Среднее (7 дн.)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </Stack>
    </Box>
  );
}
