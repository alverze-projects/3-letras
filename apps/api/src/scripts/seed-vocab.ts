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
const LOCAL_ZIP_PATH = require('path').join(process.cwd(), 'data/CREA_total.zip');
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

  console.log(`Verificando TXT extraído en disco...`);
  const fs = require('fs');
  const path = require('path');
  const targetDataDir = path.join(process.cwd(), 'data');
  const extractedTxtPath = path.join(targetDataDir, TXT_FILENAME);

  if (!fs.existsSync(extractedTxtPath)) {
    console.log(`Extrayendo ${TXT_FILENAME} a disco... esto ahorra mucha memoria RAM.`);
    // Pasamos la ruta del archivo a AdmZip, para evitar cargar todo el ZIP en memoria principal con readFileSync
    const zip = new AdmZip(LOCAL_ZIP_PATH);
    zip.extractEntryTo(TXT_FILENAME, targetDataDir, false, true);
    console.log(`✅ Extracción completada en ${extractedTxtPath}`);
  } else {
    console.log(`✅ Archivo TXT ya existe en: ${extractedTxtPath}`);
  }

  // ── Estado actual ─────────────────────────────────────────────────────────────
  const existing = await repo.count();
  if (existing > 0) {
    console.log(`\nℹ️   La tabla ya tiene ${existing.toLocaleString('es-CL')} palabras.`);
    console.log('    Las nuevas se agregarán; las duplicadas se ignorarán.\n');
  }

  // ── Parsear e Insertar por Lotes (Low Memory footprint) ─────────────────────
  console.log('Procesando e insertando palabras leyendo directo de disco (stream)...');
  const start = Date.now();
  const now = new Date();

  let batchBuffer: Partial<VocabEntry>[] = [];
  let totalProcessed = 0;
  let insertedCount = 0;

  // Creamos un stream real desde disco para no cargar strings en RAM
  const fileStream = fs.createReadStream(extractedTxtPath, { encoding: 'latin1' });

  const readline = require('readline');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
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
