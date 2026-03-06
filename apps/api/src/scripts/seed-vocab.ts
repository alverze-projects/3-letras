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

const ZIP_URL = 'https://corpus.rae.es/frec/CREA_total.zip';
const TXT_FILENAME = 'CREA_total.TXT';
const LOCAL_ZIP_PATH = require('path').join(__dirname, '../../data/CREA_total.zip');
const BATCH = 200;

// ── Main ─────────────────────────────────────────────────────────────────────
async function bootstrap() {
  // Iniciar contexto NestJS (sin HTTP server)
  console.log('Iniciando contexto NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const repo = app.get<Repository<VocabEntry>>(getRepositoryToken(VocabEntry));

  // ── Leer ZIP Local ────────────────────────────────────────────────────────
  if (!require('fs').existsSync(LOCAL_ZIP_PATH)) {
    console.error(`❌ El archivo local no se encontró en: ${LOCAL_ZIP_PATH}`);
    console.error(`💡 Por favor descarga manualmente el ZIP desde ${ZIP_URL} y colócalo en la carpeta apps/api/data/`);
    process.exit(1);
  }

  console.log(`Leyendo ZIP local desde: ${LOCAL_ZIP_PATH}`);
  const zipBuffer = require('fs').readFileSync(LOCAL_ZIP_PATH);
  console.log(`ZIP cargado en memoria: ${(zipBuffer.length / 1_048_576).toFixed(1)} MB`);

  // ── Extraer TXT del ZIP en memoria ───────────────────────────────────────────
  console.log(`Extrayendo ${TXT_FILENAME}...`);
  const zip = new AdmZip(zipBuffer);
  const entry = zip.getEntry(TXT_FILENAME);
  if (!entry) throw new Error(`${TXT_FILENAME} no encontrado dentro del ZIP`);

  const txtBuffer = entry.getData();
  const content = txtBuffer.toString('latin1');  // ISO-8859-1 → string JS
  const lines = content.split('\r\n');          // CRLF

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
  const now = new Date();

  await repo.manager.transaction(async (manager) => {
    for (let i = 0; i < words.length; i += BATCH) {
      const batch = words.slice(i, i + BATCH);

      await manager
        .createQueryBuilder()
        .insert()
        .into(VocabEntry)
        .values(batch.map((word) => ({
          id: randomUUID(),
          word,
          isActive: true,
          createdAt: now,
        })))
        .orIgnore()
        .execute();

      const done = Math.min(i + BATCH, words.length);
      const pct = Math.round((done / words.length) * 100);
      process.stdout.write(
        `\r  ${pct}%  (${done.toLocaleString('es-CL')} / ${words.length.toLocaleString('es-CL')})`,
      );
    }
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const total = await repo.count();
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
