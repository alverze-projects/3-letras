import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title, Text, Badge, Table, Group, Stack, ActionIcon, Tooltip,
  Modal, Button, Loader, Center, Alert, TextInput, SegmentedControl,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSearch, IconEye, IconPlayerStop, IconTrash,
  IconRefresh, IconAlertCircle,
} from '@tabler/icons-react';
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

type FilterStatus = 'all' | 'waiting' | 'playing' | 'finished';

// ─── Modal confirmación genérica ─────────────────────────────────────────────

interface ConfirmModalProps {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function ConfirmModal({ message, confirmLabel, confirmColor = 'red', onConfirm, onClose }: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setError(null);
    setLoading(true);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al realizar la operación');
      setLoading(false);
    }
  }

  return (
    <Stack gap="md">
      <Text>{message}</Text>
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">{error}</Alert>
      )}
      <Group justify="flex-end">
        <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button color={confirmColor} loading={loading} onClick={handle}>{confirmLabel}</Button>
      </Group>
    </Stack>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [games, setGames] = useState<IGameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  const [targetGame, setTargetGame] = useState<IGameSummary | null>(null);
  const [action, setAction] = useState<'finish' | 'delete' | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  // Debounce ref para el campo de búsqueda
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function buildFilters() {
    return {
      status: filter !== 'all' ? filter : undefined,
      code: search.trim() || undefined,
    };
  }

  async function load(filters = buildFilters(), showLoader = false) {
    if (showLoader) setLoading(true);
    try {
      const { games } = await adminApi.listGames(filters);
      setGames(games);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  // Recarga cuando cambia el filtro de estado
  useEffect(() => {
    load({ status: filter !== 'all' ? filter : undefined, code: search.trim() || undefined }, true);
  }, [filter]);

  // Debounce en búsqueda por código
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load({ status: filter !== 'all' ? filter : undefined, code: search.trim() || undefined }, true);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Auto-refresh cada 10s con los filtros actuales
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      load({ status: filter !== 'all' ? filter : undefined, code: search.trim() || undefined });
    }, 10_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [filter, search]);

  function openAction(game: IGameSummary, act: 'finish' | 'delete') {
    setTargetGame(game);
    setAction(act);
    openModal();
  }

  function handleClose() {
    closeModal();
    setTargetGame(null);
    setAction(null);
  }

  async function handleFinish() {
    await adminApi.forceFinishGame(targetGame!.id);
    setGames((prev) =>
      prev.map((g) => g.id === targetGame!.id ? { ...g, status: 'finished' } : g),
    );
    handleClose();
  }

  async function handleDelete() {
    await adminApi.deleteGame(targetGame!.id);
    setGames((prev) => prev.filter((g) => g.id !== targetGame!.id));
    handleClose();
  }

  const counts = {
    waiting: games.filter((g) => g.status === 'waiting').length,
    playing: games.filter((g) => g.status === 'playing').length,
    finished: games.filter((g) => g.status === 'finished').length,
  };

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2}>Partidas</Title>
            <Text size="sm" c="dimmed">
              {games.length} total ·{' '}
              <Text span c="yellow.7" fw={600}>{counts.waiting} esperando</Text> ·{' '}
              <Text span c="green.7" fw={600}>{counts.playing} en curso</Text> ·{' '}
              <Text span c="dimmed">{counts.finished} finalizadas</Text>
            </Text>
          </div>
          <Tooltip label="Actualizar">
            <ActionIcon variant="subtle" size="lg" onClick={() => load(buildFilters(), true)} loading={loading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as FilterStatus)}
            data={[
              { label: 'Todas', value: 'all' },
              { label: 'Esperando', value: 'waiting' },
              { label: 'En curso', value: 'playing' },
              { label: 'Finalizadas', value: 'finished' },
            ]}
          />
          <TextInput
            placeholder="Buscar por código…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 260 }}
          />
        </Group>

        {loading ? (
          <Center h={200}><Loader /></Center>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Código</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Dificultad</Table.Th>
                <Table.Th>Jugadores</Table.Th>
                <Table.Th>Creada</Table.Th>
                <Table.Th w={110} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {games.map((g) => (
                <Table.Tr key={g.id}>
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
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip label="Ver detalle">
                        <ActionIcon variant="subtle" onClick={() => navigate(`/games/${g.id}`)}>
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {(g.status === 'waiting' || g.status === 'playing') && (
                        <Tooltip label="Forzar cierre">
                          <ActionIcon
                            variant="subtle"
                            color="orange"
                            onClick={() => openAction(g, 'finish')}
                          >
                            <IconPlayerStop size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <Tooltip label="Eliminar">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => openAction(g, 'delete')}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {games.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="xl">No hay partidas que coincidan</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={handleClose}
        title={action === 'finish' ? 'Cerrar partida' : 'Eliminar partida'}
        size="sm"
      >
        {action === 'finish' && targetGame && (
          <ConfirmModal
            title="Cerrar partida"
            message={
              <>
                ¿Forzar el cierre de la partida <strong>{targetGame.code}</strong>?
                Los jugadores serán desconectados de la sesión activa.
              </>
            }
            confirmLabel="Cerrar partida"
            confirmColor="orange"
            onConfirm={handleFinish}
            onClose={handleClose}
          />
        )}
        {action === 'delete' && targetGame && (
          <ConfirmModal
            title="Eliminar partida"
            message={
              <>
                ¿Eliminar permanentemente la partida <strong>{targetGame.code}</strong>?
                Se borrarán todas las rondas y turnos asociados.
              </>
            }
            confirmLabel="Eliminar"
            confirmColor="red"
            onConfirm={handleDelete}
            onClose={handleClose}
          />
        )}
      </Modal>
    </>
  );
}
