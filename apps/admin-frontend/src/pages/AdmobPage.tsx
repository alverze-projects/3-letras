import { useEffect, useState } from 'react';
import {
  Title, Text, Stack, Group, Switch, TextInput, Button,
  Card, Divider, Loader, Center, Alert, Badge, Tabs,
} from '@mantine/core';
import {
  IconBrandAndroid, IconBrandApple, IconAd,
  IconAlertCircle, IconCheck,
} from '@tabler/icons-react';
import { adminApi, type IAdmobConfig } from '../services/api';

const EMPTY: Omit<IAdmobConfig, 'id' | 'updatedAt'> = {
  enabled: false,
  testMode: true,
  androidAppId: '',
  bannerAndroid: '',
  interstitialAndroid: '',
  rewardedAndroid: '',
  iosAppId: '',
  bannerIos: '',
  interstitialIos: '',
  rewardedIos: '',
};

function n(v: string | null | undefined): string {
  return v ?? '';
}

export default function AdmobPage() {
  const [config, setConfig] = useState<Omit<IAdmobConfig, 'id' | 'updatedAt'>>(EMPTY);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getAdmob()
      .then((data) => {
        setConfig({
          enabled: data.enabled,
          testMode: data.testMode,
          androidAppId: n(data.androidAppId),
          bannerAndroid: n(data.bannerAndroid),
          interstitialAndroid: n(data.interstitialAndroid),
          rewardedAndroid: n(data.rewardedAndroid),
          iosAppId: n(data.iosAppId),
          bannerIos: n(data.bannerIos),
          interstitialIos: n(data.interstitialIos),
          rewardedIos: n(data.rewardedIos),
        });
        setUpdatedAt(data.updatedAt);
      })
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const data = await adminApi.updateAdmob({
        ...config,
        androidAppId: config.androidAppId || null,
        bannerAndroid: config.bannerAndroid || null,
        interstitialAndroid: config.interstitialAndroid || null,
        rewardedAndroid: config.rewardedAndroid || null,
        iosAppId: config.iosAppId || null,
        bannerIos: config.bannerIos || null,
        interstitialIos: config.interstitialIos || null,
        rewardedIos: config.rewardedIos || null,
      });
      setUpdatedAt(data.updatedAt);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof typeof config>(key: K, value: typeof config[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <Center h={300}><Loader /></Center>;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Group gap="xs" mb={4}>
            <IconAd size={24} />
            <Title order={2}>Google AdMob</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Configuración de anuncios para la app móvil
            {updatedAt && (
              <> · última actualización: {new Date(updatedAt).toLocaleString('es-CL')}</>
            )}
          </Text>
        </div>
        <Button
          leftSection={saved ? <IconCheck size={16} /> : undefined}
          color={saved ? 'green' : 'blue'}
          onClick={handleSave}
          loading={saving}
        >
          {saved ? 'Guardado' : 'Guardar'}
        </Button>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {error}
        </Alert>
      )}

      {/* Controles globales */}
      <Card shadow="sm" radius="md" withBorder>
        <Stack gap="md">
          <Text fw={600}>Estado general</Text>
          <Group>
            <Switch
              label="Habilitar anuncios"
              description="Activa o desactiva todos los anuncios en la app"
              checked={config.enabled}
              onChange={(e) => set('enabled', e.currentTarget.checked)}
              size="md"
            />
            {config.enabled
              ? <Badge color="green">Activo</Badge>
              : <Badge color="gray">Inactivo</Badge>
            }
          </Group>
          <Divider />
          <Group>
            <Switch
              label="Modo de prueba"
              description="Usa anuncios de prueba de Google. Desactívalo solo en producción"
              checked={config.testMode}
              onChange={(e) => set('testMode', e.currentTarget.checked)}
              size="md"
            />
            {config.testMode
              ? <Badge color="yellow" c="dark">Test</Badge>
              : <Badge color="red">Producción</Badge>
            }
          </Group>
        </Stack>
      </Card>

      {/* Ad unit IDs por plataforma */}
      <Tabs defaultValue="android" variant="outline">
        <Tabs.List>
          <Tabs.Tab value="android" leftSection={<IconBrandAndroid size={16} />}>
            Android
          </Tabs.Tab>
          <Tabs.Tab value="ios" leftSection={<IconBrandApple size={16} />}>
            iOS
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="android" pt="md">
          <Card shadow="sm" radius="md" withBorder>
            <Stack gap="md">
              <TextInput
                label="App ID"
                description="Ej: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                placeholder="ca-app-pub-..."
                value={config.androidAppId}
                onChange={(e) => set('androidAppId', e.currentTarget.value)}
                ff="monospace"
              />
              <Divider label="Unidades de anuncio" labelPosition="left" />
              <TextInput
                label="Banner"
                description="Se muestra como barra fija en pantalla"
                placeholder="ca-app-pub-..."
                value={config.bannerAndroid}
                onChange={(e) => set('bannerAndroid', e.currentTarget.value)}
                ff="monospace"
              />
              <TextInput
                label="Intersticial"
                description="Anuncio a pantalla completa entre pantallas"
                placeholder="ca-app-pub-..."
                value={config.interstitialAndroid}
                onChange={(e) => set('interstitialAndroid', e.currentTarget.value)}
                ff="monospace"
              />
              <TextInput
                label="Recompensado"
                description="El usuario ve el anuncio a cambio de una recompensa"
                placeholder="ca-app-pub-..."
                value={config.rewardedAndroid}
                onChange={(e) => set('rewardedAndroid', e.currentTarget.value)}
                ff="monospace"
              />
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="ios" pt="md">
          <Card shadow="sm" radius="md" withBorder>
            <Stack gap="md">
              <TextInput
                label="App ID"
                description="Ej: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                placeholder="ca-app-pub-..."
                value={config.iosAppId}
                onChange={(e) => set('iosAppId', e.currentTarget.value)}
                ff="monospace"
              />
              <Divider label="Unidades de anuncio" labelPosition="left" />
              <TextInput
                label="Banner"
                description="Se muestra como barra fija en pantalla"
                placeholder="ca-app-pub-..."
                value={config.bannerIos}
                onChange={(e) => set('bannerIos', e.currentTarget.value)}
                ff="monospace"
              />
              <TextInput
                label="Intersticial"
                description="Anuncio a pantalla completa entre pantallas"
                placeholder="ca-app-pub-..."
                value={config.interstitialIos}
                onChange={(e) => set('interstitialIos', e.currentTarget.value)}
                ff="monospace"
              />
              <TextInput
                label="Recompensado"
                description="El usuario ve el anuncio a cambio de una recompensa"
                placeholder="ca-app-pub-..."
                value={config.rewardedIos}
                onChange={(e) => set('rewardedIos', e.currentTarget.value)}
                ff="monospace"
              />
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
