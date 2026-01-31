const bcrypt = require('bcryptjs');
const github = require('../githubClient');

// Caminhos dos arquivos no repositório
const USERS_PATH = 'data/users.json';
const CLIENTS_PATH = 'data/clients.json';
const FILES_PATH = 'data/files.json';
const PROJECTS_PATH = 'data/projects.json';
const STORAGE_ROOT = 'data/storage';

const STORAGE_MAP = {
  'devlizard:ceo:decisions': 'data/ceo/decisions.json',
  'devlizard:ceo:notes': 'data/ceo/notes.json',
  'devlizard:ceo:risks': 'data/ceo/risks.json',
  'devlizard:ceo:roadmap': 'data/ceo/roadmap.json',
  'ceo_roadmaps': 'data/ceo/roadmap.json',
  'ceo_reports_data': 'data/ceo/reports.json',
  'coo_reports_data': 'data/coo/reports.json',
  'shared_reports_data': 'data/shared/reports.json',
  'coo_kanban_tasks': 'data/coo/kanban_tasks.json',
  'coo_kanban_settings': 'data/coo/kanban_settings.json',
  'cto_kanban_tasks': 'data/cto/kanban_tasks.json',
  'cto_kanban_settings': 'data/cto/kanban_settings.json',
  'cmo_promises': 'data/cmo/promises.json',
  'global_decisions': 'data/shared/global_decisions.json',
  'dl_projects_v1': 'data/shared/projects.json',
  'dl_proposals_v1': 'data/shared/proposals.json',
  'dl_clients_v1': CLIENTS_PATH,
  'cfo_clients': 'data/cfo/clients.json',
  'cfo_projects': 'data/cfo/projects.json',
  'cfo_invested_yield': 'data/cfo/yield.json',
  'cfo_pricing_state': 'data/cfo/pricing_state.json',
  'cfo_pricing_history': 'data/cfo/pricing_history.json',
  'cfm_project_costs_v2': 'data/cfo/project_costs.json',
  'cto_intake_items': 'data/cto/intake.json',
  'cto_debt_items': 'data/cto/debt.json',
  'devlizard:cto:notes': 'data/cto/notes.json'
};

function resolveStoragePath(key) {
  if (STORAGE_MAP[key]) return STORAGE_MAP[key];
  const safeKey = encodeURIComponent(String(key || ''));
  return `${STORAGE_ROOT}/${safeKey}.json`;
}

async function getStorage(key, fallback = null) {
  const path = resolveStoragePath(key);
  const res = await github.getJson(path);
  if (!res || res.json === undefined) return fallback;
  return res.json;
}

async function setStorage(key, value, message) {
  const path = resolveStoragePath(key);
  return github.createOrUpdateJson(path, value, message || `Update ${key}`);
}
// Projetos
async function _readProjects() {
  const res = await github.getJson(PROJECTS_PATH);
  return (res && res.json) ? res.json : [];
}
async function _writeProjects(projects, message) {
  return github.createOrUpdateJson(PROJECTS_PATH, projects, message || 'Update projects');
}
async function addProject(project) {
  const projects = await _readProjects();
  const newProject = Object.assign({ id: Date.now(), createdAt: new Date().toISOString() }, project);
  projects.push(newProject);
  await _writeProjects(projects, `Add project ${newProject.id}`);
  return newProject;
}
async function getProjects() {
  return await _readProjects();
}

// Usuários
async function _readUsers() {
  const res = await github.getJson(USERS_PATH);
  return (res && res.json) ? res.json : [];
}
async function _writeUsers(users, message) {
  return github.createOrUpdateJson(USERS_PATH, users, message || 'Update users');
}
async function getUserByEmailAndRole(email, role) {
  const users = await _readUsers();
  return users.find(u => u.email === email && u.role === role) || null;
}
async function createUser({ email, password, role, name = null, avatar = null }) {
  const users = await _readUsers();
  const exists = users.find(u => u.email === email && u.role === role);
  if (exists) throw new Error('User already exists');
  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now(), email, password: hashed, role, name, avatar, createdAt: new Date().toISOString() };
  users.push(newUser);
  await _writeUsers(users, `Create user ${email}`);
  return newUser;
}

// Clientes
async function _readClients() {
  const res = await github.getJson(CLIENTS_PATH);
  return (res && res.json) ? res.json : [];
}
async function _writeClients(clients, message) {
  return github.createOrUpdateJson(CLIENTS_PATH, clients, message || 'Update clients');
}
async function addClient(client) {
  const clients = await _readClients();
  const newClient = Object.assign({ id: Date.now(), createdAt: new Date().toISOString() }, client);
  clients.push(newClient);
  await _writeClients(clients, `Add client ${newClient.id}`);
  return newClient;
}
async function getClients() {
  return await _readClients();
}

// Arquivos (metadados)
async function _readFiles() {
  const res = await github.getJson(FILES_PATH);
  return (res && res.json) ? res.json : [];
}
async function _writeFiles(files, message) {
  return github.createOrUpdateJson(FILES_PATH, files, message || 'Update files');
}
async function addFile(meta) {
  const files = await _readFiles();
  const newFile = Object.assign({ id: Date.now(), createdAt: new Date().toISOString() }, meta);
  files.push(newFile);
  await _writeFiles(files, `Add file ${newFile.id}`);
  return newFile;
}
async function getFiles() {
  return await _readFiles();
}

module.exports = {
  getUserByEmailAndRole,
  createUser,
  addClient,
  getClients,
  addFile,
  getFiles,
  addProject,
  getProjects,
  getStorage,
  setStorage,
};
