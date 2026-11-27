import { Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { InlineAddTask } from './InlineAddTask';

interface Props {
  opened: boolean;
  onClose: () => void;
  defaultDueDate?: Date;
  defaultProjectId?: string;
}

export function QuickAddModal({ opened, onClose, defaultDueDate, defaultProjectId }: Props) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Добавить задачу"
      size={isMobile ? '100%' : 700}
      fullScreen={isMobile}
    >
      {opened && <InlineAddTask
        onClose={onClose}
        onAdded={onClose}
        defaultDueDate={defaultDueDate}
        defaultProjectId={defaultProjectId}
      />}
    </Modal>
  );
}
