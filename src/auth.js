// src/auth.js
// Gerenciamento de autenticacao via Firebase Auth

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase.js'

// ── Usuarios master pre-configurados ─────────────────────────────────────────
// Estes usuarios sao criados automaticamente no primeiro acesso ao sistema.
// As senhas sao definidas aqui APENAS para o seed inicial — apos criados no
// Firebase, este arquivo nao e mais necessario para autenticacao.
export const MASTER_USERS = [
  {
    email: 'bruno.novaes@inpasa.com.br',
    password: 'Inpasa@123',
    name: 'Bruno Novaes',
    role: 'master',
  },
  {
    email: 'rafael.mulato@inpasa.com.br',
    password: 'Inpasa@123',
    name: 'Rafael Mulato',
    role: 'master',
  },
]

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const profile = await getUserProfile(cred.user.uid)
    return { user: cred.user, profile, error: null }
  } catch (err) {
    const msgs = {
      'auth/user-not-found':    'Email nao encontrado.',
      'auth/wrong-password':    'Senha incorreta.',
      'auth/invalid-credential':'Email ou senha invalidos.',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
      'auth/user-disabled':     'Conta desativada. Contate o administrador.',
    }
    return { user: null, profile: null, error: msgs[err.code] || 'Erro ao fazer login.' }
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth)
}

// ── Criar novo usuario ────────────────────────────────────────────────────────
export async function createUser({ email, password, name, role = 'user' }) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      name,
      role,
      createdAt: serverTimestamp(),
      active: true,
    })
    return { uid: cred.user.uid, error: null }
  } catch (err) {
    const msgs = {
      'auth/email-already-in-use': 'Este email ja esta em uso.',
      'auth/weak-password':        'Senha fraca. Use pelo menos 6 caracteres.',
      'auth/invalid-email':        'Email invalido.',
    }
    return { uid: null, error: msgs[err.code] || 'Erro ao criar usuario.' }
  }
}

// ── Buscar perfil do usuario no Firestore ─────────────────────────────────────
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? snap.data() : null
  } catch {
    return null
  }
}

// ── Listar todos os usuarios (apenas master) ──────────────────────────────────
export async function listUsers() {
  try {
    const snap = await getDocs(collection(db, 'users'))
    return snap.docs.map(d => d.data())
  } catch {
    return []
  }
}

// ── Observar mudancas de autenticacao ─────────────────────────────────────────
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

// ── Verificar se usuario e master ─────────────────────────────────────────────
export function isMaster(profile) {
  return profile?.role === 'master'
}
