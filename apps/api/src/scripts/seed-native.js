/**
 * Script de inserción de vocabulario ultra optimizado para bajos recursos (500MB RAM).
 * No requiere typescript, ts-node, ni el contexto de NestJS.
 * Utiliza solo `fs`, `readline`, `crypto` y `better-sqlite3`.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const AdmZip = require('adm-zip');

const ZIP_URL = 'https://corpus.rae.es/frec/CREA_total.zip';
const TXT_FILENAME = 'CREA_total.TXT';
const LOCAL_ZIP_PATH = path.join(process.cwd(), 'data/CREA_total.zip');
const DB_PATH = path.join(process.cwd(), 'data/tresletras.db');

async function run() {
    console.log('🚀 Iniciando script de seed nativo (consumo de RAM minimizado)');

    // 1. Verificamos base de datos
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(DB_PATH);

    // Nos aseguramos que la tabla exista (con el mismo formato que usa TypeORM)
    db.exec(`
    CREATE TABLE IF NOT EXISTS "vocab_entries" (
      "id" varchar PRIMARY KEY NOT NULL, 
      "word" text NOT NULL, 
      "isActive" boolean NOT NULL DEFAULT (1), 
      "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "IDX_e64bc60865e14297039049cde4" ON "vocab_entries" ("word");
  `);

    const existingCount = db.prepare('SELECT COUNT(*) as c FROM vocab_entries').get().c;
    if (existingCount > 0) {
        console.log(`\nℹ️   La tabla ya tiene ${existingCount.toLocaleString('es-CL')} palabras.`);
        console.log('    Las nuevas se agregarán; las duplicadas se ignorarán.\n');
    }

    // 2. Extraer o verificar ZIP
    if (!fs.existsSync(LOCAL_ZIP_PATH)) {
        console.error(`❌ El archivo local no se encontró en: ${LOCAL_ZIP_PATH}`);
        console.error(`💡 Por favor descarga manualmente el ZIP desde ${ZIP_URL} y colócalo en la carpeta apps/api/data/`);
        process.exit(1);
    }

    const extractedTxtPath = path.join(dbDir, TXT_FILENAME);
    if (!fs.existsSync(extractedTxtPath)) {
        console.log(`Extrayendo ${TXT_FILENAME} a disco... esto ahorra mucha memoria RAM.`);
        const zip = new AdmZip(LOCAL_ZIP_PATH);
        zip.extractEntryTo(TXT_FILENAME, dbDir, false, true);
        console.log(`✅ Extracción completada en ${extractedTxtPath}`);
    } else {
        console.log(`✅ Archivo TXT ya existe en: ${extractedTxtPath}`);
    }

    // 3. Leer e insertar en lote (Transacciones)
    console.log('Procesando e insertando palabras leyendo directo de disco (stream nativo)...');
    const start = Date.now();
    let totalProcessed = 0;
    let insertedCount = 0;

    const insertWord = db.prepare('INSERT OR IGNORE INTO vocab_entries (id, word, isActive, createdAt) VALUES (?, ?, 1, datetime("now"))');

    // Usamos una transacción para agrupamiento e inserciones muy rápidas (~1000 veces más rápido que de a una)
    const insertBatch = db.transaction((words) => {
        let newInserts = 0;
        for (const w of words) {
            const res = insertWord.run(randomUUID(), w);
            if (res.changes > 0) newInserts++;
        }
        return newInserts;
    });

    let batch = [];
    const BATCH_SIZE = 5000;

    const fileStream = fs.createReadStream(extractedTxtPath, { encoding: 'latin1' });
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
        batch.push(word);

        if (batch.length >= BATCH_SIZE) {
            insertedCount += insertBatch(batch);
            batch.length = 0; // vaciar array para GC
            if (totalProcessed % 20000 === 0) {
                process.stdout.write(`\r  Progreso: ${totalProcessed.toLocaleString('es-CL')} analizadas, ${insertedCount.toLocaleString('es-CL')} insertadas...`);
            }
        }
    }

    // Insertar remanente
    if (batch.length > 0) {
        insertedCount += insertBatch(batch);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const total = db.prepare('SELECT COUNT(*) as c FROM vocab_entries').get().c;

    console.log('\n');
    console.log(`✅  Insertadas esta vez: ${insertedCount.toLocaleString('es-CL')}`);
    console.log(`⏭️   Ignoradas por existir: ${(totalProcessed - insertedCount).toLocaleString('es-CL')}`);
    console.log(`📊  Total en DB: ${total.toLocaleString('es-CL')}`);
    console.log(`⏱️   Tiempo: ${elapsed}s`);

    db.close();
}

run().catch(err => {
    console.error('\n❌  Error durante el seed:', err.message ?? err);
    process.exit(1);
});
