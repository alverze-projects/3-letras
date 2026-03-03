/**
 * Importa todas las palabras de files/CREA_total.TXT a la tabla vocab_entries
 * usando NestJS + TypeORM (compatible con SQLite, MySQL, PostgreSQL, etc.)
 *
 * Uso:
 *   npm run seed:vocab          (desde apps/api/)
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { AppModule } from '../app.module';
import { VocabEntry } from '../entities/vocab-entry.entity';

const FILE_PATH = path.join(__dirname, '../../../../files/CREA_total.TXT');
const BATCH = 200;

async function bootstrap() {
  // ── Verificar archivo ────────────────────────────────────────────────────────
  if (!fs.existsSync(FILE_PATH)) {
    console.error(`\n❌  Archivo no encontrado: ${FILE_PATH}\n`);
    process.exit(1);
  }

  // ── Iniciar contexto NestJS (sin HTTP server) ────────────────────────────────
  console.log('Iniciando contexto NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const repo = app.get<Repository<VocabEntry>>(getRepositoryToken(VocabEntry));

  // ── Leer y parsear ────────────────────────────────────────────────────────────
  console.log('Leyendo archivo...');
  const buffer = fs.readFileSync(FILE_PATH);
  const content = buffer.toString('latin1');       // ISO-8859-1 → string JS
  const lines = content.split('\r\n');             // CRLF

  const words: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;

    // Columnas separadas por tabulación: "   N.\t palabra \t freq \t norm"
    const parts = line.split('\t');
    if (parts.length < 2) continue;

    // La primera columna debe ser un número seguido de punto
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
