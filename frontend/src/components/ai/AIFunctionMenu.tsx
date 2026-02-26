import { useState } from 'react';
import { Menu, ActionIcon } from '@mantine/core';
import { IconSparkles, IconChartBar, IconBrain, IconSunrise, IconMessageChatbot } from '@tabler/icons-react';
import { AnalysisModal } from './AnalysisModal';
import { BrainDumpModal } from './BrainDumpModal';
import { MorningPlanModal } from './MorningPlanModal';
import { SmartChatModal } from './SmartChatModal';

export function AIFunctionMenu() {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [morningPlanOpen, setMorningPlanOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <Menu shadow="md" width={220} position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="light" color="indigo" size="lg" title="AI-помощник">
            <IconSparkles size={20} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>AI-помощник</Menu.Label>
          <Menu.Item
            leftSection={<IconChartBar size={16} />}
            onClick={() => setAnalysisOpen(true)}
          >
            Анализ
          </Menu.Item>
          <Menu.Item
            leftSection={<IconBrain size={16} />}
            onClick={() => setBrainDumpOpen(true)}
          >
            Выгрузка из головы
          </Menu.Item>
          <Menu.Item
            leftSection={<IconSunrise size={16} />}
            onClick={() => setMorningPlanOpen(true)}
          >
            Утренний план
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconMessageChatbot size={16} />}
            onClick={() => setChatOpen(true)}
          >
            AI-чат
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <AnalysisModal opened={analysisOpen} onClose={() => setAnalysisOpen(false)} />
      <BrainDumpModal opened={brainDumpOpen} onClose={() => setBrainDumpOpen(false)} />
      <MorningPlanModal opened={morningPlanOpen} onClose={() => setMorningPlanOpen(false)} />
      <SmartChatModal opened={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
