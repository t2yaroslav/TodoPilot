import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Title, Group, Switch, Stack, Paper, Text, SimpleGrid,
  Center, Loader, Box,
} from '@mantine/core';
import {
  BarChart, Bar, AreaChart, Area, ComposedChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getDashboard } from '@/api/client';
import dayjs from 'dayjs';

/* ── Priority colors matching TaskItem checkbox circles ── */
const PRIORITY_COLORS: Record<string, string> = {
  p4: '#ff6b6b', // red-5 — urgent + important
  p3: '#ff922b', // orange-5 — urgent
  p2: '#339af0', // blue-5 — important
  p1: '#adb5bd', // gray-5
  p0: '#ced4da', // gray-4
};

const PRIORITY_LABELS: Record<string, string> = {
  p4: 'Важно и срочно',
  p3: 'Срочно',
  p2: 'Важно',
  p1: 'Обычный',
  p0: 'Без приоритета',
};

/* ── Helpers ── */
const isWeekend = (dateStr: string) => {
  const dow = dayjs(dateStr).day(); // 0=Sun, 6=Sat
  return dow === 0 || dow === 6;
};

const fmtDate = (d: unknown) =>
  typeof d === 'string' && d.length > 5 ? d.slice(5) : String(d);

/* ── Component ── */
export function DashboardPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workdaysOnly, setWorkdaysOnly] = useState(true);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await getDashboard(token);
        setData(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  const filterDays = useCallback(
    <T extends { date: string }>(items: T[]): T[] =>
      workdaysOnly ? items.filter((i) => !isWeekend(i.date)) : items,
    [workdaysOnly],
  );

  /* ── Derived data ── */
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
    return data.by_weekday.filter(
      (d: any) => d.day !== 'Сб' && d.day !== 'Вс',
    );
  }, [data, workdaysOnly]);

  /* Trend: daily total bars + 7‑period moving average line */
  const trendData = useMemo(() => {
    if (!data) return [];
    const filtered = filterDays(data.by_project_per_day as any[]);
    return filtered.map((day: any, idx: number) => {
      const total = Object.entries(day)
        .filter(([k]) => k !== 'date')
        .reduce((s, [, v]) => s + (v as number), 0);

      const winStart = Math.max(0, idx - 6);
      const win = filtered.slice(winStart, idx + 1);
      const avg =
        win.reduce(
          (s: number, d: any) =>
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

  /* ── Loading / error states ── */
  if (loading) return <Center h="100vh"><Loader size="lg" /></Center>;
  if (!data) return <Center h="100vh"><Text c="dimmed">Дашборд не найден</Text></Center>;

  /* ── Project map ── */
  const projectsMap: Record<string, { title: string; color: string }> = {};
  data.projects.forEach((p: any) => { projectsMap[p.id] = { title: p.title, color: p.color }; });
  projectsMap.inbox = { title: 'Входящие', color: '#94a3b8' };
  const allProjectIds = data.projects.map((p: any) => p.id).concat('inbox');

  return (
    <Box p="md" maw={1400} mx="auto">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={3}>Дашборд — {data.user_name}</Title>
          <Switch
            label="Будни"
            checked={workdaysOnly}
            onChange={(e) => setWorkdaysOnly(e.currentTarget.checked)}
          />
        </Group>

        {/* Top row: 4 compact charts */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {/* 1. Tasks by project (stacked area) */}
          <Paper p="sm" radius="md" withBorder>
            <Text size="sm" fw={500} mb={4}>
              Задачи по проектам за {data.days} дней
            </Text>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={projectPerDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={fmtDate} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={fmtDate} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {allProjectIds.map((pid: string) => (
                  <Area
                    key={pid}
                    type="monotone"
                    dataKey={pid}
                    stackId="1"
                    fill={projectsMap[pid]?.color || '#888'}
                    stroke={projectsMap[pid]?.color || '#888'}
                    name={projectsMap[pid]?.title || pid}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </Paper>

          {/* 2. Load by priority (stacked bar) */}
          <Paper p="sm" radius="md" withBorder>
            <Text size="sm" fw={500} mb={4}>
              Нагрузка по приоритетам за {data.days} дней
            </Text>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={priorityPerDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={fmtDate} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={fmtDate} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {['p4', 'p3', 'p2', 'p1', 'p0'].map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="1"
                    fill={PRIORITY_COLORS[key]}
                    name={PRIORITY_LABELS[key]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* 3. Weekly by project (donut) */}
          <Paper p="sm" radius="md" withBorder>
            <Text size="sm" fw={500} mb={4}>За последнюю неделю</Text>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.weekly_by_project}
                  dataKey="count"
                  nameKey="title"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                >
                  {data.weekly_by_project.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          {/* 4. By weekday (horizontal bar) */}
          <Paper p="sm" radius="md" withBorder>
            <Text size="sm" fw={500} mb={4}>Продуктивность по дням недели</Text>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byWeekday} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="day" tick={{ fontSize: 11 }} width={25} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" name="Задач" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </SimpleGrid>

        {/* Bottom: full-width productivity trend */}
        <Paper p="sm" radius="md" withBorder>
          <Text size="sm" fw={500} mb={4}>
            Тренд продуктивности (скользящее среднее за 7 дней)
          </Text>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={trendData} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="total"
                fill="#6366f1"
                name="Выполнено задач"
                opacity={0.4}
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
        </Paper>
      </Stack>
    </Box>
  );
}
