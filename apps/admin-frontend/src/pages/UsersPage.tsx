import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title, Table, Badge, Group, Stack, Button, ActionIcon, Tooltip,
  Modal, Drawer, TextInput, PasswordInput, Switch, Text, Loader, Center,
  Alert, Divider, Avatar,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconUserPlus, IconPencil, IconTrash, IconAlertCircle,
  IconCrown, IconUser, IconShieldHalf, IconDeviceGamepad2, IconChevronRight,
} from '@tabler/icons-react';
import { adminApi, type IUserSummary, type IUserGame, type CreateUserDto, type UpdateUserDto } from '../services/api';

// ─── Modal de crear / editar ─────────────────────────────────────────────────

interface UserFormProps {
  editing: IUserSummary | null;
  onSave: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
  onClose: () => void;
}

function UserForm({ editing, onSave, onClose }: UserFormProps) {
  const [nickname, setNickname] = useState(editing?.nickname ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(editing?.isAdmin ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!editing && !password) {
      setError('La contraseña es requerida para crear un usuario');
      return;
    }

    setLoading(true);
    try {
      if (editing) {
        const dto: UpdateUserDto = {};
        if (nickname !== editing.nickname) dto.nickname = nickname;
        if (email !== (editing.email ?? '')) dto.email = email;
        if (password) dto.password = password;
        if (isAdmin !== editing.isAdmin) dto.isAdmin = isAdmin;
        await onSave(dto);
      } else {
        await onSave({ nickname, email, password, isAdmin } as CreateUserDto);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <TextInput
          label="Nickname"
          placeholder="nombre_usuario"
          value={nickname}
          onChange={(e) => setNickname(e.currentTarget.value)}
          required
          autoFocus
        />
        <TextInput
          label="Email"
          placeholder="usuario@ejemplo.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required={!editing}
        />
        <PasswordInput
          label={editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required={!editing}
        />
        <Switch
          label="Administrador"
          description="Permite acceder al panel de administración"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.currentTarget.checked)}
        />
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}
        <Divider />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {editing ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

// ─── Modal de confirmación de eliminación ────────────────────────────────────

interface DeleteConfirmProps {
  user: IUserSummary;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function DeleteConfirm({ user, onConfirm, onClose }: DeleteConfirmProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al eliminar');
      setLoading(false);
    }
  }

  return (
    <Stack gap="md">
      <Text>
        ¿Eliminar al usuario <strong>{user.nickname}</strong>? Esta acción no se puede deshacer.
      </Text>
      {user.gamesPlayed > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
          Este usuario participó en {user.gamesPlayed} partida(s). No se puede eliminar.
        </Alert>
      )}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {error}
        </Alert>
      )}
      <Group justify="flex-end">
        <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          color="red"
          loading={loading}
          disabled={user.gamesPlayed > 0}
          onClick={handleConfirm}
        >
          Eliminar
        </Button>
      </Group>
    </Stack>
  );
}

// ─── Drawer de partidas del usuario ──────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = { waiting: 'yellow', playing: 'green', finished: 'gray' };
const STATUS_LABELS: Record<string, string> = { waiting: 'Esperando', playing: 'En curso', finished: 'Finalizada' };
const DIFF_LABELS: Record<string, string> = { basic: 'Básico', medium: 'Medio', advanced: 'Avanzado' };

interface GamesDrawerProps {
  user: IUserSummary;
  onClose: () => void;
  onGoToGame: (gameId: string) => void;
}

