import { useEffect, useState } from 'react';
import { Title, Card, Text, NumberInput, Button, Group, Container, Notification } from '@mantine/core';
import { IconSettings, IconCheck, IconDeviceFloppy } from '@tabler/icons-react';
import { adminApi } from '../services/api';

export default function ConfigPage() {
  const [, setConfig] = useState<any>(null);
  const [turnDuration, setTurnDuration] = useState<number | string>(25);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    adminApi.getGameConfig()
      .then((data) => {
        setConfig(data);
        setTurnDuration(data.turnDurationSeconds);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      const val = typeof turnDuration === 'string' ? parseInt(turnDuration) : turnDuration;
      const updated = await adminApi.updateGameConfig({ turnDurationSeconds: val });
      setConfig(updated);
      setMessage('Ajustes guardados correctamente.');
    } catch (err) {
      console.error(err);
      setMessage('Error al guardar ajustes.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) return <Container mt="xl"><Text c="dimmed">Cargando configuración...</Text></Container>;

  return (
    <Container size="md" py="xl">
      <Group mb="lg">
        <IconSettings size={32} color="#228be6" />
        <Title order={2}>Ajustes del Sistema</Title>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">Tiempos y Turnos</Title>
        
        <NumberInput
          label="Duración del Turno (segundos)"
          description="Tiempo total en segundos que tiene un jugador para completar la palabra durante su turno antes de fallar automáticamente."
          placeholder="Ej: 25"
          value={turnDuration}
          onChange={setTurnDuration}
          min={3}
          max={120}
          mb="xl"
          size="md"
        />

        <Group>
          <Button 
            leftSection={<IconDeviceFloppy size={18} />} 
            onClick={handleSave} 
            loading={saving}
          >
            Guardar Ajustes
          </Button>
        </Group>

        {message && (
          <Notification icon={<IconCheck size={18} />} color="teal" title="Éxito" mt="md" withCloseButton={false}>
            {message}
          </Notification>
        )}
      </Card>
    </Container>
  );
}
