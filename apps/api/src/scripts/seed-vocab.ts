/**
 * Descarga el corpus CREA de la RAE, extrae las palabras e importa a vocab_entries
 * usando NestJS + TypeORM (compatible con SQLite, MySQL, PostgreSQL, etc.)
 *
 * Uso:
 *   npm run seed:vocab          (desde apps/api/)
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as https from 'https';
import * as http from 'http';
import AdmZip = require('adm-zip');
import { randomUUID } from 'crypto';
import { AppModule } from '../app.module';
import { VocabEntry } from '../entities/vocab-entry.entity';

const ZIP_URL      = 'https://corpus.rae.es/frec/CREA_total.zip';
const TXT_FILENAME = 'CREA_total.TXT';
const BATCH        = 200;

// ── Descarga con soporte de redirecciones y progreso ────────────────────────
function downloadBuffer(url: string, depth = 0): Promise<Buffer> {
  if (depth > 5) return Promise.reject(new Error('Demasiadas redirecciones'));

  return new Promise((resolve, reject) => {
    const get = url.startsWith('https://') ? https.get : http.get;

    get(url, (res) => {
      // Seguir redirecciones
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location, depth + 1).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} al descargar ${url}`));
      }

      const total = parseInt(res.headers['content-length'] ?? '0', 10);
      const chunks: Buffer[] = [];
      let received = 0;

      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        received += chunk.length;
        const mb  = (received / 1_048_576).toFixed(1);
        const pct = total ? `${Math.round((received / total) * 100)}%` : `${mb} MB`;
        process.stdout.write(`\r  Descargando... ${pct}  (${mb} MB)`);
      });

      res.on('end', () => {
        process.stdout.write('\n');
        resolve(Buffer.concat(chunks));
      });

      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function bootstrap() {
  // Iniciar contexto NestJS (sin HTTP server)
  console.log('Iniciando contexto NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const repo = app.get<Repository<VocabEntry>>(getRepositoryToken(VocabEntry));

  // ── Descargar ZIP ────────────────────────────────────────────────────────────
  console.log(`Descargando ${ZIP_URL}`);
  const zipBuffer = await downloadBuffer(ZIP_URL);
  console.log(`ZIP descargado: ${(zipBuffer.length / 1_048_576).toFixed(1)} MB`);

  // ── Extraer TXT del ZIP en memoria ───────────────────────────────────────────
  console.log(`Extrayendo ${TXT_FILENAME}...`);
  const zip   = new AdmZip(zipBuffer);
  const entry = zip.getEntry(TXT_FILENAME);
  if (!entry) throw new Error(`${TXT_FILENAME} no encontrado dentro del ZIP`);

  const txtBuffer = entry.getData();
  const content   = txtBuffer.toString('latin1');  // ISO-8859-1 → string JS
  const lines     = content.split('\r\n');          // CRLF

  // ── Parsear palabras ─────────────────────────────────────────────────────────
  const words: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;

    // Columnas separadas por tabulación: "   N.\t palabra \t freq \t norm"
    const parts = line.split('\t');
    if (parts.length < 2) continue;

    // Primera columna: número seguido de punto
    if (!/^\s*\d+\.\s*$/.test(parts[0])) continue;

    const word = parts[1].trim();
    if (!word) continue;

    words.push(word);
  }

  console.log(`Palabras parseadas: ${words.length.toLocaleString('es-CL')}`);

  // ── Estado actual ─────────────────────────────────────────────────────────────
  const existing = await repo.count();
  if (existing > 0) {
    console.log(`\nℹ️   La tabla ya tiene ${existing.toLocaleString('es-CL')} palabras.`);
    console.log('    Las nuevas se agregarán; las duplicadas se ignorarán.\n');
  }

  // ── Insertar en transacción ───────────────────────────────────────────────────
  console.log('Insertando palabras...');
  const start = Date.now();
  const now   = new Date();

  await repo.manager.transaction(async (manager) => {
    for (let i = 0; i < words.length; i += BATCH) {
      const batch = words.slice(i, i + BATCH);

      await manager
        .createQueryBuilder()
        .insert()
        .into(VocabEntry)
        .values(batch.map((word) => ({
          id:        randomUUID(),
          word,
          isActive:  true,
          createdAt: now,
        })))
        .orIgnore()
        .execute();

      const done = Math.min(i + BATCH, words.length);
      const pct  = Math.round((done / words.length) * 100);
      process.stdout.write(
        `\r  ${pct}%  (${done.toLocaleString('es-CL')} / ${words.length.toLocaleString('es-CL')})`,
      );
    }
  });

  const elapsed  = ((Date.now() - start) / 1000).toFixed(1);
  const total    = await repo.count();
  const inserted = total - existing;

  console.log('\n');
  console.log(`✅  Insertadas : ${inserted.toLocaleString('es-CL')}`);
  if (words.length - inserted > 0)
    console.log(`⏭️   Ignoradas  : ${(words.length - inserted).toLocaleString('es-CL')} (ya existían)`);
  console.log(`⏱️   Tiempo     : ${elapsed}s`);

  await app.close();
}

bootstrap().catch((err) => {
  console.error('\n❌  Error durante el seed:', err.message ?? err);
  process.exit(1);
});
