import { AppShell, Burger, Group, NavLink, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDeviceGamepad2, IconLayoutDashboard } from '@tabler/icons-react';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <IconDeviceGamepad2 size={28} color="#FFD600" />
            <Title order={4} c="yellow">TRES LETRAS</Title>
          </Group>
          <Text size="xs" c="dimmed">Panel de Administración</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          href="#"
          label="Dashboard"
          leftSection={<IconLayoutDashboard size={18} />}
          active
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Dashboard />
      </AppShell.Main>
    </AppShell>
  );
}
