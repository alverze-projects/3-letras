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

  // ── Estado actual ─────────────────────────────────────────────────────────────
  const existing = await repo.count();
  if (existing > 0) {
    console.log(`\nℹ️   La tabla ya tiene ${existing.toLocaleString('es-CL')} palabras.`);
    console.log('    Las nuevas se agregarán; las duplicadas se ignorarán.\n');
  }

  // ── Parsear e Insertar por Lotes (Low Memory footprint) ─────────────────────
  console.log('Procesando e insertando palabras bajo consumo de RAM...');
  const start = Date.now();
  const now = new Date();

  let batchBuffer: Partial<VocabEntry>[] = [];
  let totalProcessed = 0;
  let insertedCount = 0;

  // Creamos un stream falso a partir del buffer para no cargar strings gigantes en RAM
  const { Readable } = require('stream');
  const bufferStream = new Readable();
  bufferStream.push(txtBuffer);
  bufferStream.push(null);

  const readline = require('readline');
  const rl = readline.createInterface({
    input: bufferStream,
    crlfDelay: Infinity,
  });

  for await (let line of rl) {
    line = line.toString('latin1'); // Decodificar correctamente ISO-8859-1
    if (!line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length < 2) continue;
    if (!/^\s*\d+\.\s*$/.test(parts[0])) continue;

    const word = parts[1].trim();
    if (!word) continue;

    totalProcessed++;
    batchBuffer.push({
      id: randomUUID(),
      word,
      isActive: true,
      createdAt: now,
    });

    // Insertar cuando el batch se llena
    if (batchBuffer.length >= BATCH) {
      await repo.createQueryBuilder()
        .insert()
        .into(VocabEntry)
        .values(batchBuffer)
        .orIgnore()
        .execute();

      insertedCount += batchBuffer.length;
      batchBuffer = []; // Limpiar RAM

      if (insertedCount % 10000 === 0) {
        process.stdout.write(`\r  Progreso: ${insertedCount.toLocaleString('es-CL')} palabras insertadas...`);
      }
    }
  }

  // Insertar remanente si sobran palabras al acabar el archivo
  if (batchBuffer.length > 0) {
    await repo.createQueryBuilder()
      .insert()
      .into(VocabEntry)
      .values(batchBuffer)
      .orIgnore()
      .execute();
    insertedCount += batchBuffer.length;
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const total = await repo.count();
  const inserted = total - existing;

  console.log('\n');
  console.log(`✅  Insertadas : ${inserted.toLocaleString('es-CL')}`);
  if (totalProcessed - inserted > 0)
    console.log(`⏭️   Ignoradas  : ${(totalProcessed - inserted).toLocaleString('es-CL')} (ya existían)`);
  console.log(`⏱️   Tiempo     : ${elapsed}s`);

  await app.close();
}

bootstrap().catch((err) => {
  console.error('\n❌  Error durante el seed:', err.message ?? err);
  process.exit(1);
});
