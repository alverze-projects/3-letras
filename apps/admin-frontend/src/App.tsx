import { AppShell, Burger, Group, NavLink, Text, Title, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDeviceGamepad2, IconLayoutDashboard, IconLogout } from '@tabler/icons-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';

function Shell() {
  const [opened, { toggle }] = useDisclosure();
  const { logout } = useAuth();

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
          <Group>
            <Text size="xs" c="dimmed">Panel de Administración</Text>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconLogout size={14} />}
              onClick={logout}
            >
              Cerrar sesión
            </Button>
          </Group>
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

function AppContent() {
  const { token } = useAuth();
  return token ? <Shell /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
