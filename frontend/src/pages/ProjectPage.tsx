import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Group, Title, ColorSwatch } from '@mantine/core';
import { IconHash } from '@tabler/icons-react';
import { useTaskStore } from '@/stores/taskStore';
import { TaskList } from '@/components/tasks/TaskList';
import { AIFunctionMenu } from '@/components/ai/AIFunctionMenu';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { projects, fetchProjects } = useTaskStore();
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
        <AIFunctionMenu />
      </Group>
      {id && (
        <TaskList
          filterParams={{ project_id: id, completed: false }}
          sectionTitle={project?.title}
          sectionIcon={project ? <IconHash size={18} color={project.color} /> : undefined}
        />
      )}
    </>
  );
}
