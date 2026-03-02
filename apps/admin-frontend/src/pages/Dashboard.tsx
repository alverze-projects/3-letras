import { useEffect, useState } from 'react';
import {
  Title, Grid, Card, Text, Badge, Table, Group,
  Stack, ThemeIcon, Loader, Center,
} from '@mantine/core';
import { IconDeviceGamepad2, IconUsers, IconTrophy, IconClockHour4, IconChevronRight } from '@tabler/icons-react';
import { adminApi } from '../services/api';
import type { IGameSummary } from '@3letras/interfaces';

const STATUS_COLORS: Record<string, string> = {
  waiting: 'yellow',
  playing: 'green',
  finished: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  waiting: 'Esperando',
  playing: 'En curso',
  finished: 'Finalizada',
};

const DIFF_LABELS: Record<string, string> = {
  basic: 'Básico',
  medium: 'Medio',
  advanced: 'Avanzado',
};

interface Props {
  onSelectGame: (gameId: string) => void;
}

export default function Dashboard({ onSelectGame }: Props) {
  const [games, setGames] = useState<IGameSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.listGames()
      .then(({ games }) => setGames(games))
      .catch(console.error)
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      adminApi.listGames().then(({ games }) => setGames(games)).catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const active = games.filter((g) => g.status === 'playing').length;
  const waiting = games.filter((g) => g.status === 'waiting').length;
  const finished = games.filter((g) => g.status === 'finished').length;

  return (
    <Stack gap="xl">
      <Title order={2}>Dashboard</Title>

      <Grid>
        {[
          { label: 'Partidas activas', value: active, icon: IconDeviceGamepad2, color: 'green' },
          { label: 'En sala de espera', value: waiting, icon: IconClockHour4, color: 'yellow' },
          { label: 'Partidas finalizadas', value: finished, icon: IconTrophy, color: 'blue' },
          { label: 'Total partidas', value: games.length, icon: IconUsers, color: 'violet' },
        ].map((stat) => (
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={stat.label}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group>
                <ThemeIcon color={stat.color} variant="light" size="xl">
                  <stat.icon size={24} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">{stat.label}</Text>
                  <Text size="xl" fw={700}>{stat.value}</Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={3} mb="md">Partidas recientes</Title>
        {loading ? (
          <Center h={100}><Loader /></Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Código</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Dificultad</Table.Th>
                <Table.Th>Jugadores</Table.Th>
                <Table.Th>Creada</Table.Th>
                <Table.Th w={36} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {games.map((g) => (
                <Table.Tr
                  key={g.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectGame(g.id)}
                >
                  <Table.Td>
                    <Text ff="monospace" fw={700} size="lg">{g.code}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLORS[g.status] ?? 'gray'}>
                      {STATUS_LABELS[g.status] ?? g.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{DIFF_LABELS[g.difficulty] ?? g.difficulty}</Table.Td>
                  <Table.Td>{g.playerCount}</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(g.createdAt).toLocaleString('es-CL')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <IconChevronRight size={16} color="gray" />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}