function GamesDrawer({ user, onClose, onGoToGame }: GamesDrawerProps) {
  const [games, setGames] = useState<IUserGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUserGames(user.id)
      .then(setGames)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">{user.gamesPlayed} partida(s) en total</Text>

      {loading ? (
        <Center h={120}><Loader /></Center>
      ) : games.length === 0 ? (
        <Center h={120}><Text c="dimmed">Sin partidas registradas</Text></Center>
      ) : (
        <Table striped withTableBorder fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Código</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Dificultad</Table.Th>
              <Table.Th>Puntos</Table.Th>
              <Table.Th>Fecha</Table.Th>
              <Table.Th w={36} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {games.map((g) => (
              <Table.Tr
                key={g.id}
                style={{ cursor: 'pointer' }}
                onClick={() => { onClose(); onGoToGame(g.id); }}
              >
                <Table.Td>
                  <Group gap={4}>
                    <Text ff="monospace" fw={700}>{g.code}</Text>
                    {g.isHost && <IconCrown size={12} color="#FFD600" />}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" color={STATUS_COLORS[g.status] ?? 'gray'}>
                    {STATUS_LABELS[g.status] ?? g.status}
                  </Badge>
                </Table.Td>
                <Table.Td>{DIFF_LABELS[g.difficulty] ?? g.difficulty}</Table.Td>
                <Table.Td>
                  <Text fw={600} c={g.score > 0 ? 'green' : 'dimmed'}>{g.score} pts</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">{new Date(g.createdAt).toLocaleDateString('es-CL')}</Text>
                </Table.Td>
                <Table.Td>
                  <IconChevronRight size={14} color="gray" />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<IUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<IUserSummary | null>(null);
  const [deleting, setDeleting] = useState<IUserSummary | null>(null);
  const [viewingGames, setViewingGames] = useState<IUserSummary | null>(null);

  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [gamesOpened, { open: openGames, close: closeGames }] = useDisclosure(false);

  function handleViewGames(user: IUserSummary) {
    setViewingGames(user);
    openGames();
  }

  async function load() {
    try {
      const { users } = await adminApi.listUsers();
      setUsers(users);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleNewUser() {
    setEditing(null);
    openForm();
  }

  function handleEditUser(user: IUserSummary) {
    setEditing(user);
    openForm();
  }

  function handleDeleteUser(user: IUserSummary) {
    setDeleting(user);
    openDelete();
  }

  async function handleSave(dto: CreateUserDto | UpdateUserDto) {
    if (editing) {
      const updated = await adminApi.updateUser(editing.id, dto as UpdateUserDto);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } else {
      const created = await adminApi.createUser(dto as CreateUserDto);
      setUsers((prev) => [created, ...prev]);
    }
    closeForm();
  }

  async function handleDelete() {
    if (!deleting) return;
    await adminApi.deleteUser(deleting.id);
    setUsers((prev) => prev.filter((u) => u.id !== deleting.id));
    closeDelete();
    setDeleting(null);
  }

  const registered = users.filter((u) => !u.isGuest).length;
  const guests = users.filter((u) => u.isGuest).length;
  const admins = users.filter((u) => u.isAdmin).length;

  return (
    <>
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2}>Usuarios</Title>
            <Text size="sm" c="dimmed">
              {users.length} total · {registered} registrados · {guests} invitados · {admins} admins
              </Text>
          </div>
          <Button leftSection={<IconUserPlus size={16} />} onClick={handleNewUser}>
            Nuevo usuario
          </Button>
        </Group>

        {loading ? (
          <Center h={200}><Loader /></Center>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Usuario</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Partidas</Table.Th>
                <Table.Th>Registro</Table.Th>
                <Table.Th w={120} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Avatar size="sm" color={u.isAdmin ? 'yellow' : u.isGuest ? 'gray' : 'blue'} radius="xl">
                        {u.isAdmin ? <IconCrown size={14} /> : u.isGuest ? <IconUser size={14} /> : u.nickname[0].toUpperCase()}
                      </Avatar>
                      <Text fw={600} size="sm">{u.nickname}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={u.email ? undefined : 'dimmed'}>
                      {u.email ?? '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {u.isAdmin ? (
                      <Badge color="yellow" c="dark" leftSection={<IconShieldHalf size={12} />}>
                        Admin
                      </Badge>
                    ) : u.isGuest ? (
                      <Badge color="gray" variant="outline">Invitado</Badge>
                    ) : (
                      <Badge color="blue" variant="light">Registrado</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{u.gamesPlayed}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(u.createdAt).toLocaleDateString('es-CL')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip label="Ver partidas">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => handleViewGames(u)}
                          disabled={u.gamesPlayed === 0}
                        >
                          <IconDeviceGamepad2 size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Editar">
                        <ActionIcon variant="subtle" onClick={() => handleEditUser(u)}>
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Eliminar">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleDeleteUser(u)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {users.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="xl">No hay usuarios registrados</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      {/* Modal crear/editar */}
      <Modal
        opened={formOpened}
        onClose={closeForm}
        title={editing ? `Editar: ${editing.nickname}` : 'Nuevo usuario'}
        size="sm"
      >
        <UserForm editing={editing} onSave={handleSave} onClose={closeForm} />
      </Modal>

      {/* Modal confirmar eliminación */}
      <Modal
        opened={deleteOpened}
        onClose={() => { closeDelete(); setDeleting(null); }}
        title="Eliminar usuario"
        size="sm"
      >
        {deleting && (
          <DeleteConfirm
            user={deleting}
            onConfirm={handleDelete}
            onClose={() => { closeDelete(); setDeleting(null); }}
          />
        )}
      </Modal>

      {/* Drawer partidas del usuario */}
      <Drawer
        opened={gamesOpened}
        onClose={() => { closeGames(); setViewingGames(null); }}
        title={viewingGames ? `Partidas de ${viewingGames.nickname}` : ''}
        position="right"
        size="lg"
      >
        {viewingGames && (
          <GamesDrawer
            user={viewingGames}
            onClose={() => { closeGames(); setViewingGames(null); }}
            onGoToGame={(id) => navigate(`/games/${id}`)}
          />
        )}
      </Drawer>
    </>
  );
}
