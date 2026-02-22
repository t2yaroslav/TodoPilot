import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Group, Title, ActionIcon, ColorSwatch } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { useTaskStore } from '@/stores/taskStore';
import { TaskList } from '@/components/tasks/TaskList';
import { AIModal } from '@/components/ai/AIModal';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { projects, fetchProjects } = useTaskStore();
  const [aiOpen, setAiOpen] = useState(false);
  const project = projects.find((p) => p.id === id);

  useEffect(() => {
    if (projects.length === 0) fetchProjects();
  }, [id]);

  return (
    <>
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          {project && <ColorSwatch color={project.color} size={16} />}
          <Title order={3}>{project?.title || 'Проект'}</Title>
        </Group>
        <ActionIcon variant="light" color="indigo" size="lg" onClick={() => setAiOpen(true)}>
          <IconSparkles size={20} />
        </ActionIcon>
      </Group>
      {id && <TaskList filterParams={{ project_id: id, completed: false }} />}
      <AIModal opened={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
