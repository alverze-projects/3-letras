import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Title, Text, Badge, Table, Group, Stack, Loader, Center,
  Card, Grid, Accordion, ThemeIcon, ActionIcon, Tooltip,
  Divider, Avatar,
} from '@mantine/core';
import {
  IconArrowLeft, IconCrown, IconCheck, IconX,
  IconClock, IconChevronsRight, IconTrophy,
} from '@tabler/icons-react';
import { adminApi, type IAdminGameDetail, type IAdminRound } from '../services/api';

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
const TURN_STATUS_LABELS: Record<string, { label: string; color: string; icon: React.FC<{ size: number }> }> = {
  submitted: { label: 'Enviada', color: 'green', icon: IconCheck },
  skipped:   { label: 'Saltó', color: 'orange', icon: IconChevronsRight },
  timeout:   { label: 'Tiempo', color: 'red', icon: IconClock },
  pending:   { label: 'Pendiente', color: 'gray', icon: IconClock },
  active:    { label: 'Activo', color: 'blue', icon: IconClock },
};

function RoundPanel({ round, rank }: { round: IAdminRound; rank: number }) {
  const validTurns = round.turns.filter((t) => t.isValid);
  const roundScore = validTurns.reduce((s, t) => s + t.score, 0);

  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs">
          <Text size="sm" c="dimmed">Letras:</Text>
          {round.letters.map((l) => (
            <Badge key={l} variant="filled" color="yellow" c="dark" size="lg" ff="monospace" fw={700}>
              {l}
            </Badge>
          ))}
        </Group>
        <Group gap="xs">
          <Text size="sm" c="dimmed">Dado:</Text>
          <Badge variant="outline" size="lg">{round.dieResult}</Badge>
          <Text size="sm" c="dimmed">· {validTurns.length} palabras · {roundScore} pts</Text>
        </Group>
      </Group>

      {round.turns.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="sm">Sin turnos registrados</Text>
      ) : (
        <Table striped withTableBorder withColumnBorders fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}>#</Table.Th>
              <Table.Th>Jugador</Table.Th>
              <Table.Th>Palabra</Table.Th>
              <Table.Th w={80}>Puntos</Table.Th>
              <Table.Th w={100}>Estado</Table.Th>
              <Table.Th>Motivo rechazo</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {round.turns.map((t) => {
              const st = TURN_STATUS_LABELS[t.status] ?? { label: t.status, color: 'gray', icon: IconClock };
              const Icon = st.icon;
              return (
                <Table.Tr key={t.id}>
                  <Table.Td c="dimmed">{t.turnNumber}</Table.Td>
                  <Table.Td fw={500}>{t.nickname}</Table.Td>
                  <Table.Td>
                    {t.word ? (
                      <Text ff="monospace" fw={600} c={t.isValid ? 'green' : 'red'}>
                        {t.word}
                      </Text>
                    ) : (
                      <Text c="dimmed" fs="italic">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {t.score > 0 ? (
                      <Text fw={700} c="green">+{t.score}</Text>
                    ) : (
                      <Text c="dimmed">0</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={st.color}
                      variant="light"
                      leftSection={<Icon size={12} />}
                      size="sm"
                    >
                      {st.label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">{t.invalidReason ?? '—'}</Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}

interface Props {
  onBack: () => void;
}

export default function GameDetailPage({ onBack }: Props) {
  const { id: gameId } = useParams<{ id: string }>();
  const [game, setGame] = useState<IAdminGameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    adminApi.getGameDetail(gameId)
      .then(setGame)
      .catch(() => setError('No se pudo cargar la partida'))
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <Center h={300}><Loader /></Center>;
  if (error || !game) return (
    <Center h={300}>
      <Stack align="center">
        <IconX size={40} color="red" />
        <Text c="red">{error ?? 'Partida no encontrada'}</Text>
      </Stack>
    </Center>
  );

  const totalPoints = game.players.reduce((s, p) => s + p.totalScore, 0);
  const winner = game.status === 'finished' && game.players[0];

  return (
    <Stack gap="xl">
      {/* Header */}
      <Group>
        <Tooltip label="Volver al dashboard">
          <ActionIcon variant="subtle" size="lg" onClick={onBack}>
            <IconArrowLeft size={20} />
          </ActionIcon>
        </Tooltip>
        <div>
          <Group gap="xs" align="center">
            <Text ff="monospace" fw={900} size="xl" c="yellow">{game.code}</Text>
            <Badge color={STATUS_COLORS[game.status] ?? 'gray'} size="lg">
              {STATUS_LABELS[game.status] ?? game.status}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {DIFF_LABELS[game.difficulty] ?? game.difficulty} · {game.rounds.length}/{game.totalRounds} rondas · creada {new Date(game.createdAt).toLocaleString('es-CL')}
          </Text>
        </div>
      </Group>

      <Grid>
        {/* Jugadores */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card shadow="sm" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon color="violet" variant="light">
                <IconTrophy size={16} />
              </ThemeIcon>
              <Title order={4}>Jugadores</Title>
            </Group>
            <Stack gap="xs">
              {game.players.map((p, i) => (
                <Group key={p.playerId} justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <Avatar color={i === 0 && game.status === 'finished' ? 'yellow' : 'gray'} radius="xl" size="sm">
                      {i + 1}
                    </Avatar>
                    <div>
                      <Group gap={4}>
                        <Text size="sm" fw={600}>{p.nickname}</Text>
                        {p.isHost && (
                          <IconCrown size={13} color="#FFD600" />
                        )}
                        {winner && winner.playerId === p.playerId && (
                          <Badge size="xs" color="yellow" c="dark">Ganador</Badge>
                        )}
                      </Group>
                    </div>
                  </Group>
                  <Text fw={700} c={p.totalScore > 0 ? 'green' : 'dimmed'}>
                    {p.totalScore} pts
                  </Text>
                </Group>
              ))}
              {game.players.length === 0 && (
                <Text size="sm" c="dimmed" ta="center">Sin jugadores</Text>
              )}
            </Stack>
            {totalPoints > 0 && (
              <>
                <Divider my="sm" />
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Total puntos repartidos</Text>
                  <Text size="xs" fw={600}>{totalPoints}</Text>
                </Group>
              </>
            )}
          </Card>
        </Grid.Col>

        {/* Rondas */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card shadow="sm" radius="md" withBorder>
            <Title order={4} mb="md">Rondas</Title>
            {game.rounds.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="lg">La partida no tiene rondas registradas</Text>
            ) : (
              <Accordion variant="separated" chevronPosition="left">
                {game.rounds.map((r) => {
                  const completedTurns = r.turns.filter((t) => t.status !== 'pending' && t.status !== 'active').length;
                  return (
                    <Accordion.Item key={r.id} value={r.id}>
                      <Accordion.Control>
                        <Group justify="space-between" pr="md">
                          <Group gap="xs">
                            <Text fw={700}>Ronda {r.roundNumber}</Text>
                            <Text ff="monospace" size="sm" c="yellow" fw={700}>
                              {r.letters.join(' · ')}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <Badge variant="light" color={r.isComplete ? 'green' : 'orange'} size="sm">
                              {r.isComplete ? 'Completa' : 'En curso'}
                            </Badge>
                            <Text size="xs" c="dimmed">{completedTurns}/{r.turns.length} turnos</Text>
                          </Group>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <RoundPanel round={r} rank={r.roundNumber} />
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
