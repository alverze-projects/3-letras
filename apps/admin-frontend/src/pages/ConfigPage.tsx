import { useEffect, useState } from 'react';
import { Title, Card, Text, NumberInput, Button, Group, Container, Notification } from '@mantine/core';
import { IconSettings, IconCheck, IconDeviceFloppy } from '@tabler/icons-react';
import { adminApi } from '../services/api';

export default function ConfigPage() {
  const [, setConfig] = useState<any>(null);
  const [turnDuration, setTurnDuration] = useState<number | string>(25);
  const [soloRoundDuration, setSoloRoundDuration] = useState<number | string>(180);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    adminApi.getGameConfig()
      .then((data) => {
        setConfig(data);
        setTurnDuration(data.turnDurationSeconds);
        setSoloRoundDuration(data.soloRoundDurationSeconds);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      const turnVal = typeof turnDuration === 'string' ? parseInt(turnDuration) : turnDuration;
      const soloVal = typeof soloRoundDuration === 'string' ? parseInt(soloRoundDuration) : soloRoundDuration;
      
      const updated = await adminApi.updateGameConfig({ 
        turnDurationSeconds: turnVal,
        soloRoundDurationSeconds: soloVal,
      });
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
          description="Tiempo límite que tiene un jugador para completar su palabra individual antes de reprobar (Global)."
          placeholder="Ej: 25"
          value={turnDuration}
          onChange={setTurnDuration}
          min={3}
          max={120}
          mb="md"
          size="md"
        />

        <NumberInput
          label="Duración Global de Ronda en Solitario (segundos)"
          description="Tiempo límite total en el que el jugador puede agrupar puntos en una ronda de modo Solitario antes de que finalice la partida."
          placeholder="Ej: 180"
          value={soloRoundDuration}
          onChange={setSoloRoundDuration}
          min={10}
          max={900}
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
