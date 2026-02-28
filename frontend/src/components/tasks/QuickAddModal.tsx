import { Modal } from '@mantine/core';
import { InlineAddTask } from './InlineAddTask';

interface Props {
  opened: boolean;
  onClose: () => void;
  defaultDueDate?: Date;
  defaultProjectId?: string;
}

export function QuickAddModal({ opened, onClose, defaultDueDate, defaultProjectId }: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title="Быстрое добавление задачи" size={800}>
      <InlineAddTask
        onClose={onClose}
        onAdded={onClose}
        defaultDueDate={defaultDueDate}
        defaultProjectId={defaultProjectId}
        size="sm"
        showGoal
      />
    </Modal>
  );
}
