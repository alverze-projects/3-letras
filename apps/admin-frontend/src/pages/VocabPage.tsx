import { useEffect, useState, useRef } from 'react';
import {
  Title, Text, Stack, Group, TextInput, Button, ActionIcon, Tooltip,
  Table, Badge, Pagination, Loader, Center, Modal, Alert,
  Switch,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSearch, IconPlus, IconPencil, IconTrash,
  IconAlertCircle, IconBook,
} from '@tabler/icons-react';
import { adminApi, type IVocabEntry } from '../services/api';

const PAGE_SIZE = 50;

// ─── Modal agregar / editar ───────────────────────────────────────────────────

interface WordFormProps {
  editing: IVocabEntry | null;
  onSave: (word: string) => Promise<void>;
  onClose: () => void;
}

function WordForm({ editing, onSave, onClose }: WordFormProps) {
  const [word, setWord] = useState(editing?.word ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = word.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    try {
      await onSave(trimmed);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al guardar');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label="Palabra"
          placeholder="Ej: MURCIÉLAGO"
          value={word}
          onChange={(e) => setWord(e.currentTarget.value)}
          required
          autoFocus
          ff="monospace"
        />
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">{error}</Alert>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" loading={loading}>
            {editing ? 'Guardar' : 'Agregar'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

// ─── Modal confirmar eliminación ──────────────────────────────────────────────

function DeleteConfirm({ word, onConfirm, onClose }: { word: IVocabEntry; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setError(null);
    setLoading(true);
    try { await onConfirm(); }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Error'); setLoading(false); }
  }

  return (
    <Stack gap="md">
      <Text>¿Eliminar la palabra <Text span ff="monospace" fw={700}>{word.word}</Text>?</Text>
      {error && <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">{error}</Alert>}
      <Group justify="flex-end">
        <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button color="red" loading={loading} onClick={handle}>Eliminar</Button>
      </Group>
    </Stack>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VocabPage() {
  const [words, setWords] = useState<IVocabEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<IVocabEntry | null>(null);
  const [deleting, setDeleting] = useState<IVocabEntry | null>(null);
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(p = page, q = search, showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      const result = await adminApi.listVocab({ search: q, page: p, limit: PAGE_SIZE });
      setWords(result.words);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  // Carga inicial
  useEffect(() => { load(1, '', true); }, []);

  // Debounce en búsqueda
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      load(1, search, true);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Cambio de página
  function handlePageChange(p: number) {
    setPage(p);
    load(p, search, true);
  }

  async function handleToggleActive(entry: IVocabEntry) {
    try {
      const updated = await adminApi.updateVocabWord(entry.id, { isActive: !entry.isActive });
      setWords((prev) => prev.map((w) => w.id === updated.id ? updated : w));
    } catch { /* silencioso */ }
  }

  async function handleSave(word: string) {
    if (editing) {
      const updated = await adminApi.updateVocabWord(editing.id, { word });
      setWords((prev) => prev.map((w) => w.id === updated.id ? updated : w));
    } else {
      await adminApi.createVocabWord(word);
      // recargamos para que aparezca en el lugar correcto (orden alfabético)
      await load(page, search, false);
    }
    closeForm();
    setEditing(null);
  }

  async function handleDelete() {
    await adminApi.deleteVocabWord(deleting!.id);
    setWords((prev) => prev.filter((w) => w.id !== deleting!.id));
    setTotal((t) => t - 1);
    closeDelete();
    setDeleting(null);
  }

  const activeCount = words.filter((w) => w.isActive).length;

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs" mb={4}>
              <IconBook size={24} />
              <Title order={2}>Diccionario</Title>
            </Group>
            <Text size="sm" c="dimmed">
              {total.toLocaleString('es-CL')} palabras en total
              {words.length > 0 && ` · ${activeCount} activas en esta página`}
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => { setEditing(null); openForm(); }}
          >
            Agregar palabra
          </Button>
        </Group>

        <TextInput
          placeholder="Buscar palabra…"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ maxWidth: 340 }}
          ff="monospace"
        />

        {loading ? (
          <Center h={200}><Loader /></Center>
        ) : (
          <>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Palabra</Table.Th>
                  <Table.Th w={140}>Estado</Table.Th>
                  <Table.Th>Agregada</Table.Th>
                  <Table.Th w={90} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {words.map((w) => (
                  <Table.Tr key={w.id}>
                    <Table.Td>
                      <Text ff="monospace" fw={600} size="sm">{w.word}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Switch
                          size="xs"
                          checked={w.isActive}
                          onChange={() => handleToggleActive(w)}
                        />
                        <Badge
                          size="xs"
                          color={w.isActive ? 'green' : 'gray'}
                          variant="light"
                        >
                          {w.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(w.createdAt).toLocaleDateString('es-CL')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Editar">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => { setEditing(w); openForm(); }}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Eliminar">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => { setDeleting(w); openDelete(); }}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {words.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text ta="center" c="dimmed" py="xl">
                        {search ? 'No hay palabras que coincidan con la búsqueda' : 'El diccionario está vacío'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>

            {totalPages > 1 && (
              <Group justify="center">
                <Pagination
                  total={totalPages}
                  value={page}
                  onChange={handlePageChange}
                  size="sm"
                />
              </Group>
            )}
          </>
        )}
      </Stack>

      <Modal
        opened={formOpened}
        onClose={() => { closeForm(); setEditing(null); }}
        title={editing ? `Editar: ${editing.word}` : 'Agregar palabra'}
        size="sm"
      >
        <WordForm
          editing={editing}
          onSave={handleSave}
          onClose={() => { closeForm(); setEditing(null); }}
        />
      </Modal>

      <Modal
        opened={deleteOpened}
        onClose={() => { closeDelete(); setDeleting(null); }}
        title="Eliminar palabra"
        size="sm"
      >
        {deleting && (
          <DeleteConfirm
            word={deleting}
            onConfirm={handleDelete}
            onClose={() => { closeDelete(); setDeleting(null); }}
          />
        )}
      </Modal>
    </>
  );
}
