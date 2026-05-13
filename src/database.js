// src/database.js
// Sincronizacao de dados com Firestore
// Fallback para localStorage quando offline

import {
  collection, doc, getDocs, setDoc, addDoc,
  onSnapshot, writeBatch, serverTimestamp,
  query, orderBy, limit,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { BASE_E, BASE_SD, BASE_SR } from './data.js'

const COLLECTIONS = {
  entradas:    'entradas',
  saidas_div:  'saidas_diversos',
  saidas_rodo: 'saidas_rodo',
  users:       'users',
}

// ── Cache local ───────────────────────────────────────────────────────────────
let cache = { entradas: null, saidas_div: null, saidas_rodo: null }

// ── Verificar se Firestore esta acessivel ─────────────────────────────────────
let _firestoreOk = null
export async function checkFirestore() {
  if (_firestoreOk !== null) return _firestoreOk
  try {
    await getDocs(query(collection(db, 'entradas'), limit(1)))
    _firestoreOk = true
  } catch {
    _firestoreOk = false
  }
  return _firestoreOk
}

// ── Carregar dados ────────────────────────────────────────────────────────────
export async function loadData(collectionName) {
  // 1. Tentar Firestore
  try {
    const snap = await getDocs(collection(db, collectionName))
    if (!snap.empty) {
      const data = snap.docs.map(d => ({ _id: d.id, ...d.data() }))
      localStorage.setItem(`inpasa_${collectionName}`, JSON.stringify(data))
      return data
    }
  } catch (e) {
    console.warn('Firestore indisponivel, usando cache local:', e.message)
  }
  // 2. Tentar localStorage
  const cached = localStorage.getItem(`inpasa_${collectionName}`)
  if (cached) return JSON.parse(cached)
  // 3. Fallback para dados embutidos
  const fallback = { entradas: BASE_E, saidas_diversos: BASE_SD, saidas_rodo: BASE_SR }
  return fallback[collectionName] || []
}

// ── Salvar registro ───────────────────────────────────────────────────────────
export async function saveRecord(collectionName, record, id = null) {
  const data = { ...record, updatedAt: new Date().toISOString() }
  // Firestore
  try {
    if (id) {
      await setDoc(doc(db, collectionName, id), data, { merge: true })
    } else {
      const ref = await addDoc(collection(db, collectionName), data)
      data._id = ref.id
    }
  } catch (e) {
    console.warn('Firestore write falhou, salvando localmente:', e.message)
    // Fila offline
    const queue = JSON.parse(localStorage.getItem('inpasa_offline_queue') || '[]')
    queue.push({ collectionName, record: data, id, ts: Date.now() })
    localStorage.setItem('inpasa_offline_queue', JSON.stringify(queue))
  }
  // Sempre atualiza localStorage como cache
  const cached = JSON.parse(localStorage.getItem(`inpasa_${collectionName}`) || '[]')
  if (id) {
    const idx = cached.findIndex(r => r._id === id)
    if (idx >= 0) cached[idx] = data; else cached.push(data)
  } else {
    cached.push(data)
  }
  localStorage.setItem(`inpasa_${collectionName}`, JSON.stringify(cached))
  return data
}

// ── Importar lote completo (substitui colecao) ────────────────────────────────
export async function importBatch(collectionName, records) {
  const CHUNK = 450 // Firestore batch limit = 500
  const chunks = []
  for (let i = 0; i < records.length; i += CHUNK) chunks.push(records.slice(i, i + CHUNK))

  try {
    for (const chunk of chunks) {
      const batch = writeBatch(db)
      chunk.forEach((record, i) => {
        const ref = doc(collection(db, collectionName))
        batch.set(ref, { ...record, _importedAt: new Date().toISOString() })
      })
      await batch.commit()
    }
    // Atualiza cache
    localStorage.setItem(`inpasa_${collectionName}`, JSON.stringify(records))
    return { ok: true, count: records.length }
  } catch (e) {
    // Salva so no localStorage se Firestore falhar
    localStorage.setItem(`inpasa_${collectionName}`, JSON.stringify(records))
    return { ok: false, count: records.length, error: e.message }
  }
}

// ── Sincronizar fila offline ──────────────────────────────────────────────────
export async function syncOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem('inpasa_offline_queue') || '[]')
  if (!queue.length) return 0
  let synced = 0
  const remaining = []
  for (const item of queue) {
    try {
      if (item.id) {
        await setDoc(doc(db, item.collectionName, item.id), item.record, { merge: true })
      } else {
        await addDoc(collection(db, item.collectionName), item.record)
      }
      synced++
    } catch {
      remaining.push(item)
    }
  }
  localStorage.setItem('inpasa_offline_queue', JSON.stringify(remaining))
  return synced
}

// ── Limpar colecao ────────────────────────────────────────────────────────────
export async function clearCollection(collectionName) {
  localStorage.removeItem(`inpasa_${collectionName}`)
  try {
    const snap = await getDocs(collection(db, collectionName))
    const CHUNK = 450
    const docs = snap.docs
    for (let i = 0; i < docs.length; i += CHUNK) {
      const batch = writeBatch(db)
      docs.slice(i, i + CHUNK).forEach(d => batch.delete(d.ref))
      await batch.commit()
    }
  } catch (e) {
    console.warn('Firestore delete falhou:', e.message)
  }
}
