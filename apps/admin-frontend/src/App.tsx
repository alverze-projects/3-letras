import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppShell, Burger, Group, NavLink, Text, Title, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDeviceGamepad2, IconLogout, IconUsers } from '@tabler/icons-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import GamesPage from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import GameDetailPage from './pages/GameDetailPage';
import UsersPage from './pages/UsersPage';

function Shell() {
  const [opened, { toggle }] = useDisclosure();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
          component="button"
          label="Partidas"
          leftSection={<IconDeviceGamepad2 size={18} />}
          active={location.pathname.startsWith('/games')}
          onClick={() => navigate('/games')}
        />
        <NavLink
          component="button"
          label="Usuarios"
          leftSection={<IconUsers size={18} />}
          active={location.pathname.startsWith('/users')}
          onClick={() => navigate('/users')}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Navigate to="/games" replace />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/:id" element={<GameDetailPage onBack={() => navigate('/games')} />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/games" replace />} />
        </Routes>
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
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
