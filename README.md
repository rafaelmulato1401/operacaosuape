# INPASA — Sistema de Gestão de Estoque

Sistema web para controle e atualização diária de estoque de etanol, com dashboard gerencial, painel rodoviário em tempo real, exportação em PDF/CSV e autenticação via Firebase.

---

## Estrutura do Projeto

```
inpasa-app/
├── index.html          ← Aplicação completa (HTML + JS + dados embutidos)
├── package.json        ← Dependências e scripts
├── vite.config.js      ← Config do build (opcional, para modo modular futuro)
├── vercel.json         ← Config de deploy no Vercel
├── .env.example        ← Modelo das variáveis de ambiente
├── .gitignore          ← Arquivos ignorados pelo Git
├── src/
│   ├── firebase.js     ← Configuração Firebase (modo modular/Vite)
│   ├── auth.js         ← Funções de autenticação
│   ├── database.js     ← Funções de banco de dados (Firestore)
│   └── data.js         ← Dados base embutidos (fallback offline)
└── README.md
```

---

## Passo a Passo: Deploy Completo

### 1. Criar projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"** → nomeie como `inpasa-estoque`
3. Desative Google Analytics (opcional) → **Criar projeto**

#### 1.1 Ativar Authentication

1. No menu lateral: **Authentication** → **Começar**
2. Aba **Sign-in method** → Ativar **Email/Senha** → Salvar

#### 1.2 Criar os usuários master

1. Em **Authentication** → **Users** → **Adicionar usuário**:
   - Email: `bruno.novaes@inpasa.com.br` | Senha: `Inpasa@123`
2. Repita para:
   - Email: `rafael.mulato@inpasa.com.br` | Senha: `Inpasa@123`

#### 1.3 Ativar Firestore

1. No menu lateral: **Firestore Database** → **Criar banco de dados**
2. Selecione **Modo de produção** → escolha região `southamerica-east1` (São Paulo) → **Ativar**

#### 1.4 Configurar regras do Firestore

Em **Firestore** → **Regras**, cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários autenticados podem ler e escrever dados operacionais
    match /entradas/{doc} {
      allow read, write: if request.auth != null;
    }
    match /saidas_diversos/{doc} {
      allow read, write: if request.auth != null;
    }
    match /saidas_rodo/{doc} {
      allow read, write: if request.auth != null;
    }
    // Perfis de usuário: leitura para todos autenticados, escrita apenas para masters
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'master');
    }
  }
}
```

#### 1.5 Criar perfis dos usuários master no Firestore

1. Em **Firestore** → **Dados** → **Iniciar coleção**: `users`
2. ID do documento: copie o UID do usuário em Authentication
3. Campos:
   ```
   uid:       <UID copiado>
   email:     bruno.novaes@inpasa.com.br
   name:      Bruno Novaes
   role:      master
   active:    true
   createdAt: <timestamp>
   ```
4. Repita para Rafael Mulato

#### 1.6 Obter as credenciais do Firebase

1. **Configurações do projeto** (ícone de engrenagem) → **Configurações gerais**
2. Role até **Seus apps** → clique em **</>** (Web) → nomeie `inpasa-web` → **Registrar app**
3. Copie o objeto `firebaseConfig` — você precisará dele no próximo passo

---

### 2. Configurar as variáveis de ambiente no index.html

Abra o `index.html` e localize o bloco `FIREBASE_CONFIG` (próximo à linha 400):

```javascript
const FIREBASE_CONFIG = {
  apiKey:            window.ENV_FIREBASE_API_KEY            || "",
  authDomain:        window.ENV_FIREBASE_AUTH_DOMAIN        || "",
  ...
```

**Opção A — Para deploy direto sem build tool (mais simples):**
Substitua os `""` pelas credenciais reais do Firebase:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "inpasa-estoque.firebaseapp.com",
  projectId:         "inpasa-estoque",
  storageBucket:     "inpasa-estoque.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

**Opção B — Via Vercel Environment Variables (recomendado para produção):**
Deixe o código como está e configure no Vercel (passo 4).

---

### 3. Criar repositório no GitHub

```bash
# Na pasta do projeto
cd inpasa-app

# Inicializar Git
git init
git add .
git commit -m "feat: sistema INPASA gestão de estoque v1.0"

# Criar repositório no GitHub (via GitHub CLI ou interface web)
# Interface web: github.com → New repository → nome: inpasa-gestao-estoque → Private → Create

# Conectar e enviar
git remote add origin https://github.com/SEU_USUARIO/inpasa-gestao-estoque.git
git branch -M main
git push -u origin main
```

> ⚠️ **Importante:** O repositório deve ser **Privado** (Private) pois contém dados da empresa.

---

### 4. Deploy no Vercel

#### 4.1 Conectar ao GitHub

1. Acesse [vercel.com](https://vercel.com) → Login com GitHub
2. **New Project** → selecione o repositório `inpasa-gestao-estoque`
3. Framework Preset: **Other**
4. Build Command: *(deixar vazio — o index.html é servido diretamente)*
5. Output Directory: `.` (ponto — raiz do projeto)

#### 4.2 Configurar variáveis de ambiente (se usar Opção B)

Em **Settings** → **Environment Variables**, adicione:

| Nome | Valor |
|------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `inpasa-estoque.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `inpasa-estoque` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `inpasa-estoque.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `VITE_FIREBASE_APP_ID` | `1:123...` |

#### 4.3 Deploy

Clique em **Deploy**. O Vercel gera uma URL como:
`https://inpasa-gestao-estoque.vercel.app`

#### 4.4 Domínio personalizado (opcional)

Em **Settings** → **Domains** → adicione `estoque.inpasa.com.br`

---

### 5. Autorizar domínio no Firebase

1. Firebase Console → **Authentication** → **Settings** → **Domínios autorizados**
2. Adicione: `inpasa-gestao-estoque.vercel.app`
3. Se usar domínio próprio: adicione também `estoque.inpasa.com.br`

---

### 6. Atualizações futuras

Sempre que precisar atualizar o sistema:

```bash
# Faça as alterações no index.html
git add .
git commit -m "fix: descrição da alteração"
git push origin main
# O Vercel faz o redeploy automaticamente em ~30 segundos
```

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Login** | Autenticação via Firebase Auth (email/senha) |
| **Dashboard** | KPIs, gráficos de barras, filtros por Terminal/GEF/Modal/Período |
| **Painel Rodoviário** | Kanban em tempo real: Programados / Em Carregamento / Carregados |
| **Registros** | Tabelas com filtros, paginação e edição inline |
| **Lançamentos** | Formulários para Entradas, Saídas Diversos e Saídas Rodo |
| **Exportar PDF** | Relatório gerencial 3 páginas com logo INPASA |
| **Exportar CSV** | Exportação dos dados filtrados |
| **Importar XLSX** | Upload da planilha base com detecção automática de abas |
| **Base de Dados** | Gerenciamento com exclusão confirmada |
| **Usuários** | Cadastro de novos usuários (apenas perfil Master) |
| **Offline** | Dados em cache local quando sem conexão |

## Perfis de Acesso

| Perfil | Permissões |
|---|---|
| **Master** | Acesso completo, gerenciar usuários, limpar base |
| **Usuário** | Visualizar, lançar e editar registros |

## Usuários Iniciais

| Nome | Email | Perfil |
|---|---|---|
| Bruno Novaes | bruno.novaes@inpasa.com.br | Master |
| Rafael Mulato | rafael.mulato@inpasa.com.br | Master |

---

## Suporte Técnico

Em caso de dúvidas sobre o sistema, contate o administrador responsável pelo projeto.
