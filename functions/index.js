const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();
const auth = getAuth();
const PRIMARY_ADMIN_EMAIL = "figueiredovmfp@gmail.com";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  let body = "";
  for (let i = 0; i < bytes.length; i += 1) {
    body += alphabet[bytes[i] % alphabet.length];
  }
  return `Ex!${body}9`;
}

function validateNewPassword(value) {
  const password = String(value || "");
  if (password.length < 8 || password.length > 72) {
    throw new HttpsError("invalid-argument", "A nova senha deve ter entre 8 e 72 caracteres.");
  }
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/[0-9]/.test(password)) {
    throw new HttpsError("invalid-argument", "A nova senha deve conter pelo menos uma letra e um número.");
  }
  return password;
}

async function profileForEmail(email) {
  const snap = await db.collection("usersByEmail").doc(email).get();
  return snap.exists ? { ref: snap.ref, data: snap.data() } : null;
}

async function requireAdmin(request) {
  if (!request.auth || !request.auth.token || !request.auth.token.email) {
    throw new HttpsError("unauthenticated", "Faça login para continuar.");
  }
  const email = normalizeEmail(request.auth.token.email);
  const profile = await profileForEmail(email);
  if (!profile || profile.data.role !== "admin" || profile.data.status === "disabled") {
    throw new HttpsError("permission-denied", "Apenas administradores podem executar esta operação.");
  }
  return { email, uid: request.auth.uid, profile: profile.data };
}

exports.createProfessorAccount = onCall(async (request) => {
  const admin = await requireAdmin(request);
  const data = request.data || {};
  const email = normalizeEmail(data.email);
  const name = cleanText(data.name);
  const graduation = cleanText(data.graduation);
  const unit = cleanText(data.unit) || "Extremo Norte";
  const role = data.role === "admin" ? "admin" : "professor";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Informe um e-mail válido.");
  }
  if (!name) throw new HttpsError("invalid-argument", "Informe o nome do professor.");
  if (!graduation) throw new HttpsError("invalid-argument", "Informe a graduação do professor.");
  if (role === "admin" && admin.email !== PRIMARY_ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Somente o administrador principal pode criar outro administrador.");
  }

  try {
    await auth.getUserByEmail(email);
    throw new HttpsError("already-exists", "Já existe uma conta de autenticação com este e-mail.");
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error.code !== "auth/user-not-found") throw error;
  }

  const temporaryPassword = generateTemporaryPassword();
  let createdUser = null;

  try {
    createdUser = await auth.createUser({
      email,
      password: temporaryPassword,
      displayName: name,
      disabled: false
    });

    await db.collection("usersByEmail").doc(email).set({
      email,
      uid: createdUser.uid,
      name,
      graduation,
      unit,
      role,
      status: "active",
      mustChangePassword: true,
      createdAt: FieldValue.serverTimestamp(),
      createdByEmail: admin.email,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      ok: true,
      email,
      temporaryPassword,
      mustChangePassword: true
    };
  } catch (error) {
    if (createdUser) {
      try { await auth.deleteUser(createdUser.uid); } catch (_) {}
    }
    console.error("createProfessorAccount", error);
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Já existe uma conta com este e-mail.");
    }
    throw new HttpsError("internal", "Não foi possível criar a conta.");
  }
});

exports.resetProfessorPassword = onCall(async (request) => {
  await requireAdmin(request);
  const email = normalizeEmail(request.data && request.data.email);
  if (!email) throw new HttpsError("invalid-argument", "Informe o e-mail.");

  const profile = await profileForEmail(email);
  if (!profile) throw new HttpsError("not-found", "Perfil não encontrado.");
  if (profile.data.role === "admin") {
    throw new HttpsError("failed-precondition", "O reset administrativo deste painel é destinado às contas de professor.");
  }

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "A conta não existe no Firebase Authentication.");
    }
    throw error;
  }

  const temporaryPassword = generateTemporaryPassword();
  await auth.updateUser(user.uid, { password: temporaryPassword, disabled: false });
  await auth.revokeRefreshTokens(user.uid);
  await profile.ref.set({
    uid: user.uid,
    status: "active",
    mustChangePassword: true,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { ok: true, email, temporaryPassword, mustChangePassword: true };
});

exports.setProfessorDisabled = onCall(async (request) => {
  await requireAdmin(request);
  const email = normalizeEmail(request.data && request.data.email);
  const disabled = Boolean(request.data && request.data.disabled);
  if (!email) throw new HttpsError("invalid-argument", "Informe o e-mail.");

  const profile = await profileForEmail(email);
  if (!profile) throw new HttpsError("not-found", "Perfil não encontrado.");
  if (profile.data.role === "admin") {
    throw new HttpsError("failed-precondition", "Contas administrativas não podem ser bloqueadas por este painel.");
  }

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "A conta não existe no Firebase Authentication.");
    }
    throw error;
  }

  await auth.updateUser(user.uid, { disabled });
  if (disabled) await auth.revokeRefreshTokens(user.uid);
  await profile.ref.set({
    uid: user.uid,
    status: disabled ? "disabled" : "active",
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { ok: true, email, disabled };
});

exports.completeFirstAccess = onCall(async (request) => {
  if (!request.auth || !request.auth.token || !request.auth.token.email) {
    throw new HttpsError("unauthenticated", "Faça login com a senha provisória.");
  }
  const email = normalizeEmail(request.auth.token.email);
  const profile = await profileForEmail(email);
  if (!profile) throw new HttpsError("permission-denied", "Perfil não autorizado.");
  if (profile.data.status === "disabled") throw new HttpsError("permission-denied", "Conta bloqueada pelo administrador.");
  if (profile.data.mustChangePassword !== true) {
    throw new HttpsError("failed-precondition", "Esta conta não possui troca de senha pendente.");
  }

  const password = validateNewPassword(request.data && request.data.newPassword);
  await auth.updateUser(request.auth.uid, { password });
  await profile.ref.set({
    uid: request.auth.uid,
    mustChangePassword: false,
    passwordChangedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { ok: true };
});
