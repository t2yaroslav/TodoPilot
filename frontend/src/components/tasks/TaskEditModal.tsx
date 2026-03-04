import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Textarea, Select, Group, Button, Stack, Text, Box, Grid, UnstyledButton, Paper } from '@mantine/core';
import { IconCalendar, IconRepeat, IconHash, IconAlignLeft } from '@tabler/icons-react';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { DescriptionRenderer } from './DescriptionRenderer';
import { Task, useTaskStore } from '@/stores/taskStore';
import { DatePickerMenu } from './DatePickerMenu';
import { toNoonUTC } from '@/lib/dates';
import { getRecurrenceLabel } from '@/lib/recurrence';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

interface Props {
  task: Task | null;
  onClose: () => void;
  filterParams?: Record<string, unknown>;
  sectionTitle?: string;
  sectionIcon?: React.ReactNode;
}

export function TaskEditModal({ task, onClose, filterParams, sectionTitle, sectionIcon }: Props) {
  const { editTask, fetchTasks, refreshAllCounts, projects, goals, fetchGoals } = useTaskStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('0');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const originalDescription = useRef('');
  const titleBlurTimeout = useRef<ReturnType<typeof setTimeout>>();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Placeholder.configure({ placeholder: 'Описание' }),
    ],
    content: '',
  });

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      const desc = task.description || '';
      originalDescription.current = desc;
      editor?.commands.setContent(desc);
      setPriority(String(task.priority));
      setDueDate(task.due_date ? new Date(task.due_date) : null);
      setProjectId(task.project_id);
      setGoalId(task.goal_id);
      setRecurrence(task.recurrence);
      setEditingDescription(false);
      setCtxMenu(null);
      if (goals.length === 0) fetchGoals();
    }
  }, [task]);

  const autoSave = useCallback(async (field: string, value: unknown) => {
    if (!task) return;
    await editTask(task.id, { [field]: value });
    fetchTasks(filterParams);
    refreshAllCounts();
  }, [task, editTask, fetchTasks, refreshAllCounts, filterParams]);

  const handleTitleBlur = () => {
    if (!task || title.trim() === task.title) return;
    if (titleBlurTimeout.current) clearTimeout(titleBlurTimeout.current);
    titleBlurTimeout.current = setTimeout(() => {
      if (title.trim()) {
        autoSave('title', title.trim());
      }
    }, 150);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handlePriorityChange = (v: string | null) => {
    const newVal = v || '0';
    setPriority(newVal);
    autoSave('priority', parseInt(newVal));
  };

  const handleDateChange = (date: Date | null) => {
    setDueDate(date);
    autoSave('due_date', date ? toNoonUTC(date) : null);
  };

  const handleRecurrenceChange = (rec: string | null) => {
    setRecurrence(rec);
    autoSave('recurrence', rec || null);
  };

  const handleProjectChange = (v: string | null) => {
    setProjectId(v);
    autoSave('project_id', v);
  };

  const handleGoalChange = (v: string | null) => {
    setGoalId(v);
    autoSave('goal_id', v);
  };

  const handleDescriptionSave = async () => {
    if (!task || !editor) return;
    const html = editor.getHTML();
    const isEmpty = !editor.getText().trim();
    const value = isEmpty ? null : html;
    await editTask(task.id, { description: value });
    originalDescription.current = value || '';
    setEditingDescription(false);
    fetchTasks(filterParams);
    refreshAllCounts();
  };

  const handleDescriptionCancel = () => {
    editor?.commands.setContent(originalDescription.current);
    setEditingDescription(false);
  };

  const startEditingDescription = () => {
    editor?.commands.setContent(originalDescription.current);
    setEditingDescription(true);
    setTimeout(() => editor?.commands.focus(), 0);
  };

  const handleEditorContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const currentDescription = originalDescription.current;

  // Dynamic title: project name with icon, or section name with icon
  const taskProject = task?.project_id ? projects.find((p) => p.id === task.project_id) : null;
  const modalTitle = taskProject ? (
    <Group gap={6}>
      <IconHash size={18} color={taskProject.color}/>
      <Text size="sm" fw={500}>{taskProject.title}</Text>
    </Group>
  ) : sectionTitle ? (
    <Group gap={6}>
      {sectionIcon}
      <Text size="sm" fw={500}>{sectionTitle}</Text>
    </Group>
  ) : null;

  const selectedProject = projectId ? projects.find((p) => p.id === projectId) : null;

  return (
    <Modal
      opened={!!task}
      onClose={onClose}
      title={modalTitle}
      size={860}
      styles={{
        body: { minHeight: 400 },
        header: { borderBottom: '1px solid var(--mantine-color-default-border)', paddingBottom: 12 },
      }}
    >
      <Grid gutter="lg" pt="md">
        {/* Left: title + description */}
        <Grid.Col span={8}>
          <Stack gap="md">
            <Textarea
              size="xs"
              placeholder="Название задачи"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              variant="unstyled"
              autosize
              minRows={1}
              maxRows={10}
              styles={{
                input: {
                  fontWeight: 500,
                  fontSize: '18px',
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 0,
                  paddingBottom: 8,
                  overflow: 'hidden',
                },
              }}
            />
            {editingDescription ? (
              <>
                <RichTextEditor
                  editor={editor}
                  styles={{
                    root: { border: 'none' },
                    content: {
                      minHeight: 120,
                      fontSize: 14,
                      padding: 0,
                      '& .tiptap': { padding: 0 },
                      '& p': { margin: 0 },
                      '& p + p': { marginTop: 4 },
                    },
                  }}
                >
                  <Box onContextMenu={handleEditorContextMenu}>
                    <RichTextEditor.Content />
                  </Box>
                  {ctxMenu && createPortal(
                    <Paper
                      shadow="md"
                      p={4}
                      withBorder
                      style={{
                        position: 'fixed',
                        left: ctxMenu.x,
                        top: ctxMenu.y,
                        zIndex: 10000,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Bold />
                        <RichTextEditor.Italic />
                        <RichTextEditor.Strikethrough />
                        <RichTextEditor.BulletList />
                        <RichTextEditor.OrderedList />
                        <RichTextEditor.Link />
                        <RichTextEditor.Unlink />
                      </RichTextEditor.ControlsGroup>
                    </Paper>,
                    document.body,
                  )}
                </RichTextEditor>
                <Group gap="xs" justify="flex-end">
                  <Button size="xs" variant="default" onClick={handleDescriptionCancel}>Отмена</Button>
                  <Button size="xs" onClick={handleDescriptionSave}>Сохранить</Button>
                </Group>
              </>
            ) : currentDescription ? (
              <Box
                onClick={startEditingDescription}
                style={{ cursor: 'pointer' }}
              >
                <DescriptionRenderer content={currentDescription} size="sm" />
              </Box>
            ) : (
              <UnstyledButton onClick={startEditingDescription}>
                <Group gap={6} c="dimmed">
                  <IconAlignLeft size={16} />
                  <Text size="sm" c="dimmed">Описание</Text>
                </Group>
              </UnstyledButton>
            )}
          </Stack>
        </Grid.Col>

        {/* Right sidebar: settings */}
        <Grid.Col span={4}>
          <Stack gap="sm">
            <Select
              size="xs"
              label="Приоритет"
              value={priority}
              onChange={handlePriorityChange}
              data={[
                { value: '4', label: '🔴 Важно и срочно' },
                { value: '3', label: '🟠 Не важно и срочно' },
                { value: '2', label: '🔵 Важно, не срочно' },
                { value: '1', label: '⚪ Не важно, не срочно' },
                { value: '0', label: 'Без приоритета' },
              ]}
            />
            <Box>
              <Text size="xs" fw={500} mb={4}>Срок</Text>
              <DatePickerMenu
                value={dueDate}
                onChange={handleDateChange}
                recurrence={recurrence}
                onRecurrenceChange={handleRecurrenceChange}
              >
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconCalendar size={16}/>}
                  fullWidth
                  styles={{ inner: { justifyContent: 'flex-start' } }}
                >
                  {dueDate ? dayjs(dueDate).format('D MMM') : 'Выбрать дату'}
                  {recurrence && (
                    <Group gap={4} ml={8}>
                      <IconRepeat size={14} color="var(--mantine-color-blue-5)"/>
                      <Text size="xs" c="blue" component="span">
                        {getRecurrenceLabel(recurrence)}
                      </Text>
                    </Group>
                  )}
                </Button>
              </DatePickerMenu>
            </Box>
            <Select
              size="xs"
              label="Проект"
              value={projectId}
              onChange={handleProjectChange}
              data={projects.map((p) => ({ value: p.id, label: p.title }))}
              clearable
              placeholder="Без проекта"
              leftSection={
                selectedProject
                  ? <IconHash size={14} color={selectedProject.color} />
                  : <IconHash size={14} color="var(--mantine-color-dimmed)" />
              }
              renderOption={({ option }) => {
                const p = projects.find((pr) => pr.id === option.value);
                return (
                  <Group gap={6} wrap="nowrap">
                    <IconHash size={14} color={p?.color} style={{ flexShrink: 0 }} />
                    <span>{option.label}</span>
                  </Group>
                );
              }}
            />
            <Select
              size="xs"
              label="Цель"
              value={goalId}
              onChange={handleGoalChange}
              data={goals.map((g) => ({ value: g.id, label: g.title }))}
              clearable
              placeholder="Без цели"
            />
          </Stack>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}
