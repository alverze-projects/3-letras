import { useState } from 'react';
import {
  Center, Paper, Title, Text, TextInput, PasswordInput,
  Button, Stack, Alert, Box,
} from '@mantine/core';
import { IconDeviceGamepad2, IconAlertCircle } from '@tabler/icons-react';
import { adminApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { accessToken } = await adminApi.login(email, password);
      login(accessToken);
    } catch {
      setError('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center h="100vh" bg="gray.0">
      <Box w={380}>
        <Stack align="center" mb="xl">
          <IconDeviceGamepad2 size={48} color="#FFD600" />
          <Title order={2} c="dark">TRES LETRAS</Title>
          <Text c="dimmed" size="sm">Panel de Administración</Text>
        </Stack>

        <Paper shadow="md" radius="md" p="xl" withBorder>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Correo electrónico"
                placeholder="admin@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                autoFocus
              />
              <PasswordInput
                label="Contraseña"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                  {error}
                </Alert>
              )}
              <Button type="submit" loading={loading} fullWidth mt="xs">
                Ingresar
              </Button>
            </Stack>
          </form>
        </Paper>
      </Box>
    </Center>
  );
}
